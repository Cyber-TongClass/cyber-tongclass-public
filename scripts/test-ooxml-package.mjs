import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { deflateRawSync } from "node:zlib"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const out = path.join(mkdtempSync(path.join(tmpdir(), "ooxml-package-")), "package.cjs")
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/server/ooxml-package.ts"),
  path.join(root, "src/lib/server/ooxml-security.ts"),
  "--bundle", "--platform=node", "--format=cjs", "--outdir=" + path.dirname(out),
])
const require = createRequire(import.meta.url)
const zip = require(path.join(path.dirname(out), "ooxml-package.js"))
const security = require(path.join(path.dirname(out), "ooxml-security.js"))

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()
function crc32(data) {
  let c = 0xffffffff
  for (const b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function makeZip(entries) {
  const local = [], central = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const raw = Buffer.from(entry.data ?? "")
    const method = entry.method ?? 0
    const body = method === 8 ? deflateRawSync(raw) : raw
    const flags = entry.flags ?? 0x800
    const crc = entry.badCrc ? (crc32(raw) ^ 1) >>> 0 : crc32(raw)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(flags, 6); lh.writeUInt16LE(method, 8)
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26)
    local.push(lh, name, body)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(flags, 8); ch.writeUInt16LE(method, 10)
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28)
    ch.writeUInt32LE(entry.badOffset ? 0xfffffff0 : offset, 42)
    central.push(ch, name)
    offset += lh.length + name.length + body.length
  }
  const cd = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, cd, eocd])
}

const contentTypes = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
const rootRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
const documentXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/></w:body></w:document>`
const safeDocx = (extra = []) => makeZip([
  { name: "[Content_Types].xml", data: contentTypes },
  { name: "_rels/.rels", data: rootRels, method: 8 },
  { name: "word/document.xml", data: documentXml, method: 8 },
  ...extra,
])

test("reads stored and deflated entries and rebuilds replacements", () => {
  const pkg = zip.readOoxmlPackage(safeDocx())
  assert.match(pkg.readText("word/document.xml"), /w:document/)
  assert.equal(pkg.entries.get("_rels/.rels").compressionMethod, 8)
  security.assertSafeDocxPackage(pkg)
  const changed = pkg.replaceEntries(new Map([["word/document.xml", documentXml.replace("<w:p/>", "<w:p><w:r/></w:p>")]]))
  const roundTrip = zip.readOoxmlPackage(changed)
  assert.match(roundTrip.readText("word/document.xml"), /w:r/)
})

test("rejects malformed and hostile ZIP structures", () => {
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "a", data: "x", badCrc: true }])), /CRC/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "a", data: "x" }, { name: "a", data: "y" }])), /重复/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "../a", data: "x" }])), /路径/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "/a", data: "x" }])), /绝对路径/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "a", data: "x", flags: 1 }])), /加密/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "a", data: "x", badOffset: true }])), /偏移/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "a", data: "x", method: 8 }]), { maxCompressionRatio: 0.2 }), /压缩比/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "a", data: "x" }]), { maxEntries: 0 }), /条目/)
  assert.throws(() => zip.readOoxmlPackage(makeZip([{ name: "a", data: "123" }]), { maxExtractedBytes: 2 }), /解压/)
})

test("rejects unsafe OOXML active content and XML declarations", () => {
  security.assertSafeDocxPackage(zip.readOoxmlPackage(safeDocx()))
  assert.throws(() => security.assertSafeDocxPackage(zip.readOoxmlPackage(safeDocx([{ name: "word/vbaProject.bin", data: "macro" }]))), /宏/)
  assert.throws(() => security.assertSafeDocxPackage(zip.readOoxmlPackage(safeDocx([{ name: "word/embeddings/oleObject1.bin", data: "ole" }]))), /嵌入对象/)
  const evil = `<!DOCTYPE x [<!ENTITY p SYSTEM "file:///etc/passwd">]>${documentXml}`
  assert.throws(() => security.assertSafeDocxPackage(zip.readOoxmlPackage(makeZip([
    { name: "[Content_Types].xml", data: contentTypes }, { name: "_rels/.rels", data: rootRels }, { name: "word/document.xml", data: evil },
  ]))), /DTD|实体/)
})

test("allows safe web hyperlinks but rejects packages and unsafe external relationships", () => {
  const safeRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.ai.pku.edu.cn/" TargetMode="External"/></Relationships>`
  security.assertSafeDocxPackage(zip.readOoxmlPackage(safeDocx([{ name: "word/_rels/document.xml.rels", data: safeRels }])))
  const packageRels = safeRels.replace("relationships/hyperlink", "relationships/package").replace("https://www.ai.pku.edu.cn/", "file:///tmp/payload")
  assert.throws(() => security.assertSafeDocxPackage(zip.readOoxmlPackage(safeDocx([{ name: "word/_rels/document.xml.rels", data: packageRels }]))), /外部关系|嵌入包/)
})
