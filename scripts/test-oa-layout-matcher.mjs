import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const outDir = mkdtempSync(path.join(tmpdir(), "oa-layout-matcher-"))
for (const moduleName of ["oa-word-layout-index", "oa-pdf-layout", "oa-layout-matcher", "ooxml-package", "simple-zip"]) {
  execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
    path.join(root, `src/lib/server/${moduleName}.ts`),
    "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(outDir, `${moduleName}.js`)}`,
  ])
}
const require = createRequire(import.meta.url)
const wordLayout = require(path.join(outDir, "oa-word-layout-index.js"))
const pdfLayout = require(path.join(outDir, "oa-pdf-layout.js"))
const matcher = require(path.join(outDir, "oa-layout-matcher.js"))
const { buildSimpleZip } = require(path.join(outDir, "simple-zip.js"))
const { readOoxmlPackage } = require(path.join(outDir, "ooxml-package.js"))

const contentTypes = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
const rootRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
function pkg(xml, extras = []) {
  return readOoxmlPackage(buildSimpleZip([
    { name: "[Content_Types].xml", data: contentTypes }, { name: "_rels/.rels", data: rootRels },
    { name: "word/document.xml", data: xml }, ...extras,
  ]))
}

const xml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
  <w:tbl><w:tr><w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>
  <w:p><w:r><w:t>联系电话：</w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>____</w:t></w:r></w:p>
  <w:p><w:r><w:t>类型：○教学 ○科研 ○管理</w:t></w:r></w:p>
  <w:p><w:r><w:t>主要做法（不超过200字）</w:t></w:r></w:p><w:p/>
  <w:p><w:r><w:t>应用情况：</w:t></w:r></w:p><w:p/>
  <w:p><w:r><w:t>应用情况：</w:t></w:r></w:p><w:p/>
</w:body></w:document>`

const completeFormXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
  <w:p><w:r><w:t>案例名称：</w:t></w:r><w:r><w:rPr><w:u/></w:rPr><w:t xml:space="preserve">      </w:t></w:r></w:p>
  <w:tbl>
    <w:tr><w:tc><w:p><w:r><w:t>案例名称</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>方向</w:t></w:r></w:p></w:tc><w:tc>
      <w:p><w:r><w:t>一、政策创新</w:t></w:r></w:p><w:p><w:r><w:t>□场景开放 □要素联动 □其他</w:t></w:r></w:p>
      <w:p><w:r><w:t>二、应用拓展</w:t></w:r></w:p><w:p><w:r><w:t>□科学技术 □其他</w:t></w:r></w:p>
      <w:p><w:r><w:t>三、支撑能力</w:t></w:r></w:p><w:p><w:r><w:t>□安全体系</w:t></w:r></w:p>
    </w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>案例简介</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>简述基本概况、解决问题和创新点，不超过500字</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:tcPr><w:gridSpan w:val="6"/></w:tcPr><w:p><w:r><w:t>报送单位/牵头单位基本信息</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>负责人</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc><w:tc><w:p><w:r><w:t>职务</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc><w:tc><w:p><w:r><w:t>联系方式</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr>
  </w:tbl>
  <w:p><w:r><w:t>一、基本概况</w:t></w:r></w:p><w:p><w:r><w:t>阐述案例痛点。（300字以内）</w:t></w:r></w:p>
  <w:p><w:r><w:t>二、主要做法</w:t></w:r></w:p><w:p><w:r><w:t>阐述技术路线。（1800字以内）</w:t></w:r></w:p>
  <w:p><w:r><w:t>三、应用成效</w:t></w:r></w:p><w:p><w:r><w:t>阐述应用实效。（600字以内）</w:t></w:r></w:p>
  <w:p><w:r><w:t>四、创新点</w:t></w:r></w:p><w:p><w:r><w:t>总结创新亮点。（300字以内）</w:t></w:r></w:p>
  <w:p><w:r><w:t>相关佐证材料</w:t></w:r></w:p><w:p><w:r><w:t>包括检测报告、用户报告等材料。</w:t></w:r></w:p>
</w:body></w:document>`

function bbox(pages) {
  return `<?xml version="1.0"?><doc>${pages.map((words, pageIndex) => `<page width="600" height="800"><flow><block><line>${words.map(([text, x, y, x2, y2]) => `<word xMin="${x}" yMin="${y}" xMax="${x2}" yMax="${y2}">${text}</word>`).join("")}</line></block></flow></page>`).join("")}</doc>`
}

