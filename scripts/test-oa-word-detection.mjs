import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const outDir = mkdtempSync(path.join(tmpdir(), "oa-word-detect-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/server/oa-word-detection.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outdir=${outDir}`,
])
const require = createRequire(import.meta.url)
const detection = require(path.join(outDir, "oa-word-detection.js"))
const { buildSimpleZip } = require(path.join(root, "src/lib/server/simple-zip.ts"))

const contentTypes = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
const rootRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
function docx(xml, extras = []) {
  return buildSimpleZip([{ name: "[Content_Types].xml", data: contentTypes }, { name: "_rels/.rels", data: rootRels }, { name: "word/document.xml", data: xml }, ...extras])
}

test("detects deterministic structural regions using namespace-tolerant traversal", () => {
  const xml = readFileSync(path.join(root, "scripts/fixtures/oa-word/docx/structural-regions.xml"), "utf8")
  const one = detection.detectWordFormRegions(docx(xml))
  const two = detection.detectWordFormRegions(docx(xml))
  assert.equal(JSON.stringify(one), JSON.stringify(two))
  assert.ok(one.some((item) => item.kind === "table_cell" && item.label === "姓名" && item.reviewState === "confirmed"))
  assert.ok(one.some((item) => item.kind === "underline"))
  assert.ok(one.some((item) => item.kind === "radio_group" && item.options.length === 3))
  assert.ok(one.some((item) => item.label.includes("说明") && item.maxLength === 200))
  assert.ok(one.some((item) => item.kind === "bookmark"))
  assert.ok(one.some((item) => item.kind === "content_control" && item.fieldId === "existing"))
  for (const item of one) {
    assert.match(item.partName, /^word\//)
    assert.match(item.path, /^\/[a-z]+\[\d+\]/)
    assert.match(item.contextHash, /^[a-f0-9]{16}$/)
    assert.ok(item.evidence.length)
  }
})

test("detects repeat rows and conflicts without guessing", () => {
  const repeatXml = readFileSync(path.join(root, "scripts/fixtures/oa-word/docx/repeat-row.xml"), "utf8")
  const repeat = detection.detectWordFormRegions(docx(repeatXml))
  const row = repeat.find((item) => item.kind === "repeat_row")
  assert.ok(row)
  assert.equal(row.reviewState, "unresolved")
  assert.match(row.path, /tr\[2\]$/)

  const ambiguous = repeatXml.replace("<w:p/>", `<w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>____</w:t></w:r></w:p>`)
  const overlaps = detection.detectWordFormRegions(docx(ambiguous))
  assert.ok(overlaps.some((item) => item.reviewState === "conflict" && item.conflictIds.length > 0))
})

test("includes headers and footers in deterministic part order", () => {
  const xml = readFileSync(path.join(root, "scripts/fixtures/oa-word/docx/structural-regions.xml"), "utf8")
  const header = xml.replace("w:document", "w:hdr").replace("w:body", "w:p").replace("</w:body>", "</w:p>").replace("</w:document>", "</w:hdr>")
  const items = detection.detectWordFormRegions(docx(xml, [{ name: "word/header2.xml", data: header }]))
  const documentLast = items.map((x) => x.partName).lastIndexOf("word/document.xml")
  const headerFirst = items.map((x) => x.partName).indexOf("word/header2.xml")
  assert.ok(headerFirst > documentLast)
})

test("attaches only unique server-issued PDF binding candidates", () => {
  const xml = readFileSync(path.join(root, "scripts/fixtures/oa-word/docx/structural-regions.xml"), "utf8")
  const source = docx(xml)
  const initial = detection.detectWordFormRegions(source)
  const name = initial.find((item) => item.kind === "table_cell" && item.label === "姓名")
  assert.ok(name)
  const visual = { page: 1, x: 0.2, y: 0.3, width: 0.2, height: 0.04, pageWidth: 600, pageHeight: 800, rotation: 0, coordinateSpace: "normalized-pdf" }
  const binding = { id: "binding_unique", label: name.label, description: "table cell", partName: name.partName, path: name.path, contextHash: name.contextHash, writeTarget: "table-cell", visual }
  const attached = detection.detectWordFormRegions(source, [binding])
  const mapped = attached.find((item) => item.id === name.id)
  assert.deepEqual(mapped.visual, visual)
  assert.deepEqual(mapped.bindingCandidateIds, ["binding_unique"])
  assert.equal(mapped.reviewState, "confirmed")
  assert.ok(attached.filter((item) => item.id !== name.id).every((item) => item.reviewState !== "confirmed"))

  const ambiguous = detection.detectWordFormRegions(source, [binding, { ...binding, id: "binding_other" }]).find((item) => item.id === name.id)
  assert.equal(ambiguous.reviewState, "conflict")
  assert.equal(ambiguous.visual, undefined)
  assert.deepEqual(ambiguous.bindingCandidateIds, ["binding_other", "binding_unique"])
})

test("emits and attaches paragraph-after narratives without requiring a trailing colon", () => {
  const narrativeXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>主要做法（不超过200字）</w:t></w:r></w:p><w:p/></w:body></w:document>`
  const source = docx(narrativeXml)
  const initial = detection.detectWordFormRegions(source)
  const narrative = initial.find((item) => item.kind === "label_blank" && item.label === "主要做法")
  assert.ok(narrative)
  assert.equal(narrative.inferredAnswerType, "textarea")
  assert.equal(narrative.maxLength, 200)
  assert.equal(narrative.reviewState, "unresolved")

  const visual = { page: 1, x: 0.1, y: 0.2, width: 0.8, height: 0.1, pageWidth: 600, pageHeight: 800, rotation: 0, coordinateSpace: "normalized-pdf" }
  const binding = { id: "binding_narrative", label: narrative.label, description: "paragraph after", partName: narrative.partName, path: narrative.path, contextHash: narrative.contextHash, writeTarget: "paragraph-after", visual }
  const attached = detection.detectWordFormRegions(source, [binding]).find((item) => item.label === "主要做法")
  assert.equal(attached.reviewState, "confirmed")
  assert.deepEqual(attached.bindingCandidateIds, ["binding_narrative"])
  assert.deepEqual(attached.visual, visual)
})

test("detects complete structured questions without turning Word instructions into placeholders", () => {
  const completeXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>方向</w:t></w:r></w:p></w:tc><w:tc>
        <w:p><w:r><w:t>一、政策创新</w:t></w:r></w:p><w:p><w:r><w:t>□场景开放 □要素联动 □其他</w:t></w:r></w:p>
        <w:p><w:r><w:t>二、应用拓展</w:t></w:r></w:p><w:p><w:r><w:t>□科学技术 □其他</w:t></w:r></w:p>
      </w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>案例简介</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>简述基本概况和创新点，不超过500字</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:tcPr><w:gridSpan w:val="6"/></w:tcPr><w:p><w:r><w:t>联合实施单位信息（不超过3家）</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>联系人</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc><w:tc><w:p><w:r><w:t>职务</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc><w:tc><w:p><w:r><w:t>联系方式</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:t>一、基本概况</w:t></w:r></w:p><w:p><w:r><w:t>阐述案例痛点。（300字以内）</w:t></w:r></w:p>
    <w:p><w:r><w:t>二、主要做法</w:t></w:r></w:p><w:p><w:r><w:t>阐述技术路线。（1800字以内）</w:t></w:r></w:p>
    <w:p><w:r><w:t>三、应用成效</w:t></w:r></w:p><w:p><w:r><w:t>阐述应用实效。（600字以内）</w:t></w:r></w:p>
    <w:p><w:r><w:t>四、创新点</w:t></w:r></w:p><w:p><w:r><w:t>总结创新亮点。（300字以内）</w:t></w:r></w:p>
    <w:p><w:r><w:t>相关佐证材料</w:t></w:r></w:p><w:p><w:r><w:t>包括检测报告、用户报告等材料。</w:t></w:r></w:p>
  </w:body></w:document>`
  const items = detection.detectWordFormRegions(docx(completeXml))
  const direction = items.filter((item) => item.label === "方向")
  assert.equal(direction.length, 1)
  assert.equal(direction[0].inferredAnswerType, "multiple_choice")
  assert.deepEqual(direction[0].options, ["场景开放", "要素联动", "政策创新 · 其他", "科学技术", "应用拓展 · 其他"])
  const introduction = items.find((item) => item.label === "案例简介")
  assert.equal(introduction.inferredAnswerType, "textarea")
  assert.equal(introduction.maxLength, 500)
  assert.equal(introduction.placeholder, undefined)
  for (const [label, maxLength] of [["基本概况", 300], ["主要做法", 1800], ["应用成效", 600], ["创新点", 300]]) {
    const item = items.find((candidate) => candidate.label === label)
    assert.ok(item, label)
    assert.equal(item.maxLength, maxLength)
    assert.equal(item.placeholder, undefined)
  }
  assert.equal(items.find((item) => item.label === "相关佐证材料").inferredAnswerType, "file")
  assert.ok(items.some((item) => item.label === "联合实施单位信息 · 联系人 · 职务"))
  assert.ok(items.some((item) => item.label === "联合实施单位信息 · 联系人 · 联系方式"))
  assert.equal(items.some((item) => item.label === "基本概况" && item.path.includes("tbl")), false)
})
