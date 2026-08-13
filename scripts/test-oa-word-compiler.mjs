import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const outDir = mkdtempSync(path.join(tmpdir(), "oa-word-compile-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/oa-word-compiler.ts"), path.join(root, "src/lib/server/oa-word-detection.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${outDir}`])
const require = createRequire(import.meta.url)
const compiler = require(path.join(outDir, "oa-word-compiler.js"))
const detection = require(path.join(outDir, "oa-word-detection.js"))
const { buildSimpleZip } = require(path.join(root, "src/lib/server/simple-zip.ts"))
const pkgModule = (() => { const d = mkdtempSync(path.join(tmpdir(), "pkg-")); execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/ooxml-package.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${d}`]); return require(path.join(d, "ooxml-package.js")) })()

const xml = `<?xml version="1.0"?><x:document xmlns:x="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><x:body><x:p><x:r><x:t>姓名：</x:t></x:r></x:p></x:body></x:document>`
const types = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
const bytes = buildSimpleZip([{ name: "[Content_Types].xml", data: types }, { name: "_rels/.rels", data: rels }, { name: "word/document.xml", data: xml }, { name: "word/styles.xml", data: "UNCHANGED" }])

function docx(documentXml) {
  return buildSimpleZip([{ name: "[Content_Types].xml", data: types }, { name: "_rels/.rels", data: rels }, { name: "word/document.xml", data: documentXml }, { name: "word/styles.xml", data: "UNCHANGED" }])
}

function versionTwoAnchor(sourceXml, fieldId, writeTarget, kind = "label_blank") {
  const locator = compiler.inspectWordXmlPart(sourceXml).find((node) => node.localName === (writeTarget === "table-cell" ? "tc" : writeTarget === "repeat-row" ? "tr" : "p"))
  const structural = { partName: "word/document.xml", path: locator.path, contextHash: locator.contextHash, writeTarget }
  return {
    fieldId,
    kind,
    partName: structural.partName,
    path: structural.path,
    contextHash: structural.contextHash,
    output: { mode: writeTarget === "repeat-row" ? "repeat_row" : writeTarget === "choice" ? "mark_choice" : writeTarget === "inline-run" ? "append" : "replace" },
    visual: { page: 1, x: 0.1, y: 0.1, width: 0.8, height: 0.1, pageWidth: 595, pageHeight: 842, rotation: 0, coordinateSpace: "normalized-pdf" },
    bindingCandidateId: `candidate_${fieldId}`,
    structural,
  }
}

test("compiles stable SDTs into targeted parts and preserves untouched entries", () => {
  const locator = compiler.inspectWordXmlPart(xml).find((node) => node.localName === "p")
  const manifest = { syntaxVersion: 1, compilerVersion: "test", fields: [{ fieldId: "field_name", label: `姓名 & \"称呼\"`, answerType: "text", required: true }], suggestions: [], anchors: [{ fieldId: "field_name", kind: "label_blank", partName: "word/document.xml", path: locator.path, contextHash: locator.contextHash, output: { mode: "append" } }] }
  const first = compiler.compileWordTemplate(bytes, manifest)
  const second = compiler.compileWordTemplate(bytes, manifest)
  assert.deepEqual(first.bytes, second.bytes)
  assert.deepEqual(first.changedParts, ["word/document.xml"])
  const result = pkgModule.readOoxmlPackage(first.bytes)
  assert.equal(result.readText("word/styles.xml"), "UNCHANGED")
  assert.match(result.readText("word/document.xml"), /oa-field:field_name/)
  assert.match(result.readText("word/document.xml"), /姓名 &amp; &quot;称呼&quot;/)
})

test("rejects stale locators and unresolved manifests", () => {
  const locator = compiler.inspectWordXmlPart(xml).find((node) => node.localName === "p")
  const base = { syntaxVersion: 1, compilerVersion: "test", fields: [{ fieldId: "field_name", label: "姓名", answerType: "text", required: true }], suggestions: [], anchors: [{ fieldId: "field_name", kind: "label_blank", partName: "word/document.xml", path: locator.path, contextHash: "0000000000000000", output: { mode: "append" } }] }
  assert.throws(() => compiler.compileWordTemplate(bytes, base), /已变化|定位/)
  assert.throws(() => compiler.compileWordTemplate(bytes, { ...base, anchors: [{ ...base.anchors[0], contextHash: locator.contextHash }], suggestions: [{ id: "x", kind: "label_blank", label: "x", inferredAnswerType: "text", confidence: "low", reviewState: "unresolved", evidence: ["x"], conflictIds: [], partName: "word/document.xml", path: locator.path, contextHash: locator.contextHash }] }), /未解决/)
})

test("paragraph-after retains the instruction and clones compatible paragraph and run styles into a sibling block SDT", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Narrative"/><w:spacing w:line="360"/><w:ind w:firstLine="420"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="宋体"/><w:sz w:val="24"/></w:rPr><w:t>主要做法（不超过500字）：</w:t></w:r></w:p><w:p><w:r><w:t>后续说明</w:t></w:r></w:p></w:body></w:document>`
  const field = { fieldId: "main_practice", label: "主要做法", answerType: "textarea", required: true }
  const anchor = versionTwoAnchor(sourceXml, field.fieldId, "paragraph-after")
  const output = compiler.compileWordTemplate(docx(sourceXml), { syntaxVersion: 2, compilerVersion: "test", fields: [field], suggestions: [], anchors: [anchor] })
  const resultXml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(resultXml, /主要做法（不超过500字）：/)
  assert.match(resultXml, /<w:p><w:pPr><w:pStyle w:val="Narrative"\/><w:spacing w:line="360"\/><w:ind w:firstLine="420"\/><\/w:pPr><w:sdt>/)
  assert.match(resultXml, /oa-field:main_practice/)
  assert.match(resultXml, /<w:r><w:rPr><w:rFonts w:eastAsia="宋体"\/><w:sz w:val="24"\/><\/w:rPr><w:t xml:space="preserve"> <\/w:t><\/w:r>/)
  assert.ok(resultXml.indexOf("主要做法（不超过500字）：") < resultXml.indexOf("oa-field:main_practice"))
  assert.ok(resultXml.indexOf("oa-field:main_practice") < resultXml.indexOf("后续说明"))
})

test("choice compiles safe option-level marker SDTs across runs while preserving option text", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>类别：</w:t></w:r><w:r><w:rPr><w:color w:val="2468AC"/></w:rPr><w:t>□</w:t></w:r><w:r><w:t>甲</w:t></w:r><w:r><w:rPr><w:color w:val="2468AC"/></w:rPr><w:t>□</w:t></w:r><w:r><w:t>乙</w:t></w:r></w:p></w:body></w:document>`
  const field = { fieldId: "category", label: "类别", answerType: "single_choice", required: true, options: ["甲", "乙"] }
  const anchor = versionTwoAnchor(sourceXml, field.fieldId, "choice", "radio_group")
  const output = compiler.compileWordTemplate(docx(sourceXml), { syntaxVersion: 2, compilerVersion: "test", fields: [field], suggestions: [], anchors: [anchor] })
  const resultXml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(resultXml, /oa-choice:category:0/)
  assert.match(resultXml, /oa-choice:category:1/)
  assert.match(resultXml, /<w:r><w:t>甲<\/w:t><\/w:r>/)
  assert.match(resultXml, /<w:r><w:t>乙<\/w:t><\/w:r>/)
  assert.equal((resultXml.match(/<w:color w:val="2468AC"\/>/g) || []).length, 2)
})

test("choice safely splits markers and option text that share one styled run", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:rFonts w:eastAsia="楷体"/><w:color w:val="13579B"/></w:rPr><w:t>类型：○教学 ○科研 ○管理</w:t></w:r></w:p></w:body></w:document>`
  const field = { fieldId: "category", label: "类型", answerType: "single_choice", required: true, options: ["教学", "科研", "管理"] }
  const anchor = versionTwoAnchor(sourceXml, field.fieldId, "choice", "radio_group")
  const output = compiler.compileWordTemplate(docx(sourceXml), { syntaxVersion: 2, compilerVersion: "test", fields: [field], suggestions: [], anchors: [anchor] })
  const resultXml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(resultXml, /oa-choice:category:0/)
  assert.match(resultXml, /oa-choice:category:1/)
  assert.match(resultXml, /oa-choice:category:2/)
  assert.match(resultXml, /类型：/)
  assert.match(resultXml, /教学/)
  assert.match(resultXml, /科研/)
  assert.match(resultXml, /管理/)
  assert.equal((resultXml.match(/<w:rFonts w:eastAsia="楷体"\/>/g) || []).length, 7)
  assert.equal((resultXml.match(/<w:color w:val="13579B"\/>/g) || []).length, 7)
})

test("compiles detector-normalized choices whose visible labels include parenthetical notes", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>类型：○教学（推荐） ○科研(test note)</w:t></w:r></w:p></w:body></w:document>`
  const input = docx(sourceXml)
  const suggestion = detection.detectWordFormRegions(input).find((item) => item.kind === "radio_group")
  assert.deepEqual(suggestion.options, ["教学", "科研"])
  const field = { fieldId: suggestion.fieldId, label: suggestion.label, answerType: suggestion.inferredAnswerType, required: true, options: suggestion.options }
  const anchor = {
    fieldId: field.fieldId,
    kind: suggestion.kind,
    partName: suggestion.partName,
    path: suggestion.path,
    contextHash: suggestion.contextHash,
    output: { mode: "mark_choice" },
  }

  const output = compiler.compileWordTemplate(input, { syntaxVersion: 1, compilerVersion: "test", fields: [field], suggestions: [], anchors: [anchor] })
  const resultXml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")
  assert.match(resultXml, new RegExp(`oa-choice:${field.fieldId}:0`))
  assert.match(resultXml, new RegExp(`oa-choice:${field.fieldId}:1`))
  assert.match(resultXml, /教学（推荐）/)
  assert.match(resultXml, /科研\(test note\)/)
})

test("choice rejects reordered, renamed, or non-unique visible options across run layouts", () => {
  const sources = [
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>类型：○教学 ○科研 ○管理</w:t></w:r></w:p></w:body></w:document>`,
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>类型：</w:t></w:r><w:r><w:t>○</w:t></w:r><w:r><w:t>教学 </w:t></w:r><w:r><w:t>○</w:t></w:r><w:r><w:t>科研 </w:t></w:r><w:r><w:t>○管理</w:t></w:r></w:p></w:body></w:document>`,
  ]
  for (const sourceXml of sources) {
    const anchor = versionTwoAnchor(sourceXml, "category", "choice", "radio_group")
    for (const options of [["科研", "教学", "管理"], ["教学", "研究", "管理"]]) {
      const field = { fieldId: "category", label: "类型", answerType: "single_choice", required: true, options }
      assert.throws(
        () => compiler.compileWordTemplate(docx(sourceXml), { syntaxVersion: 2, compilerVersion: "test", fields: [field], suggestions: [], anchors: [anchor] }),
        /无法安全匹配选项文本/,
      )
    }
  }

  const duplicateXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>类型：○教学 ○教学</w:t></w:r></w:p></w:body></w:document>`
  const duplicateAnchor = versionTwoAnchor(duplicateXml, "category", "choice", "radio_group")
  const duplicateField = { fieldId: "category", label: "类型", answerType: "single_choice", required: true, options: ["教学", "教学"] }
  assert.throws(
    () => compiler.compileWordTemplate(docx(duplicateXml), { syntaxVersion: 2, compilerVersion: "test", fields: [duplicateField], suggestions: [], anchors: [duplicateAnchor] }),
    /选项文本.*唯一/,
  )

  const emptyXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>类型：○</w:t></w:r></w:p></w:body></w:document>`
  const emptyAnchor = versionTwoAnchor(emptyXml, "category", "choice", "radio_group")
  const emptyField = { fieldId: "category", label: "类型", answerType: "single_choice", required: true, options: [""] }
  assert.throws(
    () => compiler.compileWordTemplate(docx(emptyXml), { syntaxVersion: 2, compilerVersion: "test", fields: [emptyField], suggestions: [], anchors: [emptyAnchor] }),
    /无法安全匹配选项文本/,
  )
})

test("inline-run replaces the confirmed run while retaining its run style", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>姓名：</w:t></w:r><w:r><w:rPr><w:u w:val="single"/><w:rFonts w:eastAsia="楷体"/></w:rPr><w:t>____</w:t></w:r></w:p></w:body></w:document>`
  const locator = compiler.inspectWordXmlPart(sourceXml).filter((node) => node.localName === "r")[1]
  const field = { fieldId: "name", label: "姓名", answerType: "text", required: true }
  const structural = { partName: "word/document.xml", path: locator.path, contextHash: locator.contextHash, writeTarget: "inline-run" }
  const anchor = {
    fieldId: field.fieldId, kind: "underline", partName: structural.partName, path: structural.path, contextHash: structural.contextHash,
    output: { mode: "append" }, visual: { page: 1, x: 0.1, y: 0.1, width: 0.8, height: 0.1, pageWidth: 595, pageHeight: 842, rotation: 0, coordinateSpace: "normalized-pdf" },
    bindingCandidateId: "candidate_name", structural,
  }
  const output = compiler.compileWordTemplate(docx(sourceXml), { syntaxVersion: 2, compilerVersion: "test", fields: [field], suggestions: [], anchors: [anchor] })
  const resultXml = pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml")

  assert.match(resultXml, /oa-field:name/)
  assert.match(resultXml, /<w:rPr><w:u w:val="single"\/><w:rFonts w:eastAsia="楷体"\/><\/w:rPr>/)
  assert.doesNotMatch(resultXml, /____/)
})

test("uses all five explicit V2 write targets and preserves legacy V1 mappings", () => {
  const cases = [
    { writeTarget: "table-cell", kind: "table_cell", source: `<w:tbl><w:tr><w:tc><w:tcPr><w:tcW w:w="2400"/></w:tcPr><w:p/></w:tc></w:tr></w:tbl>`, expected: /<w:tcPr><w:tcW w:w="2400"\/><\/w:tcPr><w:sdt>/ },
    { writeTarget: "inline-run", kind: "underline", source: `<w:p><w:r><w:t>姓名：</w:t></w:r></w:p>`, expected: /姓名：.*oa-field:field_target/ },
    { writeTarget: "repeat-row", kind: "repeat_row", source: `<w:tbl><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>`, expected: /oa-repeat:field_target/ },
  ]
  for (const { writeTarget, kind, source, expected } of cases) {
    const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${source}</w:body></w:document>`
    const field = { fieldId: "field_target", label: "目标", answerType: "text", required: false }
    const anchor = versionTwoAnchor(sourceXml, field.fieldId, writeTarget, kind)
    const output = compiler.compileWordTemplate(docx(sourceXml), { syntaxVersion: 2, compilerVersion: "test", fields: [field], suggestions: [], anchors: [anchor] })
    assert.match(pkgModule.readOoxmlPackage(output.bytes).readText("word/document.xml"), expected)
  }

  const legacyLocator = compiler.inspectWordXmlPart(xml).find((node) => node.localName === "p")
  for (const [mode, expected] of [["append", /姓名：.*oa-field:legacy/]]) {
    const manifest = { syntaxVersion: 1, compilerVersion: "test", fields: [{ fieldId: "legacy", label: "旧字段", answerType: "text", required: false }], suggestions: [], anchors: [{ fieldId: "legacy", kind: "label_blank", partName: "word/document.xml", path: legacyLocator.path, contextHash: legacyLocator.contextHash, output: { mode } }] }
    assert.match(pkgModule.readOoxmlPackage(compiler.compileWordTemplate(bytes, manifest).bytes).readText("word/document.xml"), expected)
  }

  const legacyCases = [
    { mode: "replace", kind: "table_cell", source: `<w:tbl><w:tr><w:tc><w:tcPr><w:tcW w:w="1200"/></w:tcPr><w:p/></w:tc></w:tr></w:tbl>`, localName: "tc", expected: /<w:tcPr><w:tcW w:w="1200"\/><\/w:tcPr><w:sdt>/ },
    { mode: "repeat_row", kind: "repeat_row", source: `<w:tbl><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>`, localName: "tr", expected: /oa-repeat:legacy/ },
  ]
  for (const legacyCase of legacyCases) {
    const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${legacyCase.source}</w:body></w:document>`
    const locator = compiler.inspectWordXmlPart(sourceXml).find((node) => node.localName === legacyCase.localName)
    const manifest = { syntaxVersion: 1, compilerVersion: "test", fields: [{ fieldId: "legacy", label: "旧字段", answerType: "text", required: false }], suggestions: [], anchors: [{ fieldId: "legacy", kind: legacyCase.kind, partName: "word/document.xml", path: locator.path, contextHash: locator.contextHash, output: { mode: legacyCase.mode } }] }
    assert.match(pkgModule.readOoxmlPackage(compiler.compileWordTemplate(docx(sourceXml), manifest).bytes).readText("word/document.xml"), legacyCase.expected)
  }

  const legacyChoiceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>类型：○教学 ○科研</w:t></w:r></w:p></w:body></w:document>`
  const legacyChoiceLocator = compiler.inspectWordXmlPart(legacyChoiceXml).find((node) => node.localName === "p")
  const legacyChoiceManifest = {
    syntaxVersion: 1,
    compilerVersion: "test",
    fields: [{ fieldId: "legacy_choice", label: "类型", answerType: "single_choice", required: false, options: ["教学", "科研"] }],
    suggestions: [],
    anchors: [{ fieldId: "legacy_choice", kind: "radio_group", partName: "word/document.xml", path: legacyChoiceLocator.path, contextHash: legacyChoiceLocator.contextHash, output: { mode: "mark_choice" } }],
  }
  const legacyChoiceResult = pkgModule.readOoxmlPackage(compiler.compileWordTemplate(docx(legacyChoiceXml), legacyChoiceManifest).bytes).readText("word/document.xml")
  assert.match(legacyChoiceResult, /oa-choice:legacy_choice:0/)
  assert.match(legacyChoiceResult, /oa-choice:legacy_choice:1/)
  assert.doesNotMatch(legacyChoiceResult, /oa-field:legacy_choice/)
})
