import {
  closeSync,
  lstatSync,
  openSync,
  readSync,
  readFileSync,
} from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
  parseDotEnv,
  validateTargetConfig,
} from "./lib/target-gate.mjs"
import {
  assertSnapshotManifest,
  compareSnapshotManifests,
  makeSnapshotManifest,
  summarizeSnapshotManifest,
} from "./lib/snapshot-manifest.mjs"

function fail(code) {
  throw new Error(code)
}

function hasValue(value) {
  return typeof value === "string" && value.trim() !== ""
}

function parseVerifyArgs(argv) {
  const names = {
    "--env-file": "envFile",
    "--source": "source",
    "--target": "target",
    "--expected": "expected",
    "--actual": "actual",
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
    mode: "read",
  })
}

function assertRegularFile(path) {
  try {
    const details = lstatSync(path)
    if (!details.isFile() || details.isSymbolicLink()) {
      fail("AIA_SNAPSHOT_INPUT_INVALID")
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AIA_")) {
      throw error
    }
    fail("AIA_SNAPSHOT_INPUT_INVALID")
  }
}

function readManifest(path) {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"))
  } catch {
    fail("AIA_SNAPSHOT_MANIFEST_INVALID")
  }
  return assertSnapshotManifest(parsed)
}

function looksLikeManifest(path) {
  let descriptor
  try {
    descriptor = openSync(path, "r")
    const preview = Buffer.alloc(4096)
    const bytesRead = readSync(descriptor, preview, 0, preview.length, 0)
    return preview.subarray(0, bytesRead).toString("utf8").trimStart().startsWith("{")
  } catch {
    fail("AIA_SNAPSHOT_INPUT_INVALID")
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor)
    }
  }
}

async function inputManifest(path) {
  assertRegularFile(path)
  if (looksLikeManifest(path)) {
    return readManifest(path)
  }
  return makeSnapshotManifest(path)
}

function logManifest(label, manifest) {
  process.stdout.write(`${label} ${summarizeSnapshotManifest(manifest)}\n`)
}

export async function runVerification(argv = process.argv.slice(2)) {
  const args = parseVerifyArgs(argv)
  loadAndValidate(args)

  const expected = await inputManifest(args.expected)
  const actual = await inputManifest(args.actual)
  logManifest("verify expected", expected)
  logManifest("verify actual", actual)

  if (!compareSnapshotManifests(expected, actual).equal) {
    fail("AIA_SNAPSHOT_VERIFY_MISMATCH")
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
  runVerification().catch((error) => {
    process.stderr.write(`${cliErrorCode(error)}\n`)
    process.exitCode = 1
  })
}
