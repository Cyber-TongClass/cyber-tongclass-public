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
