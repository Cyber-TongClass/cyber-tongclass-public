import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const tempDirectory = mkdtempSync(path.join(tmpdir(), "aia-auth-errors-"))
const outputFile = path.join(tempDirectory, "auth-errors.cjs")
execFileSync("node_modules/.bin/esbuild", ["src/lib/auth-errors.ts", "--bundle", "--platform=node", "--format=cjs", `--outfile=${outputFile}`])
const errors = createRequire(import.meta.url)(outputFile)
process.on("exit", () => rmSync(tempDirectory, { recursive: true, force: true }))

test("login errors never expose Convex function names or request IDs", () => {
  const wrapped = new Error("[CONVEX M(users:simpleLogin)] [Request ID: secret-request] Server Error Called by client")
  assert.equal(errors.publicLoginError(wrapped), "账号或密码错误，请重试")
  assert.equal(errors.publicLoginError(new Error("账号或密码错误")), "账号或密码错误，请重试")
  assert.equal(errors.publicLoginError(new Error("network unavailable")), "登录失败，请稍后重试")
})

test("legacy login retry is limited to argument validator mismatches", () => {
  assert.equal(
    errors.shouldRetryLegacyLogin(new Error("ArgumentValidationError: Object contains extra field `identifier`")),
    true,
  )
  assert.equal(
    errors.shouldRetryLegacyLogin(new Error("Validator error: Missing required field `studentId`")),
    true,
  )
  assert.equal(
    errors.shouldRetryLegacyLogin(new Error("[CONVEX M(users:simpleLogin)] Server Error")),
    false,
  )
  assert.equal(errors.shouldRetryLegacyLogin(new Error("账号或密码错误")), false)
})
