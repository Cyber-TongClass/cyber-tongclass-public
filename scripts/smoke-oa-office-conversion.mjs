import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const output = mkdtempSync(path.join(tmpdir(), "oa-office-smoke-"))
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [path.join(root, "src/lib/server/office-capabilities.ts"), "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(output, "capabilities.cjs")}`])
const require = createRequire(import.meta.url)
const { detectOfficeCapabilities } = require(path.join(output, "capabilities.cjs"))
const report = await detectOfficeCapabilities()
console.log(JSON.stringify(report, null, 2))
