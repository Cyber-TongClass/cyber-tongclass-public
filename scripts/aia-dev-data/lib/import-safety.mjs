import { randomUUID } from "node:crypto"
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join, parse } from "node:path"
import {
  AIA_TARGET_DEPLOYMENT,
  makeSnapshotManifest,
} from "./snapshot-manifest.mjs"

const JOURNAL_FILE = "journal.json"
const LOCK_DIRECTORY = "import.lock"
const JOURNAL_STATES = new Set(["verified", "importing", "unknown"])

function fail(code) {
  throw new Error(code)
}

function currentUid() {
  return typeof process.getuid === "function" ? process.getuid() : undefined
}

function isOwnerPrivate(details) {
  const uid = currentUid()
  return (
    (uid === undefined || details.uid === uid)
    && (details.mode & 0o077) === 0
  )
}

function lstatOrNull(path) {
  try {
    return lstatSync(path)
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null
    }
    throw error
  }
}

function hasTerminalPathSeparator(path) {
  return path !== parse(path).root && /[\\/]$/.test(path)
}

function assertPrivateDirectory(path, code) {
  let details
  try {
    details = lstatSync(path)
  } catch {
    fail(code)
  }
  if (!details.isDirectory() || details.isSymbolicLink() || !isOwnerPrivate(details)) {
    fail(code)
  }
}

function ensurePrivateDirectory(path, code) {
  try {
    const existing = lstatOrNull(path)
    if (existing === null) {
      mkdirSync(path, { recursive: true, mode: 0o700 })
      chmodSync(path, 0o700)
    }
  } catch {
    fail(code)
  }
  assertPrivateDirectory(path, code)
}

export function ensureEmptyPrivateBackupDirectory(path) {
  if (hasTerminalPathSeparator(path)) {
    fail("AIA_SNAPSHOT_BACKUP_DIRECTORY_INVALID")
  }

  const existing = (() => {
    try {
      return lstatOrNull(path)
    } catch {
      fail("AIA_SNAPSHOT_BACKUP_DIRECTORY_INVALID")
    }
  })()

  if (existing === null) {
    try {
      mkdirSync(path, { recursive: true, mode: 0o700 })
      chmodSync(path, 0o700)
    } catch {
      fail("AIA_SNAPSHOT_BACKUP_DIRECTORY_INVALID")
    }
  }

  assertPrivateDirectory(path, "AIA_SNAPSHOT_BACKUP_DIRECTORY_INSECURE")
  try {
    if (readdirSync(path).length > 0) {
      fail("AIA_SNAPSHOT_BACKUP_DIRECTORY_NOT_EMPTY")
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AIA_")) {
      throw error
    }
    fail("AIA_SNAPSHOT_BACKUP_DIRECTORY_INVALID")
  }
}

export function assertRegularNonSymlinkFile(path, code) {
  let details
  try {
    details = lstatSync(path)
  } catch {
    fail(code)
  }
  if (!details.isFile() || details.isSymbolicLink()) {
    fail(code)
  }
  return details
}

export function assertPrivateRegularFile(path, code = "AIA_SNAPSHOT_IMPORT_SNAPSHOT_INSECURE") {
  const details = assertRegularNonSymlinkFile(path, code)
  if (!isOwnerPrivate(details)) {
    fail(code)
  }
  return details
}

export function securePrivateRegularFile(path, code = "AIA_SNAPSHOT_ARCHIVE_WRITE_FAILED") {
  assertRegularNonSymlinkFile(path, code)
  try {
    chmodSync(path, 0o600)
  } catch {
    fail(code)
  }
  return assertPrivateRegularFile(path, code)
}

export function createPrivateStagingDirectory(prefix) {
  let directory
  try {
    directory = mkdtempSync(join(tmpdir(), prefix), { encoding: "utf8" })
    chmodSync(directory, 0o700)
  } catch {
    fail("AIA_SNAPSHOT_STAGING_DIRECTORY_INVALID")
  }
  assertPrivateDirectory(directory, "AIA_SNAPSHOT_STAGING_DIRECTORY_INVALID")
  return directory
}

export function stageExternalSnapshot(sourcePath, stagingDirectory) {
  assertRegularNonSymlinkFile(sourcePath, "AIA_SNAPSHOT_BACKUP_SNAPSHOT_INVALID")
  const stagedPath = join(stagingDirectory, "rollback-snapshot.zip")
  try {
    copyFileSync(sourcePath, stagedPath)
  } catch {
    fail("AIA_SNAPSHOT_BACKUP_SNAPSHOT_INVALID")
  }
  securePrivateRegularFile(stagedPath, "AIA_SNAPSHOT_BACKUP_SNAPSHOT_INVALID")
  return stagedPath
}

export async function recheckImportSnapshot(snapshotPath, expectedManifest) {
  assertPrivateRegularFile(snapshotPath)
  const actualManifest = await makeSnapshotManifest(snapshotPath)
  if (
    actualManifest.sha256 !== expectedManifest.sha256
    || actualManifest.archiveBytes !== expectedManifest.archiveBytes
    || actualManifest.logicalDigest !== expectedManifest.logicalDigest
  ) {
    fail("AIA_SNAPSHOT_IMPORT_SNAPSHOT_CHANGED")
  }
  return actualManifest
}

