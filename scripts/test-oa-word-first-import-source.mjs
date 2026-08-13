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

test("Word-first draft is private, titled from the file, and uses one removable placeholder", () => {
  const output = path.join(mkdtempSync(path.join(tmpdir(), "oa-word-first-")), "flow.cjs")
  execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
    path.join(root, "src/lib/oa-word-import-flow.ts"),
    "--bundle", "--platform=node", "--format=cjs", `--outfile=${output}`,
  ])
  const flow = createRequire(import.meta.url)(output)
  const draft = flow.createWordImportDraftPayload("年度申报表.docx", "user_123", "nonce_abc")

  assert.equal(draft.title, "年度申报表")
  assert.equal(draft.status, "draft")
  assert.equal(draft.kind, "form")
  assert.deepEqual(draft.targetScope, { userIds: ["user_123"] })
  assert.equal(draft.fields.length, 1)
  assert.equal(draft.fields[0].id, flow.WORD_IMPORT_PLACEHOLDER_FIELD_ID)
  assert.match(draft.slug, /^word-import-nonce-abc-/)

  const realField = { id: "applicant_name", type: "text", label: "姓名" }
  assert.deepEqual(
    flow.withoutWordImportPlaceholder([draft.fields[0], realField]),
    [realField],
  )
})

test("new-form editor offers Word import before the ordinary manual builder", async () => {
  const [editor, launcher] = await Promise.all([
    source("src/app/forms/manage/form-editor.tsx"),
    source("src/components/oa-documents/oa-document-new-form-import.tsx"),
  ])
  assert.match(editor, /OADocumentNewFormImport/)
  assert.match(editor, /!form[\s\S]*OADocumentNewFormImport/)
  assert.match(editor, /OADocumentNewFormImport creatorId=\{currentUserId\}[\s\S]*form-scope-title/)
  assert.match(editor, /OADocumentNewFormImport[\s\S]*OAFormBuilder/)
  assert.doesNotMatch(editor, /保存新表单后，即可导入/)
  assert.match(launcher, /useManageUpsertOAForm/)
  assert.match(launcher, /useGenerateOADocumentTemplateSourceUploadUrl/)
  assert.match(launcher, /useCreateOrGetOADocumentTemplateVersion/)
  assert.match(launcher, /createWordImportDraftPayload/)
  assert.match(launcher, /\/api\/oa\/document-templates\/analyze/)
  assert.match(launcher, /document-template\?versionId=/)
})

test("document workbench opens the imported version, drops the placeholder, and returns to form setup", async () => {
  const page = await source("src/app/forms/manage/[id]/document-template/page.tsx")
  assert.match(page, /useSearchParams/)
  assert.match(page, /searchParams\.get\("versionId"\)/)
  assert.match(page, /withoutWordImportPlaceholder\(form\.fields\)/)
  assert.match(page, /router\.push\(`\/forms\/manage\/\$\{form\._id\}`\)/)
})
