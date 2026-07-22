import assert from "node:assert/strict"
import { createRequire } from "node:module"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)
const nextConfig = require(path.join(projectRoot, "next.config.js"))

const pdfRoutes = [
  "/api/intranet/academic-exchange/*/pdf",
  "/api/reviewer/academic-exchange/*/pdf",
  "/api/reviewer/academic-exchange/export",
]

const runtimeAssets = [
  "./public/templates/academic-exchange-application-form-template.pdf",
  "./public/fonts/FZFSK.TTF",
  "./public/fonts/FZSSK.TTF",
  "./public/fonts/FZHTK.TTF",
  "./public/fonts/FZKTK.TTF",
]

test("PDF API functions trace their template and FZ fonts", () => {
  for (const route of pdfRoutes) {
    assert.deepEqual(nextConfig.outputFileTracingIncludes?.[route], runtimeAssets)
  }
})