test("indexes blank cells, runs, choices, narrative paragraphs, headers, and stable IDs", () => {
  const header = `<?xml version="1.0"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>页眉编号：</w:t></w:r><w:r><w:rPr><w:u/></w:rPr><w:t>___</w:t></w:r></w:p></w:hdr>`
  const nodes = wordLayout.indexWordWritableNodes(pkg(xml, [{ name: "word/header1.xml", data: header }]))
  assert.ok(nodes.some((node) => node.kind === "table_cell" && node.label === "姓名" && node.writeTarget === "table-cell" && node.table.cell === 2))
  assert.ok(nodes.some((node) => node.kind === "underline" && node.label === "联系电话" && node.writeTarget === "inline-run"))
  assert.ok(nodes.some((node) => node.kind === "radio_group" && node.writeTarget === "choice"))
  assert.ok(nodes.some((node) => node.label === "主要做法" && node.writeTarget === "paragraph-after" && /\/p\[3\]$/.test(node.styleSourcePath)))
  assert.ok(nodes.some((node) => node.partName === "word/header1.xml"))
  assert.equal(JSON.stringify(nodes), JSON.stringify(wordLayout.indexWordWritableNodes(pkg(xml, [{ name: "word/header1.xml", data: header }]))))
  assert.ok(nodes.every((node) => /^binding_[a-f0-9]{20}$/.test(node.id) && /^[a-f0-9]{16}$/.test(node.contextHash)))
})

test("indexes instructional cells, one grouped choice, exact narratives, contextual labels, and evidence files", () => {
  const nodes = wordLayout.indexWordWritableNodes(pkg(completeFormXml))
  const choice = nodes.filter((node) => node.writeTarget === "choice")
  assert.equal(choice.length, 1)
  assert.equal(choice[0].label, "方向")
  assert.deepEqual(choice[0].options, ["场景开放", "要素联动", "政策创新 · 其他", "科学技术", "应用拓展 · 其他", "安全体系"])
  assert.match(choice[0].path, /tbl\[1\]\/tr\[2\]\/tc\[2\]$/)

  const introduction = nodes.find((node) => node.label === "案例简介")
  assert.ok(introduction)
  assert.equal(introduction.writeTarget, "table-cell")
  assert.match(introduction.path, /tbl\[1\]\/tr\[3\]\/tc\[2\]$/)

  for (const label of ["基本概况", "主要做法", "应用成效", "创新点"]) {
    const narrative = nodes.find((node) => node.label === label)
    assert.ok(narrative, label)
    assert.equal(narrative.writeTarget, "paragraph-after")
    assert.match(narrative.normalizedText, /字以内/)
  }
  const evidence = nodes.find((node) => node.label === "相关佐证材料")
  assert.ok(evidence)
  assert.equal(evidence.writeTarget, "paragraph-after")
  assert.match(evidence.normalizedText, /检测报告/)

  assert.ok(nodes.some((node) => node.label === "报送单位/牵头单位基本信息 · 负责人"))
  assert.ok(nodes.some((node) => node.label === "报送单位/牵头单位基本信息 · 负责人 · 职务"))
  assert.ok(nodes.some((node) => node.label === "报送单位/牵头单位基本信息 · 负责人 · 联系方式"))
})

test("parses top-left normalized Poppler bbox XML and rejects unsafe or invalid geometry", () => {
  const parsed = pdfLayout.parsePdfBboxXml(bbox([[['姓名', 60, 80, 120, 100]]]))
  assert.deepEqual(parsed.pages, [{ page: 1, width: 600, height: 800, rotation: 0 }])
  assert.deepEqual(parsed.textBoxes[0], {
    page: 1, text: "姓名", normalizedText: "姓名", x: 0.1, y: 0.1, width: 0.1, height: 0.025,
    pageWidth: 600, pageHeight: 800, rotation: 0, coordinateSpace: "normalized-pdf", order: 0, line: 0,
  })
  assert.throws(() => pdfLayout.parsePdfBboxXml(`<!DOCTYPE doc><doc/>`), /DTD|实体/)
  assert.throws(() => pdfLayout.parsePdfBboxXml(`<doc><page width="600" height="800"><word xMin="NaN" yMin="0" xMax="1" yMax="1">x</word></page></doc>`), /有限|几何/)
  assert.throws(() => pdfLayout.parsePdfBboxXml(`<doc><page width="600" height="800"><word xMin="0" yMin="0" xMax="601" yMax="1">x</word></page></doc>`), /页面范围/)
  assert.throws(() => pdfLayout.parsePdfBboxXml("x".repeat(5 * 1024 * 1024 + 1)), /大小/)
  const deeplyNested = `<doc><page width="600" height="800">${"<flow>".repeat(5_000)}${"</flow>".repeat(5_000)}</page></doc>`
  assert.throws(() => pdfLayout.parsePdfBboxXml(deeplyNested), /深度.*限制/)
})

