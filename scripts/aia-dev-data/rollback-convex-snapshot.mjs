import { spawnSync } from "node:child_process"
import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
  parseDotEnv,
  validateTargetConfig,
} from "./lib/target-gate.mjs"
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

function assertRegularFile(path, code) {
  try {
    const details = lstatSync(path)
    if (!details.isFile() || details.isSymbolicLink()) {
      fail(code)
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AIA_")) {
      throw error
    }
    fail(code)
  }
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

function secureFile(path) {
  try {
    chmodSync(path, 0o600)
  } catch {
    fail("AIA_SNAPSHOT_ARCHIVE_WRITE_FAILED")
  }
}

function logManifest(label, manifest) {
  process.stdout.write(`${label} ${summarizeSnapshotManifest(manifest)}\n`)
}

function createVerificationDirectory() {
  try {
    return mkdtempSync(join(tmpdir(), "aia-rollback-"), { encoding: "utf8" })
  } catch {
    fail("AIA_SNAPSHOT_VERIFICATION_DIRECTORY_INVALID")
  }
}

export async function runRollback(argv = process.argv.slice(2), options = {}) {
  const args = parseRollbackArgs(argv)
  loadAndValidate(args)

  assertRegularFile(args.snapshot, "AIA_SNAPSHOT_BACKUP_SNAPSHOT_INVALID")
  assertRegularFile(args.manifest, "AIA_SNAPSHOT_MANIFEST_INVALID")
  const expectedManifest = readBackupManifest(args.manifest)
  const backupManifest = await makeSnapshotManifest(args.snapshot)
  logManifest("rollback target-backup", backupManifest)

  if (!compareSnapshotManifests(expectedManifest, backupManifest).equal) {
    fail("AIA_SNAPSHOT_VERIFY_MISMATCH")
  }

  const spawnCommand = options.spawnCommand ?? spawnSync
  const verificationDirectory = createVerificationDirectory()
  const verificationArchive = join(verificationDirectory, "target-after-rollback.zip")

  try {
    runConvexCommand(buildConvexImport(AIA_TARGET_DEPLOYMENT, args.snapshot), spawnCommand)
    runConvexCommand(buildConvexExport(AIA_TARGET_DEPLOYMENT, verificationArchive), spawnCommand)
    secureFile(verificationArchive)
    const actualManifest = await makeSnapshotManifest(verificationArchive)
    logManifest("rollback target-after", actualManifest)

    if (!compareSnapshotManifests(expectedManifest, actualManifest).equal) {
      fail("AIA_SNAPSHOT_VERIFY_MISMATCH")
    }
  } finally {
    rmSync(verificationDirectory, { recursive: true, force: true })
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
