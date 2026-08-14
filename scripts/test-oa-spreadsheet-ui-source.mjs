import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const root = new URL("../", import.meta.url)
const source = (path) => readFile(new URL(path, root), "utf8")

test("XLSX importer analyzes the raw file with bearer auth and previews sheets and columns", async () => {
  const code = await source("src/components/oa-spreadsheets/oa-spreadsheet-new-form-import.tsx")
  assert.match(code, /accept="\.xlsx"/)
  assert.match(code, /\/api\/oa\/spreadsheets\/analyze/)
  assert.match(code, /Authorization:\s*`Bearer \$\{sessionToken\}`/)
  assert.match(code, /x-oa-file-name/)
  assert.match(code, /response\.json\(\)/)
  assert.match(code, /sheet\.columns/)
  assert.match(code, /工作表/)
  assert.match(code, /识别到.*表头/s)
})

test("XLSX importer creates creator-only drafts in both approved modes", async () => {
  const code = await source("src/components/oa-spreadsheets/oa-spreadsheet-new-form-import.tsx")
  assert.match(code, /createSpreadsheetImportDraftPayload/)
  assert.match(code, /"table"/)
  assert.match(code, /"fields"/)
  assert.match(code, /生成多行表格/)
  assert.match(code, /每个表头生成一个问题/)
  assert.match(code, /useManageUpsertOAForm/)
  assert.match(code, /router\.push\(`\/forms\/manage\/\$\{formId\}`\)/)
})

test("new form editor offers Word, XLSX, and manual creation paths", async () => {
  const code = await source("src/app/forms/manage/form-editor.tsx")
  assert.match(code, /OADocumentNewFormImport/)
  assert.match(code, /OASpreadsheetNewFormImport/)
  assert.match(code, /从 Excel 表头自动生成表单/)
  assert.match(code, /或手动创建/)
})
