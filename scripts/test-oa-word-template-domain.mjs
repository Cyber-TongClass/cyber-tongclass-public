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

test("validates table fields with safe deterministic columns", () => {
  const tableField = {
    fieldId: "education_rows",
    label: "主要教育经历",
    answerType: "table",
    required: false,
    columns: [
      { id: "column_1", label: "起止年月", type: "text", required: true },
      { id: "column_2", label: "学校名称", type: "text" },
      { id: "column_3", label: "学位", type: "text" },
    ],
  }
  const manifest = { syntaxVersion: 1, compilerVersion: "test", fields: [tableField], anchors: [], suggestions: [] }
  assert.doesNotThrow(() => domain.validateTemplateManifest(manifest))
  assert.throws(() => domain.validateTemplateManifest({ ...manifest, fields: [{ ...tableField, columns: [] }] }), /表格字段.*列/)
  assert.throws(() => domain.validateTemplateManifest({ ...manifest, fields: [{ ...tableField, columns: [{ id: "bad id", label: "列", type: "text" }] }] }), /表格列 ID/)
})

const visual = {
  page: 4,
  x: 0.12,
  y: 0.34,
  width: 0.76,
  height: 0.18,
  pageWidth: 595.28,
  pageHeight: 841.89,
  rotation: 0,
  coordinateSpace: "normalized-pdf",
}

const structural = {
  partName: "word/document.xml",
  path: "/document/body[1]/p[7]",
  contextHash: "sha256:abc",
  writeTarget: "paragraph-after",
  styleSourcePath: "/document/body[1]/p[7]",
}

function versionTwoManifest() {
  return {
    syntaxVersion: 2,
    compilerVersion: "oa-word-v2",
    fields: [{ fieldId: "main_practice", label: "主要做法", answerType: "textarea", required: true }],
    anchors: [{
      fieldId: "main_practice",
      kind: "label_blank",
      partName: structural.partName,
      path: structural.path,
      contextHash: structural.contextHash,
      output: { mode: "append", multiline: true },
      visual,
      bindingCandidateId: "candidate_main_practice",
      structural,
    }],
    suggestions: [{
      id: "suggestion_main_practice",
      kind: "label_blank",
      label: "主要做法",
      inferredAnswerType: "textarea",
      confidence: "high",
      reviewState: "confirmed",
      evidence: ["instruction paragraph"],
      conflictIds: [],
      fieldId: "main_practice",
      partName: structural.partName,
      path: structural.path,
      contextHash: structural.contextHash,
      visual,
      bindingCandidateIds: ["candidate_main_practice"],
    }],
  }
}

test("validates version-two visual and structural anchors while preserving version one", () => {
  const withManualPlaceholder = versionTwoManifest()
  withManualPlaceholder.fields[0].placeholder = "请概述案例实施过程"
  withManualPlaceholder.suggestions[0].placeholder = "请概述案例实施过程"
  assert.doesNotThrow(() => domain.validateTemplateManifest(withManualPlaceholder))

  const legacy = versionTwoManifest()
  legacy.syntaxVersion = 1
  legacy.anchors = legacy.anchors.map(({ visual: _visual, bindingCandidateId: _candidate, structural: _structural, ...anchor }) => anchor)
  legacy.suggestions = []
  assert.doesNotThrow(() => domain.validateTemplateManifest(legacy))
})

test("bounds manual web placeholders without requiring or deriving them", () => {
  const absent = versionTwoManifest()
  assert.equal(absent.fields[0].placeholder, undefined)
  assert.equal(absent.suggestions[0].placeholder, undefined)
  assert.doesNotThrow(() => domain.validateTemplateManifest(absent))

  for (const placeholder of ["", " ", "x".repeat(501), "不安全\0提示"]) {
    const invalidField = versionTwoManifest()
    invalidField.fields[0].placeholder = placeholder
    assert.throws(() => domain.validateTemplateManifest(invalidField), /placeholder|提示文字/)

    const invalidSuggestion = versionTwoManifest()
    invalidSuggestion.suggestions[0].placeholder = placeholder
    assert.throws(() => domain.validateTemplateManifest(invalidSuggestion), /placeholder|提示文字/)
  }
})

test("rejects invalid version-two visual geometry", () => {
  for (const invalidVisual of [
    { ...visual, page: 0 },
    { ...visual, x: Number.NaN },
    { ...visual, pageWidth: Number.POSITIVE_INFINITY },
    { ...visual, x: 0.8, width: 0.3 },
    { ...visual, y: -0.01 },
    { ...visual, rotation: 45 },
  ]) {
    const manifest = versionTwoManifest()
    manifest.anchors[0] = { ...manifest.anchors[0], visual: invalidVisual }
    assert.throws(() => domain.validateTemplateManifest(manifest), /可视锚点/)
  }
})

