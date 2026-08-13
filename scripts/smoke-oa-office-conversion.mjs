import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { PassThrough } from "node:stream"

const root = path.resolve(import.meta.dirname, "..")
const output = mkdtempSync(path.join(tmpdir(), "oa-office-smoke-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/office-capabilities.ts"), path.join(root, "src/lib/server/office-conversion.ts"), "--bundle", "--platform=node", "--format=cjs", `--outdir=${output}`])
const require = createRequire(import.meta.url)
const { detectOfficeCapabilities } = require(path.join(output, "office-capabilities.js"))
const { convertOfficeDocument } = require(path.join(output, "office-conversion.js"))
const report = await detectOfficeCapabilities()
console.log(JSON.stringify(report, null, 2))

const child = new EventEmitter()
child.stdout = new PassThrough()
child.stderr = new PassThrough()
child.kill = () => true
let invocation
await assert.rejects(() => convertOfficeDocument(Buffer.from("doc"), "fixture.doc", "docx", {
  capabilities: { libreOfficePath: "/usr/bin/soffice", fontDirectory: "/fonts", installedFonts: ["SimSun"], missingFonts: [], unavailableReasons: [], canAnalyze: true, canCompile: true, canExportDocx: true, canExportLegacyDoc: true, canExportPdf: true },
  spawnImpl(command, args, options) {
    invocation = { command, args, options }
    setImmediate(() => {
      child.stdout.end()
      child.stderr.end()
      child.emit("close", 0)
    })
    return child
  },
}), /预期文件/)
const profileArgs = invocation.args.filter((argument) => argument.startsWith("-env:UserInstallation=file://"))
assert.equal(profileArgs.length, 1)
assert.match(profileArgs[0], /\/profile$/)
assert.equal(invocation.args.includes("--headless"), true)
