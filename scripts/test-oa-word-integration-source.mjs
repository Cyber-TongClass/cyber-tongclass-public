import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const source = (relativePath) => readFile(path.join(root, relativePath), "utf8")

test("Word template hooks keep session tokens inside the canonical API layer", async () => {
  const code = await source("src/lib/api.ts")
  for (const reference of [
    "oaDocumentTemplates:generateSourceUploadUrl",
    "oaDocumentTemplates:createOrGetVersion",
    "oaDocumentTemplates:getManageVersion",
    "oaDocumentTemplates:saveAnalysis",
    "oaDocumentTemplates:activateCompiledVersion",
  ]) assert.match(code, new RegExp(reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  for (const hook of [
    "useGenerateOADocumentTemplateSourceUploadUrl",
    "useCreateOrGetOADocumentTemplateVersion",
    "useOADocumentTemplateVersion",
    "useSaveOADocumentTemplateReview",
    "useActivateOADocumentTemplateVersion",
  ]) assert.match(code, new RegExp(`export function ${hook}`))
})

test("document-template controller uploads, hashes, analyzes, reviews, compiles, and merges fields", async () => {
  const code = await source("src/app/forms/manage/[id]/document-template/page.tsx")
  assert.match(code, /\.docx.*\.doc/s)
  assert.match(code, /SHA-256/)
  assert.match(code, /uploadFileToStorageTarget/)
  assert.match(code, /\/api\/oa\/document-templates\/analyze/)
  assert.match(code, /\/api\/oa\/document-templates\/compile/)
  assert.match(code, /Authorization.*Bearer/)
  assert.match(code, /versionId/)
  assert.match(code, /useSaveOADocumentTemplateReview/)
  assert.match(code, /mergeDocumentManifestFields/)
  assert.doesNotMatch(code, /sourceUrl|templateUrl|answers/)
})

test("existing form management links to the original Word template workbench", async () => {
  const [editor, list] = await Promise.all([
    source("src/app/forms/manage/form-editor.tsx"),
    source("src/app/forms/manage/page.tsx"),
  ])
  for (const code of [editor, list]) {
    assert.match(code, /\/document-template/)
    assert.match(code, /从 Word 导入|原格式模板/)
  }
})

test("manager and submitter surfaces expose authorized document exports", async () => {
  const [actions, manager, submitter] = await Promise.all([
    source("src/components/oa-documents/oa-document-export-actions.tsx"),
    source("src/app/forms/manage/form-editor.tsx"),
    source("src/app/services/oa/submissions/[id]/page.tsx"),
  ])
  assert.match(actions, /Authorization.*Bearer/)
  assert.match(actions, /\/api\/oa\/forms\/.*\/exports/)
  assert.match(actions, /\/api\/oa\/submissions\/.*\/document/)
  for (const format of ["csv", "xlsx", "word", "original", "pdf", "docx"]) {
    assert.match(actions, new RegExp(`\"${format}\"`))
  }
  assert.match(manager, /selectedSubmissionIds/)
  assert.match(manager, /OADocumentBatchExportActions/)
  assert.match(submitter, /OADocumentSingleExportActions/)
})

test("reviewed manifest conversion blocks unresolved work and preserves existing fields", () => {
  const output = path.join(mkdtempSync(path.join(tmpdir(), "oa-word-client-")), "client.cjs")
  execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
    path.join(root, "src/lib/oa-document-template-client.ts"),
    "--bundle", "--platform=node", "--format=cjs", `--outfile=${output}`,
  ])
  const client = createRequire(import.meta.url)(output)
  const manifest = {
    syntaxVersion: 1,
    compilerVersion: "aia-ooxml-1",
    fields: [],
    anchors: [],
    suggestions: [
      {
        id: "region_name", kind: "table_cell", label: "姓名", inferredAnswerType: "text",
        confidence: "high", reviewState: "confirmed", evidence: [], conflictIds: [], fieldId: "name",
        partName: "word/document.xml", path: "/document/body[1]/tbl[1]/tr[1]/tc[2]", contextHash: "abc",
        required: true, maxLength: 40,
      },
      {
        id: "region_pending", kind: "underline", label: "单位", inferredAnswerType: "text",
        confidence: "medium", reviewState: "unresolved", evidence: [], conflictIds: [],
        partName: "word/document.xml", path: "/document/body[1]/p[2]", contextHash: "def",
      },
    ],
  }
  assert.equal(client.hasBlockingDocumentReview(manifest), true)
  assert.throws(() => client.buildReviewedDocumentManifest(manifest), /待确认|冲突/)

  manifest.suggestions[1].reviewState = "ignored"
  const reviewed = client.buildReviewedDocumentManifest(manifest)
  assert.equal(reviewed.fields.length, 1)
  assert.equal(reviewed.anchors.length, 1)
  assert.deepEqual(reviewed.anchors[0].output, { mode: "replace", multiline: false })
  const existing = [{ id: "legacy", type: "text", label: "保留字段" }, { id: "name", type: "text", label: "旧姓名", helpText: "保留说明" }]
  assert.deepEqual(client.mergeDocumentManifestFields(existing, reviewed), [
    existing[0],
    {
      ...existing[1], label: "姓名", required: true, maxLength: 40,
      documentOutput: { mode: "replace", multiline: false },
    },
  ])
})
