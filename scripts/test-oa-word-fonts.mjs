import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const output = mkdtempSync(path.join(tmpdir(), "oa-word-fonts-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/server/oa-word-fonts.ts"),
  path.join(root, "src/lib/server/ooxml-package.ts"),
  path.join(root, "src/lib/server/simple-zip.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outdir=${output}`,
])
const require = createRequire(import.meta.url)
const fonts = require(path.join(output, "oa-word-fonts.js"))
const ooxml = require(path.join(output, "ooxml-package.js"))
const zip = require(path.join(output, "simple-zip.js"))

test("extracts only directly applied visible Word fonts, not unused style defaults", () => {
  const bytes = zip.buildSimpleZip([
    { name: "[Content_Types].xml", data: Buffer.from("<Types/>") },
    { name: "word/document.xml", data: Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="方正仿宋_GBK"/></w:rPr><w:t>正文</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial"/></w:rPr><w:t>ABC</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="EmptyFont"/></w:rPr></w:r><w:r><w:rPr><w:rFonts w:ascii="HiddenFont"/><w:vanish/></w:rPr><w:t>hidden</w:t></w:r></w:body></w:document>`) },
    { name: "word/header1.xml", data: Buffer.from(`<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:r><w:rPr><w:rFonts w:ascii="WrongScript" w:eastAsia="方正黑体_GBK"/></w:rPr><w:t>页眉</w:t></w:r></w:hdr>`) },
    { name: "word/comments.xml", data: Buffer.from(`<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:r><w:rPr><w:rFonts w:ascii="CommentOnly"/></w:rPr><w:t>comment</w:t></w:r></w:comments>`) },
    { name: "word/styles.xml", data: Buffer.from(`<w:styles><w:rFonts w:ascii="Unused Default"/></w:styles>`) },
  ])
  assert.deepEqual(fonts.extractDirectWordFonts(ooxml.readOoxmlPackage(bytes)), ["Arial", "方正仿宋_GBK", "方正黑体_GBK"].sort((left, right) => left.localeCompare(right, "zh-CN")))
})

test("extracts each rendered script font from mixed runs and ignores field instructions", () => {
  const bytes = zip.buildSimpleZip([
    { name: "[Content_Types].xml", data: Buffer.from("<Types/>") },
    { name: "word/document.xml", data: Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Latin Extended" w:eastAsia="SimSun" w:cs="Arabic Font"/></w:rPr><w:t>ABC中文éالعربية</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="InstructionFont"/></w:rPr><w:instrText> MERGEFIELD Name </w:instrText></w:r></w:body></w:document>`) },
  ])
  assert.deepEqual(fonts.extractDirectWordFonts(ooxml.readOoxmlPackage(bytes)), [
    "Arial", "Arabic Font", "Latin Extended", "SimSun",
  ].sort((left, right) => left.localeCompare(right, "zh-CN")))
})
