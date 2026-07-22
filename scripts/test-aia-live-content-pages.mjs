import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  return readFileSync(path, "utf8")
}

test("AIA research page consumes only the safe public research projection", () => {
  const research = source("src/app/research/page.tsx")

  assert.match(research, /^"use client"/)
  assert.match(research, /usePublicInstituteResearch/)
  assert.doesNotMatch(research, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.doesNotMatch(research, /demoResearch|demoPeople|accountUserId|studentId|email/i)
  assert.match(research, /research\s*===\s*undefined/)
  assert.match(research, /research\.length\s*===\s*0/)
  assert.match(research, /正在加载公开研究成果/)
  assert.match(research, /暂无已公开的研究成果/)
})

test("AIA updates page consumes only the safe public update projection", () => {
  const updates = source("src/app/updates/page.tsx")

  assert.match(updates, /^"use client"/)
  assert.match(updates, /usePublicInstituteUpdates/)
  assert.doesNotMatch(updates, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.doesNotMatch(updates, /demoResearch|demoPeople|accountUserId|studentId|email/i)
  assert.match(updates, /updates\s*===\s*undefined/)
  assert.match(updates, /updates\.length\s*===\s*0/)
  assert.match(updates, /正在加载公开动态/)
  assert.match(updates, /暂无已公开的动态/)
})
