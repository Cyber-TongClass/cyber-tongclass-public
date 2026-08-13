import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const root = new URL("../", import.meta.url)
const source = (path) => readFile(new URL(path, root), "utf8")

test("single document export is Convex-authorized and server-derived", async () => {
  const code = await source("src/app/api/oa/submissions/[submissionId]/document/route.ts")
  assert.match(code, /exportAccess\(sessionToken, submissionId, false\)/)
  assert.match(code, /assertCompiledTemplate/)
  assert.match(code, /noStoreHeaders/)
  assert.match(code, /rfc5987Attachment/)
  assert.doesNotMatch(code, /body\.(?:answers|fields|templateUrl|fileName)/)
})

test("batch export authorizes every selected ID, checks form ownership, and caps selection", async () => {
  const code = await source("src/app/api/oa/forms/[formId]/exports/route.ts")
  assert.match(code, /assertSelectedSubmissionCount/)
  assert.match(code, /Promise\.all\(ids\.map\(\(submissionId\) => exportAccess\(sessionToken, submissionId, true\)\)\)/)
  assert.match(code, /access\.submission\.formId/)
  assert.match(code, /buildCsvArtifact/)
  assert.match(code, /buildXlsxArtifact/)
  assert.match(code, /buildRepeatRowArtifact/)
  assert.match(code, /buildWordZipArtifact/)
  assert.doesNotMatch(code, /body\.(?:answers|fields|templateUrl|fileName)/)
})

test("export DTO uses snapshots and trusted attachment display names", async () => {
  const code = await source("src/lib/server/oa-form-export.ts")
  assert.match(code, /formSnapshot\?\.fields/)
  assert.match(code, /trustedFileDisplayNames/)
  assert.match(code, /fileName/)
  assert.match(code, /compiledStorageId/)
  const route = await source("src/app/api/oa/forms/[formId]/exports/route.ts")
  assert.match(route, /sourceType === "doc"/)
})
