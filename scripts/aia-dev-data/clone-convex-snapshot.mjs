import { spawnSync } from "node:child_process"
import {
  readFileSync,
  writeFileSync,
} from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
  parseDotEnv,
  validateTargetConfig,
} from "./lib/target-gate.mjs"
import {
  acquireTargetImport,
  ensureEmptyPrivateBackupDirectory,
  recheckImportSnapshot,
  securePrivateRegularFile,
} from "./lib/import-safety.mjs"
import {
  AIA_SOURCE_DEPLOYMENT,
  AIA_TARGET_DEPLOYMENT,
  assertSnapshotManifest,
  buildConvexExport,
  buildConvexImport,
  compareSnapshotManifests,
  makeSnapshotManifest,
  summarizeSnapshotManifest,
} from "./lib/snapshot-manifest.mjs"

export { buildConvexExport, buildConvexImport } from "./lib/snapshot-manifest.mjs"

function fail(code) {
  throw new Error(code)
}

function hasValue(value) {
  return typeof value === "string" && value.trim() !== ""
}

function parseCloneArgs(argv) {
  const names = {
    "--env-file": "envFile",
    "--source": "source",
    "--target": "target",
    "--confirm-target": "confirmTarget",
    "--backup-dir": "backupDir",
  }
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const key = names[flag]
    const value = argv[index + 1]

    if (!key || Object.hasOwn(args, key)) {
      fail("AIA_TARGET_GATE_ARGUMENT_INVALID")
    }
    if (!hasValue(value) || value.startsWith("-")) {
      fail("AIA_TARGET_GATE_MISSING_VALUE")
    }

    args[key] = value
    index += 1
  }

  for (const key of Object.values(names)) {
    if (!hasValue(args[key])) {
      fail("AIA_TARGET_GATE_MISSING_VALUE")
    }
  }

  return args
}

function loadAndValidate(args) {
  let envText
  try {
    envText = readFileSync(args.envFile, "utf8")
  } catch {
    fail("AIA_TARGET_GATE_ENV_FILE_READ_ERROR")
  }

  const env = parseDotEnv(envText)
  return validateTargetConfig(env, {
    source: args.source,
    target: args.target,
    confirmTarget: args.confirmTarget,
    mode: "write",
  })
}

function assertConvexCommand(command) {
  const isExport = (
    command.length === 7
    && command[0] === "convex"
    && command[1] === "export"
    && command[2] === "--deployment"
    && (command[3] === AIA_SOURCE_DEPLOYMENT || command[3] === AIA_TARGET_DEPLOYMENT)
    && command[4] === "--include-file-storage"
    && command[5] === "--path"
    && hasValue(command[6])
    && !command[6].startsWith("-")
  )
  const isImport = (
    command.length === 7
    && command[0] === "convex"
    && command[1] === "import"
    && command[2] === "--deployment"
    && command[3] === AIA_TARGET_DEPLOYMENT
    && hasValue(command[4])
    && !command[4].startsWith("-")
    && command[5] === "--replace-all"
    && command[6] === "--yes"
  )

  if (command.includes("--prod") || (!isExport && !isImport)) {
    fail("AIA_TARGET_GATE_DEPLOYMENT_MISMATCH")
  }
}

export function runConvexCommand(command, spawnCommand = spawnSync) {
  assertConvexCommand(command)
  const result = spawnCommand("npx", command, {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  })

  if (!result || result.error || result.status !== 0) {
    fail("AIA_SNAPSHOT_CONVEX_COMMAND_FAILED")
  }
}

function writeManifest(path, manifest) {
  const safeManifest = assertSnapshotManifest(manifest)
  try {
    writeFileSync(path, `${JSON.stringify(safeManifest, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    })
  } catch {
    fail("AIA_SNAPSHOT_MANIFEST_WRITE_FAILED")
  }
}

function logManifest(label, manifest) {
  process.stdout.write(`${label} ${summarizeSnapshotManifest(manifest)}\n`)
}

async function exportAndManifest(label, deployment, archivePath, manifestPath, spawnCommand) {
  runConvexCommand(buildConvexExport(deployment, archivePath), spawnCommand)
  securePrivateRegularFile(archivePath)
  const manifest = await makeSnapshotManifest(archivePath)
  writeManifest(manifestPath, manifest)
  logManifest(label, manifest)
  return manifest
}

export async function runClone(argv = process.argv.slice(2), options = {}) {
  const args = parseCloneArgs(argv)
  loadAndValidate(args)

  const spawnCommand = options.spawnCommand ?? spawnSync
  ensureEmptyPrivateBackupDirectory(args.backupDir)

  const targetBeforeArchive = join(args.backupDir, "target-before.zip")
  const targetBeforeManifest = join(args.backupDir, "target-before.manifest.json")
  const sourceArchive = join(args.backupDir, "source.zip")
  const sourceManifest = join(args.backupDir, "source.manifest.json")
  const targetAfterArchive = join(args.backupDir, "target-after.zip")
  const targetAfterManifest = join(args.backupDir, "target-after.manifest.json")

  await exportAndManifest(
    "clone target-before",
    AIA_TARGET_DEPLOYMENT,
    targetBeforeArchive,
    targetBeforeManifest,
    spawnCommand,
  )
  const sourceManifestData = await exportAndManifest(
    "clone source",
    AIA_SOURCE_DEPLOYMENT,
    sourceArchive,
    sourceManifest,
    spawnCommand,
  )

  let operation
  let importAttempted = false
  let journalFinalized = false
  try {
    operation = acquireTargetImport(options)
    if (typeof options.beforeImportRecheck === "function") {
      options.beforeImportRecheck({ snapshotPath: sourceArchive })
    }
    await recheckImportSnapshot(sourceArchive, sourceManifestData)
    importAttempted = true
    try {
      runConvexCommand(buildConvexImport(AIA_TARGET_DEPLOYMENT, sourceArchive), spawnCommand)
    } catch {
      operation.markUnknown()
      journalFinalized = true
      fail("AIA_SNAPSHOT_IMPORT_UNKNOWN")
    }

    const targetAfterManifestData = await exportAndManifest(
      "clone target-after",
      AIA_TARGET_DEPLOYMENT,
      targetAfterArchive,
      targetAfterManifest,
      spawnCommand,
    )
    if (!compareSnapshotManifests(sourceManifestData, targetAfterManifestData).equal) {
      fail("AIA_SNAPSHOT_VERIFY_MISMATCH")
    }
    operation.markVerified()
    journalFinalized = true
  } catch (error) {
    if (operation && !journalFinalized) {
      if (importAttempted) {
        operation.markUnknown()
      } else {
        operation.cancelBeforeImport()
      }
      journalFinalized = true
    }
    throw error
  } finally {
    if (operation) {
      operation.release()
    }
  }
}

function cliErrorCode(error) {
  if (
    error instanceof Error
    && (error.message.startsWith("AIA_TARGET_GATE_") || error.message.startsWith("AIA_SNAPSHOT_"))
  ) {
    return error.message
  }
  return "AIA_SNAPSHOT_OPERATION_FAILED"
}

const invokedModuleUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : ""

if (import.meta.url === invokedModuleUrl) {
  runClone().catch((error) => {
    process.stderr.write(`${cliErrorCode(error)}\n`)
    process.exitCode = 1
  })
}
