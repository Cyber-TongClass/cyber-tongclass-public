import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const page = await readFile("src/app/forms/manage/[id]/exports/page.tsx", "utf8").catch(() => "")
const center = await readFile("src/components/oa/oa-form-export-center.tsx", "utf8").catch(() => "")
const manage = await readFile("src/app/forms/manage/page.tsx", "utf8")
const detail = await readFile("src/app/services/oa/submissions/[id]/page.tsx", "utf8")
const route = await readFile("src/app/api/oa/forms/[formId]/exports/route.ts", "utf8")

test("management list links to a dedicated export center", () => {
  assert.match(manage, /\/forms\/manage\/\$\{form\._id\}\/exports/)
  assert.match(page, /OAFormExportCenter/)
})

test("export center selects submissions and fields and offers individual downloads", () => {
  assert.match(center, /选择申请/)
  assert.match(center, /选择汇总字段/)
  assert.match(center, /OADocumentBatchExportActions/)
  assert.match(center, /OADocumentSingleExportActions/)
  assert.match(center, /fieldIds/)
})

test("all owned submission details expose a download link even without a template", () => {
  assert.match(detail, /<OADocumentSingleExportActions submissionId=\{submission\._id\}/)
  assert.doesNotMatch(detail, /documentTemplateVersionId\s*\?\s*<OADocumentSingleExportActions/)
})

test("batch export accepts a bounded selected field list", () => {
  assert.match(route, /selectedFieldIds/)
  assert.match(route, /fieldIds/)
  assert.match(route, /buildXlsxArtifact\(accesses, selectedFieldIds\)/)
})
