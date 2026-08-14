import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const outDir = mkdtempSync(path.join(tmpdir(), "oa-word-fill-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/oa-word-fill.ts"), path.join(root, "src/lib/server/oa-word-export-data.ts"), path.join(root, "src/lib/server/oa-word-compiler.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${outDir}`])
const require = createRequire(import.meta.url)
const fill = require(path.join(outDir, "oa-word-fill.js"))
const exportData = require(path.join(outDir, "oa-word-export-data.js"))
const compiler = require(path.join(outDir, "oa-word-compiler.js"))
const { buildSimpleZip } = require(path.join(root, "src/lib/server/simple-zip.ts"))
const pkgDir = mkdtempSync(path.join(tmpdir(), "pkg-")); execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/ooxml-package.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${pkgDir}`]); const pkgModule = require(path.join(pkgDir, "ooxml-package.js"))
const types = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
function docx(body, extra = []) { return buildSimpleZip([{ name: "[Content_Types].xml", data: types }, { name: "_rels/.rels", data: rels }, { name: "word/document.xml", data: `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>` }, { name: "word/styles.xml", data: "UNCHANGED" }, ...extra]) }
function sdt(id) { return `<w:sdt><w:sdtPr><w:tag w:val="oa-field:${id}"/></w:sdtPr><w:sdtContent><w:r><w:t>old</w:t></w:r></w:sdtContent></w:sdt>` }
const fields = [
  { fieldId: "text", label: "文本", answerType: "text", required: false, maxLength: 20 },
  { fieldId: "multi", label: "多行", answerType: "textarea", required: false },
  { fieldId: "number", label: "数字", answerType: "number", required: false },
  { fieldId: "date", label: "日期", answerType: "date", required: false },
  { fieldId: "choice", label: "类别", answerType: "single_choice", required: false, options: ["甲", "乙"] },
  { fieldId: "choices", label: "多选", answerType: "multiple_choice", required: false, options: ["A", "B"] },
  { fieldId: "file", label: "附件", answerType: "file", required: false },
]

test("fills trusted scalar and multi-choice values with escaping and line breaks", () => {
  const input = docx(`<w:p>${fields.map((f) => sdt(f.fieldId)).join("")}</w:p>`)
  const output = fill.fillWordTemplate(input, { fields, answers: { text: `<A&B>`, multi: "第一行\n第二行", number: 12.5, date: "2026-08-13", choice: "乙", choices: ["A"], file: "ignored-browser-name.exe" }, fileDisplayNames: { file: "证明材料.pdf" } })
  const pkg = pkgModule.readOoxmlPackage(output.bytes)
  const xml = pkg.readText("word/document.xml")
  assert.match(xml, /&lt;A&amp;B&gt;/)
  assert.match(xml, /<w:br\/>/)
  assert.match(xml, /√ A/)
  assert.match(xml, /□ B/)
  assert.match(xml, /证明材料.pdf/)
  assert.doesNotMatch(xml, /ignored-browser-name/)
  assert.equal(pkg.readText("word/styles.xml"), "UNCHANGED")
})

test("fills styled paragraph-after narratives with Word breaks and retained formatting", () => {
  const input = docx(`<w:p><w:pPr><w:pStyle w:val="Narrative"/><w:spacing w:line="360"/></w:pPr><w:sdt><w:sdtPr><w:tag w:val="oa-field:multi"/></w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:eastAsia="宋体"/><w:sz w:val="24"/></w:rPr><w:t> </w:t></w:r></w:sdtContent></w:sdt></w:p>`)
  const output = fill.fillWordTemplate(input, { fields, answers: { multi: "第一段\n第二段" } })
  const xml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(xml, /<w:pPr><w:pStyle w:val="Narrative"\/><w:spacing w:line="360"\/><\/w:pPr>/)
  assert.match(xml, /第一段/)
  assert.match(xml, /<w:r><w:rPr><w:rFonts w:eastAsia="宋体"\/><w:sz w:val="24"\/><\/w:rPr><w:br\/><\/w:r>/)
  assert.match(xml, /第二段/)
  assert.equal((xml.match(/<w:rFonts w:eastAsia="宋体"\/>/g) || []).length, 3)
})

test("marks only selected option-level choice targets and preserves option text and marker style", () => {
  const choice = fields.find((field) => field.fieldId === "choice")
  const input = docx(`<w:p><w:r><w:t>类别：</w:t></w:r><w:sdt><w:sdtPr><w:tag w:val="oa-choice:choice:0"/></w:sdtPr><w:sdtContent><w:r><w:rPr><w:color w:val="2468AC"/></w:rPr><w:t>□</w:t></w:r></w:sdtContent></w:sdt><w:r><w:t>甲</w:t></w:r><w:sdt><w:sdtPr><w:tag w:val="oa-choice:choice:1"/></w:sdtPr><w:sdtContent><w:r><w:rPr><w:color w:val="2468AC"/></w:rPr><w:t>□</w:t></w:r></w:sdtContent></w:sdt><w:r><w:t>乙</w:t></w:r></w:p>`)
  const output = fill.fillWordTemplate(input, { fields: [choice], answers: { choice: "乙" } })
  const xml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(xml, /oa-choice:choice:0[\s\S]*?<w:t>□<\/w:t>/)
  assert.match(xml, /oa-choice:choice:1[\s\S]*?<w:t>√<\/w:t>/)
  assert.match(xml, /<w:r><w:t>甲<\/w:t><\/w:r>/)
  assert.match(xml, /<w:r><w:t>乙<\/w:t><\/w:r>/)
  assert.equal((xml.match(/<w:color w:val="2468AC"\/>/g) || []).length, 2)
})

test("legacy mark_choice compiles and fills only markers without replacing its paragraph", () => {
  const sourceBody = `<w:p><w:r><w:rPr><w:rFonts w:eastAsia="宋体"/></w:rPr><w:t>类型：○教学 ○科研 ○管理</w:t></w:r></w:p>`
  const input = docx(sourceBody)
  const sourceXml = pkgModule.readOoxmlPackage(input).readText("word/document.xml")
  const locator = compiler.inspectWordXmlPart(sourceXml).find((node) => node.localName === "p")
  const field = { fieldId: "legacy_choice", label: "类型", answerType: "single_choice", required: true, options: ["教学", "科研", "管理"] }
  const manifest = {
    syntaxVersion: 1,
    compilerVersion: "test",
    fields: [field],
    suggestions: [],
    anchors: [{ fieldId: field.fieldId, kind: "radio_group", partName: "word/document.xml", path: locator.path, contextHash: locator.contextHash, output: { mode: "mark_choice" } }],
  }

  const compiled = compiler.compileWordTemplate(input, manifest)
  const output = fill.fillWordTemplate(compiled.bytes, { fields: [field], answers: { legacy_choice: "科研" } })
  const xml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(xml, /类型：/)
  assert.match(xml, /教学/)
  assert.match(xml, /科研/)
  assert.match(xml, /管理/)
  assert.match(xml, /oa-choice:legacy_choice:0[\s\S]*?<w:t>□<\/w:t>/)
  assert.match(xml, /oa-choice:legacy_choice:1[\s\S]*?<w:t>√<\/w:t>/)
  assert.match(xml, /oa-choice:legacy_choice:2[\s\S]*?<w:t>□<\/w:t>/)
  assert.doesNotMatch(xml, /oa-field:legacy_choice/)
})

test("legacy bookmark append preserves the bookmark pair and fills between them", () => {
  const sourceBody = `<w:p><w:r><w:t>姓名：</w:t></w:r><w:bookmarkStart w:id="7" w:name="applicant_name"/><w:bookmarkEnd w:id="7"/><w:r><w:t>（必填）</w:t></w:r></w:p>`
  const input = docx(sourceBody)
  const sourceXml = pkgModule.readOoxmlPackage(input).readText("word/document.xml")
  const locator = compiler.inspectWordXmlPart(sourceXml).find((node) => node.localName === "bookmarkstart")
  const field = { fieldId: "applicant_name", label: "姓名", answerType: "text", required: true }
  const manifest = {
    syntaxVersion: 1,
    compilerVersion: "test",
    fields: [field],
    suggestions: [],
    anchors: [{ fieldId: field.fieldId, kind: "bookmark", partName: "word/document.xml", path: locator.path, contextHash: locator.contextHash, output: { mode: "append" } }],
  }

  const compiled = compiler.compileWordTemplate(input, manifest)
  const output = fill.fillWordTemplate(compiled.bytes, { fields: [field], answers: { applicant_name: "张三" } })
  const xml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(xml, /<w:bookmarkStart w:id="7" w:name="applicant_name"\/>/)
  assert.match(xml, /<w:bookmarkEnd w:id="7"\/>/)
  assert.match(xml, /oa-field:applicant_name[\s\S]*?<w:t>张三<\/w:t>/)
  assert.ok(xml.indexOf("<w:bookmarkStart") < xml.indexOf("oa-field:applicant_name"))
  assert.ok(xml.indexOf("oa-field:applicant_name") < xml.indexOf("<w:bookmarkEnd"))
  assert.match(xml, /（必填）/)
})

test("rejects overlong and malicious answers", () => {
  const input = docx(`<w:p>${sdt("text")}</w:p>`)
  assert.throws(() => fill.fillWordTemplate(input, { fields, answers: { text: "x".repeat(21) } }), /长度/)
  assert.throws(() => fill.fillWordTemplate(input, { fields, answers: { text: { toString: "attack" } } }), /答案/)
  assert.throws(() => fill.fillWordTemplate(input, { fields, answers: { choices: ["A", { attack: true }] } }), /答案/)
})

test("clones complete repeat rows for 0, 1, 3, and 100 submissions", () => {
  const row = `<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2000"/></w:tcPr><w:p>${sdt("text")}</w:p></w:tc><w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr><w:p>${sdt("number")}</w:p></w:tc></w:tr>`
  const input = docx(`<w:tbl><w:tr><w:tc><w:p><w:r><w:t>表头</w:t></w:r></w:p></w:tc></w:tr><w:sdt><w:sdtPr><w:tag w:val="oa-repeat:rows"/></w:sdtPr><w:sdtContent>${row}</w:sdtContent></w:sdt></w:tbl>`)
  for (const count of [0, 1, 3, 100]) {
    const submissions = Array.from({ length: count }, (_, i) => ({ answers: { text: `用户${i}`, number: i } }))
    const output = fill.fillWordTemplateRepeatRows(input, { fields, repeatFieldId: "rows", submissions })
    const xml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")
    assert.equal((xml.match(/<w:trPr>/g) || []).length, count)
    assert.equal((xml.match(/<w:tcW/g) || []).length, count)
    assert.equal((xml.match(/<w:vMerge/g) || []).length, count)
  }
})