test("accepts only Poppler's fixed XHTML doctype without resolving external entities", () => {
  const body = `<html><body><doc><page width="100" height="100"><word xMin="1" yMin="2" xMax="10" yMax="12">字段</word></page></doc></body></html>`
  const poppler = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">${body}`
  assert.equal(pdfLayout.parsePdfBboxXml(poppler).pages.length, 1)
  assert.throws(() => pdfLayout.parsePdfBboxXml(`<!DOCTYPE foo SYSTEM "file:///etc/passwd">${body}`), /DTD/)
  assert.throws(() => pdfLayout.parsePdfBboxXml(`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${body}`), /实体/)
})

test("choice visuals cover the complete option group instead of a small box after its label", () => {
  const nodes = wordLayout.indexWordWritableNodes(pkg(xml)).filter((node) => node.writeTarget === "choice")
  const pdf = pdfLayout.parsePdfBboxXml(bbox([[['类型', 30, 200, 70, 220], ['教学', 90, 200, 125, 220], ['科研', 140, 200, 175, 220], ['管理', 190, 200, 225, 220]]]))
  const result = matcher.matchWordNodesToPdf(nodes, pdf)
  assert.equal(result.candidates.length, 1)
  const visual = result.candidates[0].visual
  assert.equal(visual.x, 30 / 600)
  assert.equal(visual.y, 200 / 800)
  assert.equal(visual.x + visual.width, 225 / 600)
  assert.equal(visual.y + visual.height, 220 / 800)
})

test("choice mapping includes options that Poppler orders before a vertical table label", () => {
  const nodes = wordLayout.indexWordWritableNodes(pkg(completeFormXml)).filter((node) => node.label === "方向")
  const pdf = pdfLayout.parsePdfBboxXml(bbox([[
    ["场景开放", 200, 180, 260, 200], ["要素联动", 320, 180, 380, 200], ["其他", 440, 180, 480, 200],
    ["科学", 200, 241, 225, 260], ["技术", 225, 240, 260, 260], ["其他", 440, 240, 480, 260], ["方向", 80, 230, 120, 250],
    ["安全体系", 200, 300, 260, 320],
  ]]))
  const result = matcher.matchWordNodesToPdf(nodes, pdf)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].visual.x, 80 / 600)
  assert.equal(result.candidates[0].visual.y, 180 / 800)
  assert.ok(Math.abs(result.candidates[0].visual.x + result.candidates[0].visual.width - 480 / 600) < 1e-12)
  assert.ok(Math.abs(result.candidates[0].visual.y + result.candidates[0].visual.height - 320 / 800) < 1e-12)
})

test("maps unique Word nodes deterministically and uses document order for repeated cross-page labels", () => {
  const nodes = wordLayout.indexWordWritableNodes(pkg(xml))
  const pdf = pdfLayout.parsePdfBboxXml(bbox([
    [['姓名', 30, 80, 65, 100], ['联系电话', 30, 140, 100, 160], ['类型', 30, 200, 70, 220], ['教学', 90, 200, 125, 220], ['科研', 140, 200, 175, 220], ['管理', 190, 200, 225, 220], ['主要做法', 30, 260, 100, 280], ['不超过200字', 105, 260, 190, 280], ['应用情况', 30, 500, 100, 520]],
    [['应用情况', 30, 80, 100, 100]],
  ]))
  const one = matcher.matchWordNodesToPdf(nodes, pdf)
  const two = matcher.matchWordNodesToPdf(nodes, pdf)
  assert.equal(JSON.stringify(one), JSON.stringify(two))
  const name = one.candidates.find((candidate) => candidate.label === "姓名")
  assert.ok(name)
  assert.equal(name.page, undefined)
  assert.equal(name.visual.page, 1)
  assert.equal(name.visual.x, 65 / 600)
  assert.equal(name.visual.y, 80 / 800)
  assert.equal(name.visual.width, 35 / 600)
  assert.ok(Math.abs(name.visual.height - 20 / 800) < 1e-12)
  assert.equal(name.visual.coordinateSpace, "normalized-pdf")
  assert.match(name.path, /tc\[2\]$/)
  assert.equal(name.writeTarget, "table-cell")
  const applications = one.candidates.filter((candidate) => candidate.label === "应用情况")
  assert.deepEqual(applications.map((candidate) => candidate.visual.page), [1, 2])
  assert.ok(applications[0].path.endsWith("/p[5]"))
  assert.ok(applications[1].path.endsWith("/p[7]"))
})

