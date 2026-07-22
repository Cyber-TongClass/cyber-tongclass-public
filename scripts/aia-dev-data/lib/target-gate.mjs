import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const SOURCE = "clean-swordfish-983"
const TARGET = "bold-sandpiper-236"
const REQUIRED_ENV_KEYS = [
  "CONVEX_DEPLOYMENT",
  "NEXT_PUBLIC_CONVEX_URL",
  "NEXT_PUBLIC_CONVEX_SITE_URL",
  "AIA_DEV_DATA_TARGET",
]

const fail = (code) => {
  throw new Error(code)
}

const hasValue = (value) => typeof value === "string" && value.trim() !== ""

function stripMatchingOuterQuotes(value) {
  const first = value[0]
  const last = value.at(-1)

  if (value.length >= 2 && (first === "'" || first === '"') && first === last) {
    return value.slice(1, -1)
  }

  return value
}

export function parseDotEnv(text) {
  if (typeof text !== "string") {
    fail("AIA_TARGET_GATE_DOTENV_INVALID")
  }

  const env = {}

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (match) {
      env[match[1]] = stripMatchingOuterQuotes(match[2])
    }
  }

  return env
}

export function validateTargetConfig(env, options) {
  const config = options && typeof options === "object" ? options : {}
  const values = env && typeof env === "object" ? env : {}
  const { source, target, confirmTarget, mode } = config
  const required = [
    source,
    target,
    mode,
    ...REQUIRED_ENV_KEYS.map((key) => values[key]),
  ]

  if (mode === "write") {
    required.push(confirmTarget)
  }

  if (required.some((value) => !hasValue(value))) {
    fail("AIA_TARGET_GATE_MISSING_VALUE")
  }

  if ([...required, confirmTarget].some(
    (value) => typeof value === "string" && value.includes("prod:"),
  )) {
    fail("AIA_TARGET_GATE_PRODUCTION_VALUE")
  }

  if (source === target) {
    fail("AIA_TARGET_GATE_SOURCE_EQUALS_TARGET")
  }

  if (source !== SOURCE) {
    fail("AIA_TARGET_GATE_SOURCE_MISMATCH")
  }

  if (target !== TARGET || values.AIA_DEV_DATA_TARGET !== TARGET) {
    fail("AIA_TARGET_GATE_TARGET_MISMATCH")
  }

  if (mode === "write" && confirmTarget !== TARGET) {
    fail("AIA_TARGET_GATE_CONFIRMATION_MISMATCH")
  }

  const targetValues = [
    values.CONVEX_DEPLOYMENT,
    values.NEXT_PUBLIC_CONVEX_URL,
    values.NEXT_PUBLIC_CONVEX_SITE_URL,
  ]

  if (targetValues.some((value) => !value.includes(TARGET))) {
    fail("AIA_TARGET_GATE_ENV_MISMATCH")
  }

  if (values.CONVEX_DEPLOYMENT !== `dev:${TARGET}`) {
    fail("AIA_TARGET_GATE_DEPLOYMENT_MISMATCH")
  }

  return { target: TARGET, mode }
}

function parseCliArgs(argv) {
  const flagNames = {
    "--env-file": "envFile",
    "--source": "source",
    "--target": "target",
    "--confirm-target": "confirmTarget",
    "--mode": "mode",
  }
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const key = flagNames[flag]
    const value = argv[index + 1]

    if (!key || Object.hasOwn(args, key)) {
      fail("AIA_TARGET_GATE_ARGUMENT_INVALID")
    }

    if (!hasValue(value) || value.startsWith("--")) {
      fail("AIA_TARGET_GATE_MISSING_VALUE")
    }

    args[key] = value
    index += 1
  }

  return args
}

function runCli() {
  const args = parseCliArgs(process.argv.slice(2))

  if (!hasValue(args.envFile)) {
    fail("AIA_TARGET_GATE_MISSING_VALUE")
  }

  const env = parseDotEnv(readFileSync(args.envFile, "utf8"))
  const result = validateTargetConfig(env, args)
  process.stdout.write(`AIA target gate passed: ${result.target} (${result.mode})\n`)
}

const invokedModuleUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : ""

if (import.meta.url === invokedModuleUrl) {
  try {
    runCli()
  } catch (error) {
    const code = error instanceof Error && error.message.startsWith("AIA_TARGET_GATE_")
      ? error.message
      : "AIA_TARGET_GATE_ENV_FILE_READ_ERROR"
    process.stderr.write(`${code}\n`)
    process.exitCode = 1
  }
}