function stateRoot(options) {
  return options.stateDirectory
    ?? process.env.AIA_DEV_DATA_STATE_DIR
    ?? join(homedir(), ".local", "state", "aia-dev-data")
}

function targetStateDirectory(options) {
  const root = stateRoot(options)
  ensurePrivateDirectory(root, "AIA_SNAPSHOT_STATE_DIRECTORY_INSECURE")
  const targetDirectory = join(root, AIA_TARGET_DEPLOYMENT)
  ensurePrivateDirectory(targetDirectory, "AIA_SNAPSHOT_STATE_DIRECTORY_INSECURE")
  return targetDirectory
}

function journalPath(targetDirectory) {
  return join(targetDirectory, JOURNAL_FILE)
}

function readJournal(targetDirectory) {
  const path = journalPath(targetDirectory)
  if (!existsSync(path)) {
    return null
  }
  assertPrivateRegularFile(path, "AIA_SNAPSHOT_TARGET_STATE_BLOCKED")

  let journal
  try {
    journal = JSON.parse(readFileSync(path, "utf8"))
  } catch {
    fail("AIA_SNAPSHOT_TARGET_STATE_BLOCKED")
  }
  if (
    journal === null
    || typeof journal !== "object"
    || Array.isArray(journal)
    || !JOURNAL_STATES.has(journal.state)
  ) {
    fail("AIA_SNAPSHOT_TARGET_STATE_BLOCKED")
  }
  return journal.state
}

function writeJournal(targetDirectory, state) {
  if (!JOURNAL_STATES.has(state)) {
    fail("AIA_SNAPSHOT_STATE_JOURNAL_WRITE_FAILED")
  }

  const path = journalPath(targetDirectory)
  const temporaryPath = join(targetDirectory, `.journal-${randomUUID()}.tmp`)
  try {
    writeFileSync(temporaryPath, `${JSON.stringify({ state })}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    })
    securePrivateRegularFile(temporaryPath, "AIA_SNAPSHOT_STATE_JOURNAL_WRITE_FAILED")
    renameSync(temporaryPath, path)
    securePrivateRegularFile(path, "AIA_SNAPSHOT_STATE_JOURNAL_WRITE_FAILED")
  } catch {
    try {
      if (existsSync(temporaryPath)) {
        unlinkSync(temporaryPath)
      }
    } catch {
      // The private target state directory remains fail-closed if cleanup fails.
    }
    fail("AIA_SNAPSHOT_STATE_JOURNAL_WRITE_FAILED")
  }
}

function removeJournal(targetDirectory) {
  const path = journalPath(targetDirectory)
  try {
    if (existsSync(path)) {
      assertPrivateRegularFile(path, "AIA_SNAPSHOT_STATE_JOURNAL_WRITE_FAILED")
      unlinkSync(path)
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AIA_")) {
      throw error
    }
    fail("AIA_SNAPSHOT_STATE_JOURNAL_WRITE_FAILED")
  }
}

function acquireLock(targetDirectory) {
  const lockPath = join(targetDirectory, LOCK_DIRECTORY)
  try {
    mkdirSync(lockPath, { mode: 0o700 })
    chmodSync(lockPath, 0o700)
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EEXIST") {
      fail("AIA_SNAPSHOT_TARGET_LOCKED")
    }
    fail("AIA_SNAPSHOT_TARGET_LOCKED")
  }
  assertPrivateDirectory(lockPath, "AIA_SNAPSHOT_TARGET_LOCKED")
  return lockPath
}

function releaseLock(lockPath) {
  try {
    rmdirSync(lockPath)
  } catch {
    fail("AIA_SNAPSHOT_TARGET_LOCK_RELEASE_FAILED")
  }
}

export function acquireTargetImport(options = {}) {
  const targetDirectory = targetStateDirectory(options)
  const priorState = readJournal(targetDirectory)
  if (priorState === "importing" || priorState === "unknown") {
    fail("AIA_SNAPSHOT_TARGET_STATE_BLOCKED")
  }

  const lockPath = acquireLock(targetDirectory)
  try {
    writeJournal(targetDirectory, "importing")
  } catch (error) {
    try {
      releaseLock(lockPath)
    } catch {
      // Preserve the lock when journal initialization cannot be made durable.
    }
    throw error
  }

  let retainLock = false
  const transition = (state) => {
    try {
      writeJournal(targetDirectory, state)
    } catch (error) {
      retainLock = true
      throw error
    }
  }

  return {
    markVerified() {
      transition("verified")
    },
    markUnknown() {
      transition("unknown")
    },
    cancelBeforeImport() {
      try {
        if (priorState === "verified") {
          writeJournal(targetDirectory, "verified")
        } else {
          removeJournal(targetDirectory)
        }
      } catch (error) {
        retainLock = true
        throw error
      }
    },
    release() {
      if (!retainLock) {
        releaseLock(lockPath)
      }
    },
  }
}