test("keeps generated answer rectangles fully inside the normalized page at the right edge", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>编号：</w:t></w:r><w:r><w:rPr><w:u/></w:rPr><w:t>___</w:t></w:r></w:p></w:body></w:document>`
  const nodes = wordLayout.indexWordWritableNodes(pkg(sourceXml))
  const pdf = pdfLayout.parsePdfBboxXml(bbox([[['编号', 570, 80, 600, 100]]]))
  const result = matcher.matchWordNodesToPdf(nodes, pdf)
  assert.equal(result.candidates.length, 1)
  const visual = result.candidates[0].visual
  assert.ok(visual.x >= 0 && visual.width >= 0.005)
  assert.ok(visual.x + visual.width <= 1)
  assert.ok(visual.y >= 0 && visual.y + visual.height <= 1)
})

test("uses table row order from geometry when Poppler word order is reversed", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl>
    <w:tr><w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr>
  </w:tbl></w:body></w:document>`
  const nodes = wordLayout.indexWordWritableNodes(pkg(sourceXml)).filter((node) => node.kind === "table_cell")
  const pdf = pdfLayout.parsePdfBboxXml(bbox([[['姓名', 30, 400, 70, 420], ['姓名', 30, 100, 70, 120]]]))
  const result = matcher.matchWordNodesToPdf(nodes, pdf)
  assert.equal(result.candidates.length, 2)
  const byPath = [...result.candidates].sort((left, right) => left.path.localeCompare(right.path, "en"))
  assert.deepEqual(byPath.map((candidate) => candidate.visual.y), [100 / 800, 400 / 800])
})

test("uses nearby writable geometry to disambiguate a repeated inline label", () => {
  const sourceXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>编号：</w:t></w:r><w:r><w:rPr><w:u/></w:rPr><w:t>___</w:t></w:r></w:p></w:body></w:document>`
  const nodes = wordLayout.indexWordWritableNodes(pkg(sourceXml))
  const pdf = pdfLayout.parsePdfBboxXml(bbox([[['编号', 570, 80, 600, 100], ['编号', 30, 160, 70, 180]]]))
  const result = matcher.matchWordNodesToPdf(nodes, pdf)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].visual.y, 160 / 800)
  assert.ok(result.candidates[0].visual.width >= 0.05)
})

test("builds stable marker plans and validates unique marker geometry without mutating source packages", () => {
  const nodes = wordLayout.indexWordWritableNodes(pkg(xml)).filter((node) => node.label === "应用情况")
  const planA = matcher.createMarkerPlan(nodes)
  const planB = matcher.createMarkerPlan(nodes)
  assert.deepEqual(planA, planB)
  assert.equal(new Set(planA.map((item) => item.marker)).size, planA.length)
  assert.ok(planA.every((item) => /^OA_[A-F0-9]{12}$/.test(item.marker)))

  const clean = pdfLayout.parsePdfBboxXml(bbox([[['应用情况', 30, 80, 100, 100]], [['应用情况', 30, 80, 100, 100]]]))
  const marked = pdfLayout.parsePdfBboxXml(bbox([[[planA[0].marker, 120, 80, 200, 100]], [[planA[1].marker, 120, 80, 200, 100]]]))
  const result = matcher.validateMarkerLayout(planA, clean.pages, marked)
  assert.equal(result.resolved.length, 2)
  assert.equal(result.unresolved.length, 0)
  const duplicate = pdfLayout.parsePdfBboxXml(bbox([[[planA[0].marker, 120, 80, 200, 100], [planA[0].marker, 220, 80, 300, 100]], [[planA[1].marker, 120, 80, 200, 100]]]))
  assert.equal(matcher.validateMarkerLayout(planA, clean.pages, duplicate).unresolved[0].reason, "marker_not_unique")
  assert.throws(() => matcher.validateMarkerLayout(planA, clean.pages, pdfLayout.parsePdfBboxXml(bbox([[[planA[0].marker, 1, 1, 2, 2]]]))), /页面几何/)
})
