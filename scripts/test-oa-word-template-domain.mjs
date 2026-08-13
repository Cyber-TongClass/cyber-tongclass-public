import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const out = path.join(mkdtempSync(path.join(tmpdir(), "oa-word-domain-")), "domain.cjs")
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/oa-document-templates.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outfile=${out}`,
])
const domain = createRequire(import.meta.url)(out)

test("recognizes only matching Word filenames, MIME types, and signatures", () => {
  const docx = Buffer.from("PK\x03\x04hello", "binary")
  const doc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  assert.equal(domain.normalizeWordSourceType(domain.DOCX_MIME, "表格.docx", docx), "docx")
  assert.equal(domain.normalizeWordSourceType(domain.DOC_MIME, "表格.doc", doc), "doc")
  assert.throws(() => domain.normalizeWordSourceType(domain.DOC_MIME, "表格.docx", docx), /不一致/)
  assert.throws(() => domain.normalizeWordSourceType(domain.DOCX_MIME, "表格.docx", doc), /签名/)
  assert.throws(() => domain.normalizeWordSourceType("text/plain", "表格.docx", docx), /MIME/)
  assert.throws(() => domain.normalizeWordSourceType(domain.DOCX_MIME, "../表格.docx", docx), /文件名/)
})

test("publishes explicit processing and batch limits", () => {
  assert.deepEqual(domain.OA_DOCUMENT_LIMITS, {
    maxSourceBytes: 25 * 1024 * 1024,
    maxZipEntries: 5000,
    maxExtractedBytes: 200 * 1024 * 1024,
    maxXmlPartBytes: 10 * 1024 * 1024,
    maxCompressionRatio: 100,
    maxDetectedRegions: 500,
    maxSelectedSubmissions: 100,
  })
  assert.throws(() => domain.assertWordSourceSize(0), /不能为空/)
  assert.throws(() => domain.assertWordSourceSize(25 * 1024 * 1024 + 1), /25 MiB/)
})

test("counts review states and treats conflicts as unresolved", () => {
  const suggestions = [
    { id: "a", reviewState: "confirmed", conflictIds: [] },
    { id: "b", reviewState: "unresolved", conflictIds: [] },
    { id: "c", reviewState: "ignored", conflictIds: [] },
    { id: "d", reviewState: "conflict", conflictIds: ["b"] },
  ]
  assert.deepEqual(domain.countTemplateReviewStates(suggestions), {
    confirmed: 1,
    unresolved: 2,
    ignored: 1,
    deleted: 0,
    conflicts: 1,
  })
})

test("validates stable, unique manifest fields and anchor natural keys", () => {
  const anchor = {
    fieldId: "contact_email",
    partName: "word/document.xml",
    kind: "table_cell",
    path: "body/tbl[0]/tr[1]/tc[1]",
    contextHash: "sha256:abc",
    output: { mode: "replace", multiline: false },
  }
  const manifest = {
    syntaxVersion: 1,
    compilerVersion: "oa-word-v1",
    fields: [{ fieldId: "contact_email", label: "联系邮箱", answerType: "email", required: true, maxLength: 200 }],
    anchors: [anchor],
    suggestions: [],
  }
  assert.equal(domain.anchorNaturalKey(anchor), "word/document.xml|table_cell|body/tbl[0]/tr[1]/tc[1]|sha256:abc")
  assert.doesNotThrow(() => domain.validateTemplateManifest(manifest))
  assert.throws(() => domain.validateTemplateManifest({ ...manifest, anchors: [anchor, { ...anchor }] }), /锚点.*重复/)
  assert.throws(() => domain.validateTemplateManifest({ ...manifest, fields: [...manifest.fields, { ...manifest.fields[0] }] }), /字段.*重复/)
  assert.throws(() => domain.validateTemplateManifest({ ...manifest, fields: [{ ...manifest.fields[0], maxLength: 0 }] }), /maxLength/)
  assert.throws(() => domain.validateTemplateManifest({ ...manifest, anchors: [{ ...anchor, fieldId: "missing" }] }), /不存在的字段/)
})

test("derives deterministic safe field IDs", () => {
  assert.equal(domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"), domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"))
  assert.match(domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"), /^field_[a-z0-9_]+_[0-9a-f]{8}$/)
  assert.notEqual(domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"), domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[3]"))
})
