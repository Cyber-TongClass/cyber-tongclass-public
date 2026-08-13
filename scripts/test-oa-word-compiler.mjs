import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const outDir = mkdtempSync(path.join(tmpdir(), "oa-word-compile-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/oa-word-compiler.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${outDir}`])
const require = createRequire(import.meta.url)
const compiler = require(path.join(outDir, "oa-word-compiler.js"))
const detection = require(path.join(outDir, "oa-word-compiler.js"))
const { buildSimpleZip } = require(path.join(root, "src/lib/server/simple-zip.ts"))
const pkgModule = (() => { const d = mkdtempSync(path.join(tmpdir(), "pkg-")); execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/ooxml-package.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${d}`]); return require(path.join(d, "ooxml-package.js")) })()

const xml = `<?xml version="1.0"?><x:document xmlns:x="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><x:body><x:p><x:r><x:t>姓名：</x:t></x:r></x:p></x:body></x:document>`
const types = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
const bytes = buildSimpleZip([{ name: "[Content_Types].xml", data: types }, { name: "_rels/.rels", data: rels }, { name: "word/document.xml", data: xml }, { name: "word/styles.xml", data: "UNCHANGED" }])

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
