import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  appendFileSync,
  mkdtempSync,
  mkdirSync,
  chmodSync,
  copyFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  buildConvexExport,
  buildConvexImport,
  runClone,
  runConvexCommand,
} from "./aia-dev-data/clone-convex-snapshot.mjs"
import { runRollback } from "./aia-dev-data/rollback-convex-snapshot.mjs"
import {
  compareSnapshotManifests,
  makeSnapshotManifest,
} from "./aia-dev-data/lib/snapshot-manifest.mjs"

const SOURCE = "clean-swordfish-983"
const TARGET = "bold-sandpiper-236"

const validEnv = [
  `CONVEX_DEPLOYMENT=dev:${TARGET}`,
  `NEXT_PUBLIC_CONVEX_URL=https://${TARGET}.convex.cloud`,
  `NEXT_PUBLIC_CONVEX_SITE_URL=https://${TARGET}.convex.site`,
  `AIA_DEV_DATA_TARGET=${TARGET}`,
  "",
].join("\n")

function assertGateError(run) {
  assert.throws(run, (error) => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /^AIA_TARGET_GATE_/)
    return true
  })
}

function assertSnapshotError(error, code) {
  assert.ok(error instanceof Error)
  assert.equal(error.message, code)
  return true
}

function cloneArgs(envFile, backupDir) {
  return [
    "--env-file",
    envFile,
    "--source",
    SOURCE,
    "--target",
    TARGET,
    "--confirm-target",
    TARGET,
    "--backup-dir",
    backupDir,
  ]
}

function rollbackArgs(envFile, snapshot, manifest) {
  return [
    "--env-file",
    envFile,
    "--source",
    SOURCE,
    "--target",
    TARGET,
    "--confirm-target",
    TARGET,
    "--snapshot",
    snapshot,
    "--manifest",
    manifest,
  ]
}

function makeFixtureZip(directory, options = {}) {
  const archiveName = options.archiveName ?? "fixture.zip"
  const input = join(directory, `input-${archiveName.replace(/[^A-Za-z0-9]/g, "-")}`)
  const archive = join(directory, archiveName)
  const secretEmail = "fixture.person@example.test"
  const secretUrl = "https://fixture.example.test/private-token"
  const secretToken = "fixture-token-value"
  const studentDocuments = options.studentDocuments ?? [
    { email: secretEmail, token: secretToken },
    { url: secretUrl },
  ]
  const announcementDocuments = options.announcementDocuments ?? [
    { body: "fixture-only body" },
  ]
  const storageA = options.storageA ?? "abc"
  const storageB = options.storageB ?? "defgh"

  mkdirSync(join(input, "students"), { recursive: true })
  mkdirSync(join(input, "announcements"), { recursive: true })
  mkdirSync(join(input, "_storage"), { recursive: true })
  writeFileSync(
    join(input, "students", "documents.jsonl"),
    `${studentDocuments.map((document) => JSON.stringify(document)).join("\n")}\n`,
  )
  writeFileSync(
    join(input, "announcements", "documents.jsonl"),
    `${announcementDocuments.map((document) => JSON.stringify(document)).join("\n")}\n`,
  )
  writeFileSync(join(input, "_storage", "fixture-a"), storageA)
  writeFileSync(join(input, "_storage", "fixture-b"), storageB)

  const result = spawnSync("zip", ["-q", "-r", archive, "students", "announcements", "_storage"], {
    cwd: input,
    encoding: "utf8",
    shell: false,
  })
  assert.equal(result.status, 0, result.stderr)

  return { archive, secretEmail, secretUrl, secretToken }
}

test("builds export commands only for the approved source or development target", () => {
  assert.deepEqual(
    buildConvexExport(SOURCE, "source.zip"),
    ["convex", "export", "--deployment", SOURCE, "--include-file-storage", "--path", "source.zip"],
  )
  assert.deepEqual(
    buildConvexExport(TARGET, "target.zip"),
    ["convex", "export", "--deployment", TARGET, "--include-file-storage", "--path", "target.zip"],
  )
  assertGateError(() => buildConvexExport("another-deployment", "out.zip"))
})

