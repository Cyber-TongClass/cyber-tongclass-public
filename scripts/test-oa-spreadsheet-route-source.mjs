import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const routeUrl = new URL("../src/app/api/oa/spreadsheets/analyze/route.ts", import.meta.url)

test("XLSX analysis is bearer-authenticated, role-gated, and body-bounded", async () => {
  const code = await readFile(routeUrl, "utf8")
  assert.match(code, /export const runtime = "nodejs"/)
  assert.match(code, /authorization.*Bearer/is)
  assert.match(code, /auth:currentUserBySession/)
  assert.match(code, /identityType !== "teacher"/)
  assert.match(code, /role !== "super_admin"/)
  assert.match(code, /request\.body\.getReader\(\)/)
  assert.match(code, /OA_SPREADSHEET_LIMITS\.maxSourceBytes/)
  assert.match(code, /reader\.cancel\(\)/)
})

test("XLSX analysis validates source metadata before parsing and returns no-store metadata", async () => {
  const code = await readFile(routeUrl, "utf8")
  assert.match(code, /x-oa-file-name/)
  assert.match(code, /content-type/)
  assert.match(code, /normalizeSpreadsheetSource/)
  assert.match(code, /analyzeXlsxHeaders/)
  assert.match(code, /cache-control.*private, no-store/is)
  assert.doesNotMatch(code, /console\.(?:log|error)/)
})

test("XLSX analysis distinguishes authentication, authorization, size, input, and internal failures", async () => {
  const code = await readFile(routeUrl, "utf8")
  for (const status of [401, 403, 413, 422, 500]) assert.match(code, new RegExp(`(?:,|status:)\\s*${status}`))
  for (const codeName of ["AUTH_REQUIRED", "FORBIDDEN", "SOURCE_TOO_LARGE", "INVALID_SPREADSHEET", "SPREADSHEET_ERROR"]) {
    assert.match(code, new RegExp(codeName))
  }
})
