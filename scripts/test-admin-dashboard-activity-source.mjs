import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const dashboard = readFileSync("src/app/admin/page.tsx", "utf8")

test("admin dashboard uses the public news timestamp exposed by the API", () => {
  assert.match(
    dashboard,
    /news\.slice\(0, 8\)[\s\S]*?timestamp:\s*item\.publishedAt/,
  )
})

test("admin dashboard does not invent current timestamps for undated course summaries", () => {
  assert.doesNotMatch(dashboard, /courses\.slice\([^)]*\)[\s\S]*?timestamp:/)
  assert.doesNotMatch(dashboard, /course\.updatedAt\s*\|\|\s*Date\.now\(\)/)
})
