import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const output = mkdtempSync(path.join(tmpdir(), "oa-preview-bundle-test-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/server/oa-preview-bundle.ts"),
  path.join(root, "src/lib/server/oa-preview-tools.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outdir=${output}`,
])
const require = createRequire(import.meta.url)
const bundle = require(path.join(output, "oa-preview-bundle.js"))
const tools = require(path.join(output, "oa-preview-tools.js"))
const { buildSimpleZip } = require(path.join(root, "src/lib/server/simple-zip.ts"))

const pdf = Buffer.from("%PDF-1.7\npreview")
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const sourceSha256 = "a".repeat(64)
const pageInfo = { page: 1, width: 595.28, height: 841.89, rotation: 0 }
const layout = { syntaxVersion: 1, sourceSha256, analyzerVersion: "test-1", pages: [pageInfo], textBoxes: [], candidates: [] }

test("round-trips the canonical PDF preview bundle", () => {
  const bytes = bundle.buildOAPreviewBundle({ pdf, pages: [png], layout })
  const restored = bundle.readOAPreviewBundle(bytes, sourceSha256)
  assert.deepEqual(restored.pdf, pdf)
  assert.deepEqual(restored.pages, [png])
  assert.deepEqual(restored.layout, layout)
})

test("rejects missing, extra, and unsafe ZIP entries", () => {
  const layoutBytes = JSON.stringify(layout)
  assert.throws(() => bundle.readOAPreviewBundle(buildSimpleZip([
    { name: "document.pdf", data: pdf },
    { name: "layout.json", data: layoutBytes },
  ]), sourceSha256), /页面|page-001/)
  assert.throws(() => bundle.readOAPreviewBundle(buildSimpleZip([
    { name: "document.pdf", data: pdf },
    { name: "pages/page-001.png", data: png },
    { name: "layout.json", data: layoutBytes },
    { name: "unexpected.txt", data: "x" },
  ]), sourceSha256), /未知|额外/)
  assert.throws(() => bundle.readOAPreviewBundle(buildSimpleZip([
    { name: "../document.pdf", data: pdf },
    { name: "pages/page-001.png", data: png },
    { name: "layout.json", data: layoutBytes },
  ]), sourceSha256), /路径/)
})

test("rejects invalid PDF and PNG magic bytes and source hash drift", () => {
  assert.throws(() => bundle.buildOAPreviewBundle({ pdf: Buffer.from("not-pdf"), pages: [png], layout }), /PDF/)
  assert.throws(() => bundle.buildOAPreviewBundle({ pdf, pages: [Buffer.from("not-png")], layout }), /PNG/)
  const bytes = bundle.buildOAPreviewBundle({ pdf, pages: [png], layout })
  assert.throws(() => bundle.readOAPreviewBundle(bytes, "b".repeat(64)), /哈希/)
})

test("enforces page count, page size, layout size, and bundle size bounds", () => {
  assert.throws(() => bundle.buildOAPreviewBundle({ pdf, pages: Array.from({ length: 101 }, () => png), layout: { ...layout, pages: Array.from({ length: 101 }, (_, index) => ({ ...pageInfo, page: index + 1 })) } }), /100/)
  assert.throws(() => bundle.buildOAPreviewBundle({ pdf, pages: [Buffer.concat([png, Buffer.alloc(20 * 1024 * 1024)])], layout }), /20 MiB/)
  assert.throws(() => bundle.buildOAPreviewBundle({ pdf, pages: [png], layout: { ...layout, analyzerVersion: "x".repeat(5 * 1024 * 1024) } }), /5 MiB/)
  assert.throws(() => bundle.readOAPreviewBundle(Buffer.alloc(100 * 1024 * 1024), sourceSha256), /100 MiB/)
})

test("rejects malformed layout geometry and mismatched page numbering", () => {
  assert.throws(() => bundle.buildOAPreviewBundle({ pdf, pages: [png], layout: { ...layout, pages: [{ ...pageInfo, width: 0 }] } }), /页面|尺寸/)
  assert.throws(() => bundle.buildOAPreviewBundle({ pdf, pages: [png], layout: { ...layout, pages: [{ ...pageInfo, page: 2 }] } }), /页码/)
})

