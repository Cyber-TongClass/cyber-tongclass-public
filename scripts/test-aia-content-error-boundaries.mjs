import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function boundarySource(path) {
  assert.equal(existsSync(path), true, `expected ${path} to exist`)
  return readFileSync(path, "utf8")
}

function assertSafeRetryBoundary(source) {
  assert.match(source, /^"use client"/)
  assert.match(source, /error:\s*Error/)
  assert.match(source, /reset:\s*\(\)\s*=>\s*void/)
  assert.match(source, /内容加载失败/)
  assert.match(source, /<button[\s\S]*?type="button"[\s\S]*?onClick=\{reset\}[\s\S]*?>[\s\S]*?重试[\s\S]*?<\/button>/)
  assert.doesNotMatch(source, /error\.(?:message|stack|cause|digest)/)
  assert.doesNotMatch(source, /JSON\.stringify\(\s*error\s*\)/)
  assert.doesNotMatch(source, /\{\s*error\s*\}/)
  assert.doesNotMatch(source, /studentId|accountUserId|email/i)
}

test("research query failures are isolated behind a safe retry boundary", () => {
  const source = boundarySource("src/app/research/error.tsx")

  assertSafeRetryBoundary(source)
})

test("updates query failures are isolated behind a safe retry boundary", () => {
  const source = boundarySource("src/app/updates/error.tsx")

  assertSafeRetryBoundary(source)
})
