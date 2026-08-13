import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const root = new URL("../", import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), "utf8")
}

test("Word template backend exposes the immutable version lifecycle", async () => {
  const code = await source("convex/oaDocumentTemplates.ts")
  for (const name of [
    "generateSourceUploadUrl",
    "generateDerivedUploadUrl",
    "createOrGetVersion",
    "getManageVersion",
    "saveAnalysis",
    "activateCompiledVersion",
    "getProcessingAccess",
    "getExportAccess",
  ]) assert.match(code, new RegExp(`export const ${name} =`))
  assert.match(code, /withIndex\("by_naturalKey"/)
  assert.match(code, /activeDocumentTemplateVersionId/)
  assert.match(code, /oa-form-template-derived/)
  assert.match(code, /item\?\.reviewState === "unresolved"/)
  assert.match(code, /item\.conflictIds\.length > 0/)
  assert.doesNotMatch(code, /actor\.role === "admin"\s*\|\|\s*actor\.role === "super_admin"/)
  assert.match(code, /actor\.role === "super_admin"\s*\|\|\s*String\(form\.createdBy\) === String\(actor\._id\)/)
  const processingStart = code.indexOf("export const getProcessingAccess =")
  const processingEnd = code.indexOf("export const getExportAccess =", processingStart)
  const processing = code.slice(processingStart, processingEnd)
  assert.match(processing, /serviceToken: v\.string\(\)/)
  assert.match(processing, /requireOADocumentServiceToken\(args\.serviceToken\)/)
  assert.match(processing, /version\.previewStorageId/)
  assert.match(processing, /getR2DownloadUrl\(version\.previewStorageId\)/)
  assert.match(processing, /previewUrl/)
  assert.match(processing, /workingUrl/)
  assert.match(code, /args\.previewStorageId !== undefined/)
  assert.match(code, /requireOADocumentServiceToken\(args\.serviceToken\)/)
  assert.match(code, /r2StorageIdMatches\(storageId/)
  const activationStart = code.indexOf("export const activateCompiledVersion =")
  const activationEnd = code.indexOf("export const getProcessingAccess =", activationStart)
  const activation = code.slice(activationStart, activationEnd)
  assert.match(activation, /requireOADocumentServiceToken\(args\.serviceToken\)/)
  assert.match(activation, /!args\.compiledStorageId\.startsWith\("r2:"\)/)

  const derivedStart = code.indexOf("export const generateDerivedUploadUrl =")
  const derivedEnd = code.indexOf("export const createOrGetVersion =", derivedStart)
  const derived = code.slice(derivedStart, derivedEnd)
  assert.match(derived, /serviceToken: v\.string\(\)/)
  assert.match(derived, /requireOADocumentServiceToken\(args\.serviceToken\)/)

  const exportStart = code.indexOf("export const getExportAccess =")
  const exportAccess = code.slice(exportStart)
  assert.match(exportAccess, /serviceToken: v\.string\(\)/)
  assert.match(exportAccess, /requireOADocumentServiceToken\(args\.serviceToken\)/)
  assert.doesNotMatch(exportAccess, /sourceUrl/)
})

test("OA submissions snapshot the active document template version", async () => {
  const code = await source("convex/oaForms.ts")
  assert.match(code, /documentTemplateVersionId: form\.activeDocumentTemplateVersionId/)
  assert.match(code, /function assertNotSystemManagedForm/)
  assert.match(code, /系统表单只能在对应的专用管理页面中配置/)
})

test("schema stores document template versions without requiring legacy rows", async () => {
  const code = await source("convex/schema.ts")
  assert.match(code, /activeDocumentTemplateVersionId: v\.optional\(v\.id\("oaDocumentTemplateVersions"\)\)/)
  assert.match(code, /documentTemplateVersionId: v\.optional\(v\.id\("oaDocumentTemplateVersions"\)\)/)
  assert.match(code, /oaDocumentTemplateVersions: defineTable/)
  assert.match(code, /\.index\("by_naturalKey", \["naturalKey"\]\)/)
})
