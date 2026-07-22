import { spawnSync } from "node:child_process"
import { readFileSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
  parseDotEnv,
  validateTargetConfig,
} from "./lib/target-gate.mjs"
import {
  acquireTargetImport,
  assertRegularNonSymlinkFile,
  createPrivateStagingDirectory,
  recheckImportSnapshot,
  securePrivateRegularFile,
  stageExternalSnapshot,
} from "./lib/import-safety.mjs"
import {
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

function parseRollbackArgs(argv) {
  const names = {
    "--env-file": "envFile",
    "--source": "source",
    "--target": "target",
    "--confirm-target": "confirmTarget",
    "--snapshot": "snapshot",
    "--manifest": "manifest",
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

function readBackupManifest(path) {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"))
  } catch {
    fail("AIA_SNAPSHOT_MANIFEST_INVALID")
  }
  return assertSnapshotManifest(parsed)
}

function assertConvexCommand(command) {
  const isExport = (
    command.length === 7
    && command[0] === "convex"
    && command[1] === "export"
    && command[2] === "--deployment"
    && command[3] === AIA_TARGET_DEPLOYMENT
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
    fail("AIA_TARGET_GATE_TARGET_MISMATCH")
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

function logManifest(label, manifest) {
  process.stdout.write(`${label} ${summarizeSnapshotManifest(manifest)}\n`)
}

export async function runRollback(argv = process.argv.slice(2), options = {}) {
  const args = parseRollbackArgs(argv)
  loadAndValidate(args)

  assertRegularNonSymlinkFile(args.manifest, "AIA_SNAPSHOT_MANIFEST_INVALID")
  const expectedManifest = readBackupManifest(args.manifest)
  const spawnCommand = options.spawnCommand ?? spawnSync
  let operation
  let stagingDirectory
  let importAttempted = false
  let journalFinalized = false

  try {
    operation = acquireTargetImport(options)
    stagingDirectory = createPrivateStagingDirectory("aia-rollback-")
    const stagedSnapshot = stageExternalSnapshot(args.snapshot, stagingDirectory)
    const backupManifest = await makeSnapshotManifest(stagedSnapshot)
    logManifest("rollback target-backup", backupManifest)
    if (
      backupManifest.sha256 !== expectedManifest.sha256
      || backupManifest.archiveBytes !== expectedManifest.archiveBytes
    ) {
      fail("AIA_SNAPSHOT_IMPORT_SNAPSHOT_CHANGED")
    }
    if (!compareSnapshotManifests(expectedManifest, backupManifest).equal) {
      fail("AIA_SNAPSHOT_VERIFY_MISMATCH")
    }

    if (typeof options.beforeImportRecheck === "function") {
      options.beforeImportRecheck({ snapshotPath: stagedSnapshot })
    }
    await recheckImportSnapshot(stagedSnapshot, backupManifest)
    importAttempted = true
    try {
      runConvexCommand(buildConvexImport(AIA_TARGET_DEPLOYMENT, stagedSnapshot), spawnCommand)
    } catch {
      operation.markUnknown()
      journalFinalized = true
      fail("AIA_SNAPSHOT_IMPORT_UNKNOWN")
    }

    const verificationArchive = join(stagingDirectory, "target-after-rollback.zip")
    runConvexCommand(buildConvexExport(AIA_TARGET_DEPLOYMENT, verificationArchive), spawnCommand)
    securePrivateRegularFile(verificationArchive)
    const actualManifest = await makeSnapshotManifest(verificationArchive)
    logManifest("rollback target-after", actualManifest)

    if (!compareSnapshotManifests(expectedManifest, actualManifest).equal) {
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
    try {
      if (operation) {
        operation.release()
      }
    } finally {
      if (stagingDirectory) {
        try {
          rmSync(stagingDirectory, { recursive: true, force: true })
        } catch {
          fail("AIA_SNAPSHOT_STAGING_DIRECTORY_INVALID")
        }
      }
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
  runRollback().catch((error) => {
    process.stderr.write(`${cliErrorCode(error)}\n`)
    process.exitCode = 1
  })
}
