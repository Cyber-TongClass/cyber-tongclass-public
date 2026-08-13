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
  for (const contract of [
    /convertFilledDocxToPdf/,
    /detectPreviewToolCapabilities/,
    /inspectPdf/,
    /extractPdfBboxXml/,
    /parsePdfBboxXml/,
    /indexWordWritableNodes/,
    /matchWordNodesToPdf/,
    /renderPdfPages/,
    /inspectPdfFonts/,
    /buildOAPreviewBundle/,
    /syntaxVersion:\s*2/,
  ]) assert.match(code, contract)
  assert.match(code, /application\/zip/)
  assert.doesNotMatch(code, /preview\.json/)
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
  assert.match(code, /access\.workingUrl/)
  assert.doesNotMatch(code, /convertLegacyDocToDocx/)
  assert.doesNotMatch(code, /console\.(?:log|error)/)
})

test("preview metadata and page endpoints are bearer-only and never expose object locations", async () => {
  const code = await source("src/app/api/oa/document-templates/[versionId]/preview/route.ts")
  const page = await source("src/app/api/oa/document-templates/[versionId]/preview/pages/[page]/route.ts")
  for (const route of [code, page]) {
    assert.match(route, /bearerSessionToken\(request\)/)
    assert.match(route, /processingAccess\(sessionToken, versionId\)/)
    assert.match(route, /readOAPreviewBundle/)
    assert.doesNotMatch(route, /sessionToken\s*\?/)
    assert.doesNotMatch(route, /sourceUrl:/)
    assert.doesNotMatch(route, /previewUrl:/)
    assert.doesNotMatch(route, /storageId:/)
  }
  assert.match(code, /layout\.pages/)
  assert.match(code, /layout\.candidates/)
  assert.match(code, /OA_PREVIEW_ANALYZER_VERSION/)
  assert.match(page, /image\/png/)
  assert.match(page, /private, no-store/)
  assert.match(page, /content-length/)
  assert.match(page, /x-content-type-options/)
  assert.match(page, /Number\.isSafeInteger/)
})

test("review reloads canonical candidates and refuses browser OOXML locators", async () => {
  const code = await source("src/app/api/oa/document-templates/[versionId]/review/route.ts")
  assert.match(code, /bearerSessionToken\(request\)/)
  assert.match(code, /fetchAuthorizedBytes\(access\.previewUrl/)
  assert.match(code, /readOAPreviewBundle/)
  assert.match(code, /buildReviewedManifest/)
  assert.match(code, /validateTemplateManifest/)
  assert.match(code, /persistAnalysis/)
  assert.match(code, /BINDING_REQUIRED/)
  assert.match(code, /OA_PREVIEW_ANALYZER_VERSION/)
  assert.match(code, /512 \* 1024/)
  assert.doesNotMatch(code, /body\.(?:partName|path|contextHash|sourceUrl|previewUrl|storageId)/)
  assert.doesNotMatch(code, /sessionToken\s*\?/)
})

test("route failures distinguish auth, missing data, conflicts, invalid input, and internal errors", async () => {
  const routes = await Promise.all([
    source("src/app/api/oa/document-templates/analyze/route.ts"),
    source("src/app/api/oa/document-templates/[versionId]/preview/route.ts"),
    source("src/app/api/oa/document-templates/[versionId]/preview/pages/[page]/route.ts"),
    source("src/app/api/oa/document-templates/[versionId]/review/route.ts"),
  ])
  const joined = routes.join("\n")
  for (const status of [401, 404, 409, 422, 500]) assert.match(joined, new RegExp(`status:\\s*${status}`))
  assert.match(joined, /OA_DOCUMENT_ERROR|OADocumentRouteError/)
})

test("compile continues to use the persisted authorized manifest", async () => {
  const code = await source("src/app/api/oa/document-templates/compile/route.ts")
  assert.match(code, /access\.manifest/)
  assert.doesNotMatch(code, /body\.(?:manifest|fields|anchors|suggestions)/)
})

test("server access bounds downloads and creates only authorized derived targets", async () => {
  const code = await source("src/lib/server/oa-document-access.ts")
  assert.match(code, /getProcessingAccess/)
  assert.match(code, /getExportAccess/)
  assert.match(code, /generateDerivedUploadUrl/)
  assert.match(code, /reader\.cancel/)
  assert.match(code, /sha256/)
  assert.match(code, /redirect: "error"/)
  assert.match(code, /getOADocumentServiceToken/)
  assert.match(code, /reader\.read\(\)/)
  assert.match(code, /reader\.cancel\(\)/)
  const exportStart = code.indexOf("export async function exportAccess")
  const exportEnd = code.indexOf("function assertAuthorizedObjectUrl", exportStart)
  assert.match(code.slice(exportStart, exportEnd), /serviceToken: getOADocumentServiceToken\(\)/)
})
