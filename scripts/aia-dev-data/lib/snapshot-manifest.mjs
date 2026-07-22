import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"

export const AIA_SOURCE_DEPLOYMENT = "clean-swordfish-983"
export const AIA_TARGET_DEPLOYMENT = "bold-sandpiper-236"

const SAFE_TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/
const SAFE_STORAGE_ENTRY = /^_storage(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)+$/
const SHA256 = /^[a-f0-9]{64}$/
const MAX_DOCUMENT_LINE_LENGTH = 16 * 1024 * 1024

function fail(code) {
  throw new Error(code)
}

function hasValue(value) {
  return typeof value === "string" && value.trim() !== ""
}

function isSafeCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function commandFailure() {
  fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
}

function runArchiveCommand(args, onData) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (callback) => {
      if (settled) {
        return
      }
      settled = true
      callback()
    }

    let child
    try {
      child = spawn("unzip", args, {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      })
    } catch {
      commandFailure()
    }

    child.stdout.on("data", (chunk) => {
      if (settled) {
        return
      }

      try {
        onData(chunk)
      } catch {
        child.kill()
        settle(() => reject(new Error("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")))
      }
    })
    child.stderr.resume()
    child.once("error", () => {
      settle(() => reject(new Error("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")))
    })
    child.once("close", (code) => {
      if (settled) {
        return
      }
      if (code !== 0) {
        settle(() => reject(new Error("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")))
        return
      }
      settle(resolve)
    })
  })
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function canonicalizeJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
    .join(",")}}`
}

function hashDigests(label, digests) {
  const hash = createHash("sha256")
  hash.update(`${label}\u0000`)
  for (const digest of [...digests].sort()) {
    hash.update(digest)
    hash.update("\u0000")
  }
  return hash.digest("hex")
}

function documentDigestCounter() {
  const decoder = new TextDecoder("utf-8", { fatal: true })
  const documentDigests = []
  let documentLines = 0
  let firstLine = true
  let pending = ""

  const processLine = (line) => {
    const normalized = firstLine ? line.replace(/^\uFEFF/, "") : line
    firstLine = false
    if (!normalized.trim()) {
      return
    }

    let parsed
    try {
      parsed = JSON.parse(normalized)
      documentDigests.push(sha256(canonicalizeJson(parsed)))
    } catch {
      fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
    }
    documentLines += 1
  }

  const processPendingLines = (isFinal = false) => {
    let newlineIndex = pending.indexOf("\n")
    while (newlineIndex !== -1) {
      processLine(pending.slice(0, newlineIndex).replace(/\r$/, ""))
      pending = pending.slice(newlineIndex + 1)
      newlineIndex = pending.indexOf("\n")
    }

    if (isFinal && pending) {
      processLine(pending.replace(/\r$/, ""))
      pending = ""
    }
    if (pending.length > MAX_DOCUMENT_LINE_LENGTH) {
      fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
    }
  }

  return {
    write(chunk) {
      pending += decoder.decode(chunk, { stream: true })
      processPendingLines()
    },
    value() {
      pending += decoder.decode()
      processPendingLines(true)
      return {
        documentLines,
        digest: hashDigests("documents", documentDigests),
      }
    },
  }
}

async function hashArchive(snapshotPath) {
  let archive
  try {
    archive = await stat(snapshotPath)
  } catch {
    fail("AIA_SNAPSHOT_MANIFEST_PATH_INVALID")
  }

  if (!archive.isFile() || !isSafeCount(archive.size)) {
    fail("AIA_SNAPSHOT_MANIFEST_PATH_INVALID")
  }

  const hash = createHash("sha256")

  try {
    await new Promise((resolve, reject) => {
      const input = createReadStream(snapshotPath)
      input.on("data", (chunk) => hash.update(chunk))
      input.once("error", reject)
      input.once("end", resolve)
    })
  } catch {
    fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
  }

  return {
    sha256: hash.digest("hex"),
    archiveBytes: archive.size,
  }
}

function parseArchiveEntry(entry, tableEntries, storageEntries) {
  if (!entry || entry.includes("\u0000")) {
    return
  }

  const documentMatch = /^([^/]+)\/documents\.jsonl$/.exec(entry)
  if (documentMatch) {
    const tableName = documentMatch[1]
    if (!SAFE_TABLE_NAME.test(tableName) || tableEntries.has(tableName)) {
      fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
    }
    tableEntries.set(tableName, entry)
    return
  }

  if (entry.startsWith("_storage/") && !entry.endsWith("/")) {
    if (!SAFE_STORAGE_ENTRY.test(entry) || storageEntries.has(entry)) {
      fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
    }
    storageEntries.add(entry)
  }
}

async function listArchiveEntries(snapshotPath) {
  const tableEntries = new Map()
  const storageEntries = new Set()
  const decoder = new TextDecoder()
  let pending = ""

  const processPendingLines = (isFinal = false) => {
    let newlineIndex = pending.indexOf("\n")
    while (newlineIndex !== -1) {
      const entry = pending.slice(0, newlineIndex).replace(/\r$/, "")
      pending = pending.slice(newlineIndex + 1)
      parseArchiveEntry(entry, tableEntries, storageEntries)
      newlineIndex = pending.indexOf("\n")
    }

    if (isFinal && pending) {
      parseArchiveEntry(pending.replace(/\r$/, ""), tableEntries, storageEntries)
      pending = ""
    }

    if (pending.length > 4096) {
      fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
    }
  }

  await runArchiveCommand(["-Z", "-1", snapshotPath], (chunk) => {
    pending += decoder.decode(chunk, { stream: true })
    processPendingLines()
  })
  pending += decoder.decode()
  processPendingLines(true)

  return { tableEntries, storageEntries }
}

async function digestDocumentTable(snapshotPath, archiveEntry) {
  const counter = documentDigestCounter()
  await runArchiveCommand(["-p", snapshotPath, archiveEntry], (chunk) => {
    counter.write(chunk)
  })
  const result = counter.value()
  if (!isSafeCount(result.documentLines)) {
    fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
  }
  return result
}

async function digestStorageEntry(snapshotPath, archiveEntry) {
  let totalBytes = 0
  const contentHash = createHash("sha256")
  await runArchiveCommand(["-p", snapshotPath, archiveEntry], (chunk) => {
    totalBytes += chunk.length
    contentHash.update(chunk)
    if (!isSafeCount(totalBytes)) {
      fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
    }
  })
  const entryHash = createHash("sha256")
  entryHash.update("storage\u0000")
  entryHash.update(archiveEntry)
  entryHash.update("\u0000")
  entryHash.update(contentHash.digest("hex"))
  return {
    totalBytes,
    digest: entryHash.digest("hex"),
  }
}

export async function makeSnapshotManifest(snapshotPath) {
  if (!hasValue(snapshotPath) || snapshotPath.startsWith("-")) {
    fail("AIA_SNAPSHOT_MANIFEST_PATH_INVALID")
  }

  const archive = await hashArchive(snapshotPath)
  const { tableEntries, storageEntries } = await listArchiveEntries(snapshotPath)
  const tableDocumentLineCounts = Object.create(null)
  const tableDigests = []

  for (const [tableName, archiveEntry] of [...tableEntries.entries()].sort(([left], [right]) => (
    left.localeCompare(right)
  ))) {
    const table = await digestDocumentTable(snapshotPath, archiveEntry)
    tableDocumentLineCounts[tableName] = table.documentLines
    tableDigests.push(sha256(`table\u0000${tableName}\u0000${table.digest}`))
  }

  let totalBytes = 0
  const storageDigests = []
  for (const archiveEntry of storageEntries) {
    const storage = await digestStorageEntry(snapshotPath, archiveEntry)
    totalBytes += storage.totalBytes
    storageDigests.push(storage.digest)
    if (!isSafeCount(totalBytes)) {
      fail("AIA_SNAPSHOT_MANIFEST_ARCHIVE_INVALID")
    }
  }

  const logicalDigest = hashDigests("snapshot", [
    hashDigests("tables", tableDigests),
    hashDigests("storage", storageDigests),
  ])

  return {
    ...archive,
    logicalDigest,
    tableDocumentLineCounts: Object.fromEntries(Object.entries(tableDocumentLineCounts)),
    nativeStorage: {
      fileCount: storageEntries.size,
      totalBytes,
    },
  }
}

export function assertSnapshotManifest(value) {
  if (!isPlainObject(value)) {
    fail("AIA_SNAPSHOT_MANIFEST_INVALID")
  }

  const allowedKeys = new Set([
    "sha256",
    "archiveBytes",
    "logicalDigest",
    "tableDocumentLineCounts",
    "nativeStorage",
  ])
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    fail("AIA_SNAPSHOT_MANIFEST_INVALID")
  }

  if (
    typeof value.sha256 !== "string"
    || !SHA256.test(value.sha256)
    || !isSafeCount(value.archiveBytes)
    || typeof value.logicalDigest !== "string"
    || !SHA256.test(value.logicalDigest)
    || !isPlainObject(value.tableDocumentLineCounts)
    || !isPlainObject(value.nativeStorage)
  ) {
    fail("AIA_SNAPSHOT_MANIFEST_INVALID")
  }

  const tableDocumentLineCounts = Object.create(null)
  for (const [tableName, documentLines] of Object.entries(value.tableDocumentLineCounts)) {
    if (!SAFE_TABLE_NAME.test(tableName) || !isSafeCount(documentLines)) {
      fail("AIA_SNAPSHOT_MANIFEST_INVALID")
    }
    tableDocumentLineCounts[tableName] = documentLines
  }

  const storageKeys = Object.keys(value.nativeStorage)
  if (
    storageKeys.length !== 2
    || !Object.hasOwn(value.nativeStorage, "fileCount")
    || !Object.hasOwn(value.nativeStorage, "totalBytes")
    || !isSafeCount(value.nativeStorage.fileCount)
    || !isSafeCount(value.nativeStorage.totalBytes)
  ) {
    fail("AIA_SNAPSHOT_MANIFEST_INVALID")
  }

  return {
    sha256: value.sha256,
    archiveBytes: value.archiveBytes,
    logicalDigest: value.logicalDigest,
    tableDocumentLineCounts: Object.fromEntries(
      Object.entries(tableDocumentLineCounts).sort(([left], [right]) => left.localeCompare(right)),
    ),
    nativeStorage: {
      fileCount: value.nativeStorage.fileCount,
      totalBytes: value.nativeStorage.totalBytes,
    },
  }
}

export function compareSnapshotManifests(expected, actual) {
  const expectedManifest = assertSnapshotManifest(expected)
  const actualManifest = assertSnapshotManifest(actual)
  const differences = []

  if (
    JSON.stringify(expectedManifest.tableDocumentLineCounts)
    !== JSON.stringify(actualManifest.tableDocumentLineCounts)
  ) {
    differences.push("tableDocumentLineCounts")
  }
  if (expectedManifest.nativeStorage.fileCount !== actualManifest.nativeStorage.fileCount) {
    differences.push("nativeStorage.fileCount")
  }
  if (expectedManifest.nativeStorage.totalBytes !== actualManifest.nativeStorage.totalBytes) {
    differences.push("nativeStorage.totalBytes")
  }
  if (expectedManifest.logicalDigest !== actualManifest.logicalDigest) {
    differences.push("logicalDigest")
  }

  return {
    equal: differences.length === 0,
    differences,
  }
}

export function summarizeSnapshotManifest(manifest) {
  const safeManifest = assertSnapshotManifest(manifest)
  const documentLines = Object.values(safeManifest.tableDocumentLineCounts)
    .reduce((total, count) => total + count, 0)

  return [
    `sha256=${safeManifest.sha256}`,
    `archiveBytes=${safeManifest.archiveBytes}`,
    `documentLines=${documentLines}`,
    `storageFiles=${safeManifest.nativeStorage.fileCount}`,
    `storageBytes=${safeManifest.nativeStorage.totalBytes}`,
  ].join(" ")
}

export function buildConvexExport(deployment, outputPath) {
  if (!hasValue(outputPath) || outputPath.startsWith("-")) {
    fail("AIA_TARGET_GATE_ARGUMENT_INVALID")
  }
  if (deployment !== AIA_SOURCE_DEPLOYMENT && deployment !== AIA_TARGET_DEPLOYMENT) {
    fail("AIA_TARGET_GATE_DEPLOYMENT_MISMATCH")
  }

  return [
    "convex",
    "export",
    "--deployment",
    deployment,
    "--include-file-storage",
    "--path",
    outputPath,
  ]
}

export function buildConvexImport(deployment, snapshotPath) {
  if (!hasValue(snapshotPath) || snapshotPath.startsWith("-")) {
    fail("AIA_TARGET_GATE_ARGUMENT_INVALID")
  }
  if (deployment !== AIA_TARGET_DEPLOYMENT) {
    fail("AIA_TARGET_GATE_TARGET_MISMATCH")
  }

  return [
    "convex",
    "import",
    "--deployment",
    AIA_TARGET_DEPLOYMENT,
    snapshotPath,
    "--replace-all",
    "--yes",
  ]
}
