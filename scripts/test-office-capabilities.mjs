import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { PassThrough } from "node:stream"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const output = mkdtempSync(path.join(tmpdir(), "oa-office-test-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/office-capabilities.ts"), path.join(root, "src/lib/server/office-conversion.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${output}`])
const require = createRequire(import.meta.url)
const capabilitiesModule = require(path.join(output, "office-capabilities.js"))
const conversionModule = require(path.join(output, "office-conversion.js"))

test("missing and unsafe LibreOffice configuration has explicit Chinese reasons", async () => {
  const missing = await capabilitiesModule.detectOfficeCapabilities({})
  assert.equal(missing.canExportPdf, false)
  assert.match(missing.unavailableReasons.join("；"), /未配置 LibreOffice/)
  const unsafe = await capabilitiesModule.detectOfficeCapabilities({ LIBREOFFICE_PATH: "/tmp/browser-supplied-tool" })
  assert.equal(unsafe.libreOfficePath, null)
  assert.match(unsafe.unavailableReasons.join("；"), /允许范围/)
})

test("font inventory and missing required fonts gate conversions", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "oa-fonts-"))
  writeFileSync(path.join(directory, "SimSun.ttf"), "font")
  const fonts = await capabilitiesModule.inventoryOfficeFonts(directory)
  assert.deepEqual(fonts, ["SimSun"])
  const report = await capabilitiesModule.detectOfficeCapabilities({ OA_TEMPLATE_FONT_DIR: directory, OA_TEMPLATE_REQUIRED_FONTS: "SimSun, FangSong" })
  assert.deepEqual(report.missingFonts, ["FangSong"])
  assert.equal(report.canExportLegacyDoc, false)
})

test("font capability matching uses internal family and PostScript aliases", async () => {
  const aliases = await capabilitiesModule.resolveOfficeFontAliases(["Times New Roman", "宋体"], "/definitely/missing")
  assert.ok(aliases["Times New Roman"].some((value) => /Times New Roman|TimesNewRoman/i.test(value)))
  assert.ok(aliases["宋体"].some((value) => /宋体|Songti/i.test(value)))
  assert.deepEqual(capabilitiesModule.missingConvertedPdfFonts(["Times New Roman"], aliases, ["ABCDEF+TimesNewRomanPSMT"]), [])
  assert.deepEqual(capabilitiesModule.missingConvertedPdfFonts(["Times New Roman"], aliases, ["ABCDEF+TimesNewRomanPS-BoldMT"]), [])
  assert.deepEqual(capabilitiesModule.missingConvertedPdfFonts(["宋体"], aliases, ["ABCDEF+STSongti-SC-Bold"]), [])
  assert.doesNotMatch(aliases["宋体"][0], /Regular|常规|標準/u)
  assert.deepEqual(capabilitiesModule.missingConvertedPdfFonts(["Times New Roman"], aliases, ["ABCDEF+LiberationSerif"]), ["Times New Roman"])
  const bogus = await capabilitiesModule.resolveOfficeFontAliases(["Regular"], "/definitely/missing")
  assert.equal(bogus.Regular, undefined)
})

test("recognizes the explicit compatible family aliases used by common Chinese Word templates", () => {
  assert.ok(capabilitiesModule.compatibleOfficeFontNames("仿宋").includes("方正仿宋_GBK"))
  assert.ok(capabilitiesModule.compatibleOfficeFontNames("仿宋_GB2312").includes("FZFangSong-Z02"))
  assert.deepEqual(capabilitiesModule.missingConvertedPdfFonts(["仿宋"], { 仿宋: ["FZFSK--GBK1-0"] }, ["ABCDEF+FZFSK--GBK1-0"]), [])
})

function fakeChild({ code = 0, delay = 0, stderr = "", onSpawn }) {
  const child = new EventEmitter()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.kill = () => { setImmediate(() => child.emit("close", null)); return true }
  setTimeout(() => {
    onSpawn?.()
    if (stderr) child.stderr.write(stderr)
    child.stdout.end(); child.stderr.end(); child.emit("close", code)
  }, delay)
  return child
}

const ready = { libreOfficePath: "/usr/bin/soffice", fontDirectory: "/fonts", installedFonts: ["SimSun"], fontAliases: {}, missingFonts: [], unavailableReasons: [], canAnalyze: true, canCompile: true, canExportDocx: true, canExportLegacyDoc: true, canExportPdf: true }

test("conversion detects timeout and unexpected output while preserving source bytes", async () => {
  const source = Buffer.from("original-doc")
  const unchanged = Buffer.from(source)
  await assert.rejects(() => conversionModule.convertOfficeDocument(source, "表格.doc", "docx", { capabilities: ready, timeoutMs: 5, spawnImpl: () => fakeChild({ delay: 30 }) }), /超时/)
  await assert.rejects(() => conversionModule.convertOfficeDocument(source, "表格.doc", "docx", { capabilities: ready, spawnImpl: () => fakeChild({}) }), /预期文件/)
  assert.deepEqual(source, unchanged)
})

test("conversion reports non-zero exit without a shell", async () => {
  await assert.rejects(() => conversionModule.convertOfficeDocument(Buffer.from("doc"), "a.doc", "docx", { capabilities: ready, spawnImpl: () => fakeChild({ code: 2, stderr: "bad input" }) }), /bad input/)
})
