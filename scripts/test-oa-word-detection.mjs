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