test("accepts only accessible absolute Poppler executable paths with exact basenames", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "oa-poppler-tools-"))
  const paths = Object.fromEntries(["pdfinfo", "pdftotext", "pdftoppm", "pdffonts"].map((name) => {
    const executable = path.join(directory, name)
    writeFileSync(executable, "tool")
    chmodSync(executable, 0o700)
    return [name, executable]
  }))
  const report = await tools.detectPreviewToolCapabilities({
    OA_PDFINFO_PATH: paths.pdfinfo,
    OA_PDFTOTEXT_PATH: paths.pdftotext,
    OA_PDFTOPPM_PATH: paths.pdftoppm,
    OA_PDFFONTS_PATH: paths.pdffonts,
  })
  assert.deepEqual(report, {
    pdfInfoPath: paths.pdfinfo,
    pdfTextPath: paths.pdftotext,
    pdfToPpmPath: paths.pdftoppm,
    pdfFontsPath: paths.pdffonts,
    unavailableReasons: [],
  })

  const rejected = await tools.detectPreviewToolCapabilities({
    OA_PDFINFO_PATH: "pdfinfo",
    OA_PDFTOTEXT_PATH: path.join(directory, "convert"),
    OA_PDFTOPPM_PATH: paths.pdftoppm,
    OA_PDFFONTS_PATH: paths.pdffonts,
  })
  assert.equal(rejected.pdfInfoPath, null)
  assert.equal(rejected.pdfTextPath, null)
  assert.match(rejected.unavailableReasons.join("；"), /绝对路径|允许范围/)
})

test("runs Poppler tools without a shell and parses bounded outputs", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "oa-poppler-wrappers-"))
  const makeTool = (name, body) => {
    const executable = path.join(directory, name)
    writeFileSync(executable, `#!/bin/sh\nset -eu\n${body}\n`)
    chmodSync(executable, 0o700)
    return executable
  }
  const caps = {
    pdfInfoPath: makeTool("pdfinfo", `printf 'Pages: 2\\nPage size: 300 x 400 pts\\nPage rot: 0\\n'`),
    pdfTextPath: makeTool("pdftotext", `printf '<doc><page width="300" height="400"><flow><block><line><word xMin="10" yMin="20" xMax="30" yMax="40">Name</word></line></block></flow></page></doc>'`),
    pdfToPpmPath: makeTool("pdftoppm", `prefix="$9"; printf '\\211PNG\\r\\n\\032\\npage1' > "\${prefix}-1.png"; printf '\\211PNG\\r\\n\\032\\npage2' > "\${prefix}-2.png"`),
    pdfFontsPath: makeTool("pdffonts", `printf 'name type encoding emb sub uni object ID\\n--------------------\\nSimSun TrueType WinAnsi yes no yes 10 0\\n'`),
    unavailableReasons: [],
  }
  assert.deepEqual(await tools.inspectPdf(pdf, caps), [
    { page: 1, width: 300, height: 400, rotation: 0 },
    { page: 2, width: 300, height: 400, rotation: 0 },
  ])
  assert.match(await tools.extractPdfBboxXml(pdf, caps), /<word/)
  assert.equal((await tools.renderPdfPages(pdf, caps)).length, 2)
  assert.deepEqual(await tools.inspectPdfFonts(pdf, caps), [{ name: "SimSun", type: "TrueType", encoding: "WinAnsi", embedded: true, subset: false, unicode: true, objectId: "10 0" }])
})

test("parses the complete common Poppler font type column", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "oa-poppler-font-types-"))
  const executable = path.join(directory, "pdffonts")
  const fontTypes = [
    "Type 1", "Type 1C", "Type 1C (OT)", "Type 3", "TrueType", "TrueType (OT)",
    "CID Type 0", "CID Type 0C", "CID Type 0C (OT)", "CID TrueType", "CID TrueType (OT)", "OpenType", "unknown",
  ]
  const rows = fontTypes.map((type, index) => `Fixture Font ${index + 1}  ${type}  Identity-H  yes  no  yes  ${index + 1}  0`).join("\n")
  writeFileSync(executable, `#!/bin/sh\nprintf '%s\\n' 'name type encoding emb sub uni object ID' '${rows}'\n`)
  chmodSync(executable, 0o700)
  const inspected = await tools.inspectPdfFonts(pdf, {
    pdfInfoPath: null,
    pdfTextPath: null,
    pdfToPpmPath: null,
    pdfFontsPath: executable,
    unavailableReasons: [],
  })
  assert.deepEqual(inspected.map((font) => font.type), fontTypes)
  assert.deepEqual(inspected.map((font) => font.name), fontTypes.map((_, index) => `Fixture Font ${index + 1}`))
})