test("builds import commands only for the approved development target", () => {
  assert.deepEqual(
    buildConvexImport(TARGET, "source.zip"),
    ["convex", "import", "--deployment", TARGET, "source.zip", "--replace-all", "--yes"],
  )
  assertGateError(() => buildConvexImport(SOURCE, "source.zip"))
  assertGateError(() => buildConvexImport("another-deployment", "source.zip"))
})

test("never generates a production deployment flag", () => {
  const commands = [
    buildConvexExport(SOURCE, "source.zip"),
    buildConvexExport(TARGET, "target.zip"),
    buildConvexImport(TARGET, "source.zip"),
  ]

  for (const command of commands) {
    assert.ok(!command.includes("--prod"))
    assert.ok(command.includes("--deployment"))
  }

  assertGateError(() => buildConvexExport(SOURCE, "--prod"))
  assertGateError(() => buildConvexImport(TARGET, "--prod"))
  assertGateError(() => buildConvexExport(SOURCE, "-unsafe-option"))
  assertGateError(() => buildConvexImport(TARGET, "-unsafe-option"))
})

test("the clone command runner refuses an import to the source before spawning", () => {
  let spawnCalls = 0

  assertGateError(() => runConvexCommand(
    ["convex", "import", "--deployment", SOURCE, "source.zip", "--replace-all", "--yes"],
    () => {
      spawnCalls += 1
      return { status: 0 }
    },
  ))
  assert.equal(spawnCalls, 0)
})

