import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  buildConvexExport,
  buildConvexImport,
  runConvexCommand,
} from "./aia-dev-data/clone-convex-snapshot.mjs"
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

function makeFixtureZip(directory) {
  const input = join(directory, "input")
  const archive = join(directory, "fixture.zip")
  const secretEmail = "fixture.person@example.test"
  const secretUrl = "https://fixture.example.test/private-token"
  const secretToken = "fixture-token-value"

  mkdirSync(join(input, "students"), { recursive: true })
  mkdirSync(join(input, "announcements"), { recursive: true })
  mkdirSync(join(input, "_storage"), { recursive: true })
  writeFileSync(
    join(input, "students", "documents.jsonl"),
    `${JSON.stringify({ email: secretEmail, token: secretToken })}\n${JSON.stringify({ url: secretUrl })}\n`,
  )
  writeFileSync(
    join(input, "announcements", "documents.jsonl"),
    `${JSON.stringify({ body: "fixture-only body" })}\n`,
  )
  writeFileSync(join(input, "_storage", "fixture-a"), "abc")
  writeFileSync(join(input, "_storage", "fixture-b"), "defgh")

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
    assert.ok(manifest.archiveBytes > 0)
    for (const value of [secretEmail, secretUrl, secretToken, "fixture-only body"]) {
      assert.ok(!serialized.includes(value))
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("compares logical snapshot data rather than archive serialization", () => {
  const expected = {
    sha256: "a".repeat(64),
    archiveBytes: 10,
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
      tableDocumentLineCounts: { students: 2 },
      nativeStorage: { fileCount: 1, totalBytes: 4 },
    })}\n`)
    writeFileSync(actual, `${JSON.stringify({
      sha256: "b".repeat(64),
      archiveBytes: 11,
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
