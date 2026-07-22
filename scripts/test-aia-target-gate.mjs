import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  parseDotEnv,
  validateTargetConfig,
} from "./aia-dev-data/lib/target-gate.mjs"

const validEnv = {
  CONVEX_DEPLOYMENT: "dev:bold-sandpiper-236",
  NEXT_PUBLIC_CONVEX_URL: "https://bold-sandpiper-236.convex.cloud",
  NEXT_PUBLIC_CONVEX_SITE_URL: "https://bold-sandpiper-236.convex.site",
  AIA_DEV_DATA_TARGET: "bold-sandpiper-236",
}

const validConfig = {
  source: "clean-swordfish-983",
  target: "bold-sandpiper-236",
  confirmTarget: "bold-sandpiper-236",
  mode: "write",
}

function assertGateError(run, code) {
  assert.throws(run, (error) => {
    assert.ok(error instanceof Error)
    assert.match(error.message, new RegExp(`^${code}`))
    return true
  })
}

test("accepts only the approved source and development target", () => {
  assert.deepEqual(validateTargetConfig(validEnv, validConfig), {
    target: "bold-sandpiper-236",
    mode: "write",
  })
})

test("rejects production deployment strings", () => {
  assertGateError(
    () => validateTargetConfig(
      { ...validEnv, CONVEX_DEPLOYMENT: "prod:bold-sandpiper-236" },
      validConfig,
    ),
    "AIA_TARGET_GATE_PRODUCTION_VALUE",
  )
})

test("rejects a mismatched write confirmation", () => {
  assertGateError(
    () => validateTargetConfig(validEnv, {
      ...validConfig,
      confirmTarget: "another-deployment",
    }),
    "AIA_TARGET_GATE_CONFIRMATION_MISMATCH",
  )
})

test("rejects a source other than the approved source", () => {
  assertGateError(
    () => validateTargetConfig(validEnv, {
      ...validConfig,
      source: "another-source",
    }),
    "AIA_TARGET_GATE_SOURCE_MISMATCH",
  )
})

test("rejects target mismatches", () => {
  assertGateError(
    () => validateTargetConfig(validEnv, {
      ...validConfig,
      target: "another-target",
    }),
    "AIA_TARGET_GATE_TARGET_MISMATCH",
  )
})

test("rejects missing required values", () => {
  assertGateError(
    () => validateTargetConfig(
      { ...validEnv, NEXT_PUBLIC_CONVEX_SITE_URL: "" },
      validConfig,
    ),
    "AIA_TARGET_GATE_MISSING_VALUE",
  )
})

test("requires exact public Convex endpoints", () => {
  for (const [key, value] of [
    [
      "NEXT_PUBLIC_CONVEX_URL",
      "https://other-deployment.convex.cloud/?target=bold-sandpiper-236",
    ],
    [
      "NEXT_PUBLIC_CONVEX_SITE_URL",
      "https://other-deployment.convex.site/?target=bold-sandpiper-236",
    ],
  ]) {
    assertGateError(
      () => validateTargetConfig({ ...validEnv, [key]: value }, validConfig),
      "AIA_TARGET_GATE_ENV_MISMATCH",
    )
  }
})

test("allows read mode without a confirmation", () => {
  assert.deepEqual(validateTargetConfig(validEnv, {
    source: "clean-swordfish-983",
    target: "bold-sandpiper-236",
    mode: "read",
  }), {
    target: "bold-sandpiper-236",
    mode: "read",
  })
})

test("rejects unknown modes", () => {
  for (const mode of ["write ", "mutate"]) {
    assertGateError(
      () => validateTargetConfig(validEnv, { ...validConfig, mode }),
      "AIA_TARGET_GATE_MODE_INVALID",
    )
  }
})

test("parses quoted values and ignores blank or comment lines", () => {
  assert.deepEqual(
    parseDotEnv(`
# local AIA development target
CONVEX_DEPLOYMENT='dev:bold-sandpiper-236'

NEXT_PUBLIC_CONVEX_URL="https://bold-sandpiper-236.convex.cloud"
NEXT_PUBLIC_CONVEX_SITE_URL=https://bold-sandpiper-236.convex.site
AIA_DEV_DATA_TARGET=bold-sandpiper-236
`),
    validEnv,
  )
})

test("keeps unmatched quote characters in dotenv values", () => {
  assert.deepEqual(parseDotEnv("AIA_DEV_DATA_TARGET='\n"), {
    AIA_DEV_DATA_TARGET: "'",
  })
})

test("the CLI prints only the approved target and mode", () => {
  const directory = mkdtempSync(join(tmpdir(), "aia-target-gate-"))
  const envFile = join(directory, ".env.aia-dev.local")

  try {
    writeFileSync(envFile, `${Object.entries(validEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`)

    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("./aia-dev-data/lib/target-gate.mjs", import.meta.url)),
        "--env-file",
        envFile,
        "--source",
        validConfig.source,
        "--target",
        validConfig.target,
        "--confirm-target",
        validConfig.confirmTarget,
        "--mode",
        validConfig.mode,
      ],
      { encoding: "utf8" },
    )

    assert.equal(result.status, 0)
    assert.equal(result.stderr, "")
    assert.equal(
      result.stdout,
      "AIA target gate passed: bold-sandpiper-236 (write)\n",
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