test("snapshot manifests count documents and storage without exposing fixture values", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-snapshot-manifest-"))

  try {
    const { archive, secretEmail, secretUrl, secretToken } = makeFixtureZip(directory)
    const manifest = await makeSnapshotManifest(archive)
    const serialized = JSON.stringify(manifest)

    assert.deepEqual(manifest.tableDocumentLineCounts, {
      announcements: 1,
      students: 2,
    })
    assert.deepEqual(manifest.nativeStorage, {
      fileCount: 2,
      totalBytes: 8,
    })
    assert.match(manifest.sha256, /^[a-f0-9]{64}$/)
    assert.match(manifest.logicalDigest, /^[a-f0-9]{64}$/)
    assert.ok(manifest.archiveBytes > 0)
    for (const value of [secretEmail, secretUrl, secretToken, "fixture-only body"]) {
      assert.ok(!serialized.includes(value))
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("logical snapshot digest detects changed JSON with matching document and storage totals", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-logical-digest-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const verifier = fileURLToPath(
    new URL("./aia-dev-data/verify-convex-clone.mjs", import.meta.url),
  )

  try {
    writeFileSync(envFile, validEnv)
    const expectedArchive = makeFixtureZip(directory, {
      archiveName: "expected.zip",
      studentDocuments: [{ status: "AAAA" }, { status: "BBBB" }],
      announcementDocuments: [{ body: "CCCC" }],
    }).archive
    const actualArchive = makeFixtureZip(directory, {
      archiveName: "actual.zip",
      studentDocuments: [{ status: "ZZZZ" }, { status: "BBBB" }],
      announcementDocuments: [{ body: "CCCC" }],
    }).archive
    const expected = await makeSnapshotManifest(expectedArchive)
    const actual = await makeSnapshotManifest(actualArchive)

    assert.deepEqual(expected.tableDocumentLineCounts, actual.tableDocumentLineCounts)
    assert.deepEqual(expected.nativeStorage, actual.nativeStorage)
    assert.notEqual(expected.logicalDigest, actual.logicalDigest)
    assert.deepEqual(compareSnapshotManifests(expected, actual), {
      equal: false,
      differences: ["logicalDigest"],
    })

    const result = spawnSync(
      process.execPath,
      [
        verifier,
        "--env-file",
        envFile,
        "--source",
        SOURCE,
        "--target",
        TARGET,
        "--expected",
        expectedArchive,
        "--actual",
        actualArchive,
      ],
      { encoding: "utf8", shell: false },
    )

    assert.equal(result.status, 1)
    assert.equal(result.stderr, "AIA_SNAPSHOT_VERIFY_MISMATCH\n")
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("compares logical snapshot data rather than archive serialization", () => {
  const expected = {
    sha256: "a".repeat(64),
    archiveBytes: 10,
    logicalDigest: "c".repeat(64),
    tableDocumentLineCounts: { students: 2 },
    nativeStorage: { fileCount: 1, totalBytes: 4 },
  }
  const serializationOnlyDifference = {
    ...expected,
    sha256: "b".repeat(64),
    archiveBytes: 11,
  }
  const tableDifference = {
    ...expected,
    tableDocumentLineCounts: { students: 3 },
  }
  const storageDifference = {
    ...expected,
    nativeStorage: { fileCount: 2, totalBytes: 4 },
  }

  assert.deepEqual(compareSnapshotManifests(expected, serializationOnlyDifference), {
    equal: true,
    differences: [],
  })
  assert.deepEqual(compareSnapshotManifests(expected, tableDifference), {
    equal: false,
    differences: ["tableDocumentLineCounts"],
  })
  assert.deepEqual(compareSnapshotManifests(expected, storageDifference), {
    equal: false,
    differences: ["nativeStorage.fileCount"],
  })
})

test("invalid clone arguments fail before a Convex command can be spawned", () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-snapshot-args-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const marker = join(directory, "npx-was-called")
  const fakeBin = join(directory, "bin")
  const cloneScript = fileURLToPath(
    new URL("./aia-dev-data/clone-convex-snapshot.mjs", import.meta.url),
  )

  try {
    writeFileSync(envFile, validEnv)
    mkdirSync(fakeBin)
    writeFileSync(join(fakeBin, "npx"), `#!/bin/sh\ntouch \"${marker}\"\nexit 99\n`)
    spawnSync("chmod", ["700", join(fakeBin, "npx")], { shell: false })

    const result = spawnSync(
      process.execPath,
      [
        cloneScript,
        "--env-file",
        envFile,
        "--source",
        SOURCE,
        "--target",
        "not-the-approved-target",
        "--confirm-target",
        "not-the-approved-target",
        "--backup-dir",
        join(directory, "backup"),
      ],
      {
        cwd: directory,
        encoding: "utf8",
        env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` },
        shell: false,
      },
    )

    assert.equal(result.status, 1)
    assert.match(result.stderr, /^AIA_TARGET_GATE_TARGET_MISMATCH\n$/)
    assert.equal(result.stdout, "")
    assert.equal(marker.includes("called") && spawnSync("test", ["-e", marker]).status, 1)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("invalid rollback arguments fail before a Convex command can be spawned", () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-rollback-args-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const marker = join(directory, "npx-was-called")
  const fakeBin = join(directory, "bin")
  const rollbackScript = fileURLToPath(
    new URL("./aia-dev-data/rollback-convex-snapshot.mjs", import.meta.url),
  )

  try {
    writeFileSync(envFile, validEnv)
    mkdirSync(fakeBin)
    writeFileSync(join(fakeBin, "npx"), `#!/bin/sh\ntouch \"${marker}\"\nexit 99\n`)
    spawnSync("chmod", ["700", join(fakeBin, "npx")], { shell: false })

    const result = spawnSync(
      process.execPath,
      [
        rollbackScript,
        "--env-file",
        envFile,
        "--source",
        SOURCE,
        "--target",
        "not-the-approved-target",
        "--confirm-target",
        "not-the-approved-target",
        "--snapshot",
        join(directory, "target-before.zip"),
        "--manifest",
        join(directory, "target-before.manifest.json"),
      ],
      {
        cwd: directory,
        encoding: "utf8",
        env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` },
        shell: false,
      },
    )

    assert.equal(result.status, 1)
    assert.match(result.stderr, /^AIA_TARGET_GATE_TARGET_MISMATCH\n$/)
    assert.equal(result.stdout, "")
    assert.equal(marker.includes("called") && spawnSync("test", ["-e", marker]).status, 1)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("verification logs aggregate data without revealing archive paths or document values", () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-verify-redaction-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const verifier = fileURLToPath(
    new URL("./aia-dev-data/verify-convex-clone.mjs", import.meta.url),
  )

  try {
    writeFileSync(envFile, validEnv)
    const { archive, secretEmail, secretUrl, secretToken } = makeFixtureZip(directory)
    const result = spawnSync(
      process.execPath,
      [
        verifier,
        "--env-file",
        envFile,
        "--source",
        SOURCE,
        "--target",
        TARGET,
        "--expected",
        archive,
        "--actual",
        archive,
      ],
      { encoding: "utf8", shell: false },
    )

    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, "")
    for (const value of [archive, secretEmail, secretUrl, secretToken, "fixture-only body"]) {
      assert.ok(!result.stdout.includes(value))
    }
    assert.match(result.stdout, /^verify expected sha256=[a-f0-9]{64} archiveBytes=\d+ documentLines=3 storageFiles=2 storageBytes=8\nverify actual sha256=[a-f0-9]{64} archiveBytes=\d+ documentLines=3 storageFiles=2 storageBytes=8\n$/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("verification exits nonzero when logical snapshot totals differ", () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-verify-mismatch-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const expected = join(directory, "expected-manifest")
  const actual = join(directory, "actual-manifest")
  const verifier = fileURLToPath(
    new URL("./aia-dev-data/verify-convex-clone.mjs", import.meta.url),
  )

  try {
    writeFileSync(envFile, validEnv)
    writeFileSync(expected, `${JSON.stringify({
      sha256: "a".repeat(64),
      archiveBytes: 10,
      logicalDigest: "c".repeat(64),
      tableDocumentLineCounts: { students: 2 },
      nativeStorage: { fileCount: 1, totalBytes: 4 },
    })}\n`)
    writeFileSync(actual, `${JSON.stringify({
      sha256: "b".repeat(64),
      archiveBytes: 11,
      logicalDigest: "d".repeat(64),
      tableDocumentLineCounts: { students: 3 },
      nativeStorage: { fileCount: 1, totalBytes: 4 },
    })}\n`)

    const result = spawnSync(
      process.execPath,
      [
        verifier,
        "--env-file",
        envFile,
        "--source",
        SOURCE,
        "--target",
        TARGET,
        "--expected",
        expected,
        "--actual",
        actual,
      ],
      { encoding: "utf8", shell: false },
    )

    assert.equal(result.status, 1)
    assert.equal(result.stderr, "AIA_SNAPSHOT_VERIFY_MISMATCH\n")
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("clone refuses an existing backup directory that is broader than owner-private", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-insecure-backup-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const backupDir = join(directory, "backup")
  let spawnCalls = 0

  try {
    writeFileSync(envFile, validEnv)
    mkdirSync(backupDir)
    chmodSync(backupDir, 0o755)

    await assert.rejects(
      runClone(cloneArgs(envFile, backupDir), {
        stateDirectory: join(directory, "state"),
        spawnCommand() {
          spawnCalls += 1
          return { status: 0 }
        },
      }),
      (error) => assertSnapshotError(error, "AIA_SNAPSHOT_BACKUP_DIRECTORY_INSECURE"),
    )
    assert.equal(spawnCalls, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("clone rejects a trailing-slash symlink backup path before spawning", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-symlink-backup-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const actualBackupDir = join(directory, "actual-backup")
  const symlinkBackupDir = join(directory, "backup-link")
  let spawnCalls = 0

  try {
    writeFileSync(envFile, validEnv)
    mkdirSync(actualBackupDir, { mode: 0o700 })
    chmodSync(actualBackupDir, 0o700)
    symlinkSync(actualBackupDir, symlinkBackupDir)

    await assert.rejects(
      runClone(cloneArgs(envFile, `${symlinkBackupDir}/`), {
        stateDirectory: join(directory, "state"),
        spawnCommand() {
          spawnCalls += 1
          return { status: 0 }
        },
      }),
      (error) => assertSnapshotError(error, "AIA_SNAPSHOT_BACKUP_DIRECTORY_INVALID"),
    )
    assert.equal(spawnCalls, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("a failed clone import records an unknown target state and blocks rollback before spawn", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-import-unknown-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const backupDir = join(directory, "backup")
  const stateDirectory = join(directory, "state")

  try {
    writeFileSync(envFile, validEnv)
    const { archive } = makeFixtureZip(directory)
    await assert.rejects(
      runClone(cloneArgs(envFile, backupDir), {
        stateDirectory,
        spawnCommand(_command, args) {
          if (args[1] === "export") {
            copyFileSync(archive, args[6])
            return { status: 0 }
          }
          if (args[1] === "import") {
            return { status: 1 }
          }
          throw new Error("unexpected command")
        },
      }),
      (error) => assertSnapshotError(error, "AIA_SNAPSHOT_IMPORT_UNKNOWN"),
    )

    const manifest = await makeSnapshotManifest(archive)
    const manifestPath = join(directory, "target-before.manifest.json")
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)
    let rollbackSpawnCalls = 0

    await assert.rejects(
      runRollback(rollbackArgs(envFile, archive, manifestPath), {
        stateDirectory,
        spawnCommand() {
          rollbackSpawnCalls += 1
          return { status: 0 }
        },
      }),
      (error) => assertSnapshotError(error, "AIA_SNAPSHOT_TARGET_STATE_BLOCKED"),
    )
    assert.equal(rollbackSpawnCalls, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("clone aborts when the source snapshot changes after its manifest and before import", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-snapshot-change-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const backupDir = join(directory, "backup")
  let importSpawnCalls = 0

  try {
    writeFileSync(envFile, validEnv)
    const initial = makeFixtureZip(directory, {
      archiveName: "initial.zip",
      studentDocuments: [{ status: "AAAA" }, { status: "BBBB" }],
    }).archive
    const changed = makeFixtureZip(directory, {
      archiveName: "changed.zip",
      studentDocuments: [{ status: "ZZZZ" }, { status: "BBBB" }],
    }).archive

    await assert.rejects(
      runClone(cloneArgs(envFile, backupDir), {
        stateDirectory: join(directory, "state"),
        spawnCommand(_command, args) {
          if (args[1] === "export") {
            copyFileSync(initial, args[6])
            return { status: 0 }
          }
          if (args[1] === "import") {
            importSpawnCalls += 1
            return { status: 0 }
          }
          throw new Error("unexpected command")
        },
        beforeImportRecheck({ snapshotPath }) {
          copyFileSync(changed, snapshotPath)
          chmodSync(snapshotPath, 0o600)
        },
      }),
      (error) => assertSnapshotError(error, "AIA_SNAPSHOT_IMPORT_SNAPSHOT_CHANGED"),
    )
    assert.equal(importSpawnCalls, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("rollback stages an externally supplied snapshot before its target import", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-rollback-staging-"))
  const envFile = join(directory, ".env.aia-dev.local")
  const stateDirectory = join(directory, "state")

  try {
    writeFileSync(envFile, validEnv)
    const { archive } = makeFixtureZip(directory)
    chmodSync(archive, 0o644)
    const manifest = await makeSnapshotManifest(archive)
    const manifestPath = join(directory, "target-before.manifest.json")
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)
    let importedSnapshot
    let importedSnapshotMode

    await runRollback(rollbackArgs(envFile, archive, manifestPath), {
      stateDirectory,
      spawnCommand(_command, args) {
        if (args[1] === "import") {
          importedSnapshot = args[4]
          importedSnapshotMode = statSync(importedSnapshot).mode
          return { status: 0 }
        }
        if (args[1] === "export") {
          copyFileSync(archive, args[6])
          chmodSync(args[6], 0o600)
          return { status: 0 }
        }
        throw new Error("unexpected command")
      },
    })

    assert.notEqual(importedSnapshot, archive)
    assert.equal(importedSnapshotMode & 0o077, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("rollback refuses a snapshot whose archive hash changed after its manifest", async () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-rollback-hash-change-"))
  const envFile = join(directory, ".env.aia-dev.local")
  let spawnCalls = 0

  try {
    writeFileSync(envFile, validEnv)
    const { archive } = makeFixtureZip(directory)
    const manifest = await makeSnapshotManifest(archive)
    const manifestPath = join(directory, "target-before.manifest.json")
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)
    appendFileSync(archive, "harmless-trailing-serialization-change")

    await assert.rejects(
      runRollback(rollbackArgs(envFile, archive, manifestPath), {
        stateDirectory: join(directory, "state"),
        spawnCommand() {
          spawnCalls += 1
          return { status: 0 }
        },
      }),
      (error) => assertSnapshotError(error, "AIA_SNAPSHOT_IMPORT_SNAPSHOT_CHANGED"),
    )
    assert.equal(spawnCalls, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
