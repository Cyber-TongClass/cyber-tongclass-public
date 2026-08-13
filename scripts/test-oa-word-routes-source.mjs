import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const root = new URL("../", import.meta.url)
const source = (path) => readFile(new URL(path, root), "utf8")

test("analysis authorizes before fetching and verifies immutable source bytes", async () => {
  const code = await source("src/app/api/oa/document-templates/analyze/route.ts")
  assert.match(code, /export const runtime = "nodejs"/)
  assert.ok(code.indexOf("processingAccess(sessionToken, versionId)") < code.indexOf("fetchAuthorizedBytes(access.sourceUrl)"))
  assert.match(code, /verifyAuthorizedSource\(source, access\)/)
  assert.match(code, /assertSafeDocxPackage\(readOoxmlPackage/)
  assert.match(code, /detectWordFormRegions/)
  assert.match(code, /createDerivedTarget/)
  assert.match(code, /noStoreHeaders/)
  assert.doesNotMatch(code, /console\.(?:log|error)/)
})

test("compiler trusts stored manifest and never browser fields or URLs", async () => {
  const code = await source("src/app/api/oa/document-templates/compile/route.ts")
  assert.match(code, /access\.manifest/)
  assert.match(code, /validateTemplateManifest/)
  assert.match(code, /activateCompiled/)
  assert.doesNotMatch(code, /body\.(?:answers|fields|manifest|templateUrl|sourceUrl)/)
  assert.doesNotMatch(code, /console\.(?:log|error)/)
})

test("preview exposes only sanitized structural regions", async () => {
  const code = await source("src/app/api/oa/document-templates/[versionId]/preview/route.ts")
  assert.match(code, /Structural preview only/)
  assert.doesNotMatch(code, /sourceUrl:/)
  assert.doesNotMatch(code, /storageId:/)
})

test("server access bounds downloads and creates only authorized derived targets", async () => {
  const code = await source("src/lib/server/oa-document-access.ts")
  assert.match(code, /getProcessingAccess/)
  assert.match(code, /getExportAccess/)
  assert.match(code, /generateDerivedUploadUrl/)
  assert.match(code, /reader\.cancel/)
  assert.match(code, /sha256/)
  assert.match(code, /redirect: "error"/)
})