test("fills one submission table answer by cloning the Word prototype row and preserving cell styles", () => {
  const prototype = `<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="1800"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:eastAsia="方正仿宋_GBK"/></w:rPr></w:pPr></w:p></w:tc><w:tc><w:p><w:r><w:rPr><w:rFonts w:eastAsia="方正仿宋_GBK"/></w:rPr><w:t> </w:t></w:r></w:p></w:tc></w:tr>`
  const input = docx(`<w:tbl><w:tr><w:tc><w:p><w:r><w:t>起止年月</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>学校名称</w:t></w:r></w:p></w:tc></w:tr><w:sdt><w:sdtPr><w:tag w:val="oa-repeat:education"/></w:sdtPr><w:sdtContent>${prototype}</w:sdtContent></w:sdt></w:tbl>`)
  const tableField = { fieldId: "education", label: "主要教育经历", answerType: "table", required: false, columns: [{ id: "column_1", label: "起止年月", type: "text" }, { id: "column_2", label: "学校名称", type: "text" }] }
  const output = fill.fillWordTemplate(input, { fields: [tableField], answers: { education: [{ column_1: "2018-2022", column_2: "北京大学" }, { column_1: "2022-2026", column_2: "清华大学" }] } })
  const xml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")
  assert.equal((xml.match(/<w:cantSplit\/>/g) || []).length, 2)
  assert.equal((xml.match(/<w:tcW w:w="1800"\/>/g) || []).length, 2)
  assert.match(xml, /2018-2022/)
  assert.match(xml, /北京大学/)
  assert.match(xml, /2022-2026/)
  assert.match(xml, /清华大学/)
  assert.equal((xml.match(/方正仿宋_GBK/g) || []).length, 6)
  assert.doesNotMatch(xml, /oa-repeat:education/)
})

test("routes mixed template versions without falling forward", () => {
  const grouped = exportData.routeSubmissionsByTemplateVersion([
    { id: "a", documentTemplateVersionId: "v1" }, { id: "b", documentTemplateVersionId: "v2" }, { id: "c", documentTemplateVersionId: "v1" },
  ])
  assert.deepEqual([...grouped.keys()], ["v1", "v2"])
  assert.deepEqual(grouped.get("v1").map((x) => x.id), ["a", "c"])
  assert.throws(() => exportData.routeSubmissionsByTemplateVersion([{ id: "x" }]), /模板版本/)
})