test("requires both anchors and one unique candidate for every version-two field", () => {
  for (const omitted of ["visual", "bindingCandidateId", "structural"]) {
    const manifest = versionTwoManifest()
    delete manifest.anchors[0][omitted]
    assert.throws(() => domain.validateTemplateManifest(manifest), /双锚点/)
  }

  const withoutConfirmedAnchor = versionTwoManifest()
  withoutConfirmedAnchor.anchors = []
  assert.throws(() => domain.validateTemplateManifest(withoutConfirmedAnchor), /字段.*恰有一个锚点/)

  const fieldWithoutSuggestionOrAnchor = versionTwoManifest()
  fieldWithoutSuggestionOrAnchor.fields.push({ fieldId: "orphan", label: "无建议字段", answerType: "text", required: false })
  assert.throws(() => domain.validateTemplateManifest(fieldWithoutSuggestionOrAnchor), /字段 orphan.*恰有一个锚点/)

  const duplicate = versionTwoManifest()
  duplicate.fields.push({ fieldId: "overview", label: "基本概况", answerType: "textarea", required: true })
  duplicate.suggestions.push({
    ...duplicate.suggestions[0],
    id: "suggestion_overview",
    fieldId: "overview",
    label: "基本概况",
    path: "/document/body[1]/p[8]",
    contextHash: "sha256:def",
  })
  duplicate.anchors.push({
    ...duplicate.anchors[0],
    fieldId: "overview",
    path: "/document/body[1]/p[8]",
    contextHash: "sha256:def",
    structural: { ...structural, path: "/document/body[1]/p[8]", contextHash: "sha256:def" },
  })
  assert.throws(() => domain.validateTemplateManifest(duplicate), /候选 ID.*重复/)
})

test("requires version-two legacy locators to mirror the structural anchor", () => {
  for (const [property, value] of [
    ["partName", "word/header1.xml"],
    ["path", "/document/body[1]/p[99]"],
    ["contextHash", "sha256:different"],
  ]) {
    const manifest = versionTwoManifest()
    manifest.anchors[0] = { ...manifest.anchors[0], [property]: value }
    assert.throws(() => domain.validateTemplateManifest(manifest), /顶层结构定位.*一致/)
  }
})

test("binds each confirmed suggestion candidate to its corresponding field anchor", () => {
  const missingCandidateList = versionTwoManifest()
  delete missingCandidateList.suggestions[0].bindingCandidateIds
  assert.throws(() => domain.validateTemplateManifest(missingCandidateList), /已确认建议.*候选 ID/)

  const wrongCandidate = versionTwoManifest()
  wrongCandidate.suggestions[0].bindingCandidateIds = ["candidate_other_field"]
  assert.throws(() => domain.validateTemplateManifest(wrongCandidate), /已确认建议.*候选 ID/)

  const wrongField = versionTwoManifest()
  wrongField.fields.push({ fieldId: "overview", label: "基本概况", answerType: "textarea", required: true })
  wrongField.anchors.push({
    ...wrongField.anchors[0],
    fieldId: "overview",
    partName: "word/header1.xml",
    path: "/hdr[1]/p[1]",
    contextHash: "sha256:overview",
    bindingCandidateId: "candidate_overview",
    structural: {
      ...wrongField.anchors[0].structural,
      partName: "word/header1.xml",
      path: "/hdr[1]/p[1]",
      contextHash: "sha256:overview",
    },
  })
  wrongField.suggestions[0].fieldId = "overview"
  assert.throws(() => domain.validateTemplateManifest(wrongField), /已确认建议.*候选 ID/)
})

test("requires safe unique suggestion IDs", () => {
  const invalidId = versionTwoManifest()
  invalidId.suggestions[0].id = "invalid suggestion id"
  assert.throws(() => domain.validateTemplateManifest(invalidId), /建议 ID.*无效/)

  const duplicateId = versionTwoManifest()
  duplicateId.suggestions.push({ ...duplicateId.suggestions[0] })
  assert.throws(() => domain.validateTemplateManifest(duplicateId), /建议 ID.*重复/)
})

test("derives deterministic safe field IDs", () => {
  assert.equal(domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"), domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"))
  assert.match(domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"), /^field_[a-z0-9_]+_[0-9a-f]{8}$/)
  assert.notEqual(domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[2]"), domain.createStableDocumentFieldId("联系 邮箱", "word/document.xml|p[3]"))
})
