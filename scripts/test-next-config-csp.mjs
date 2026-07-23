import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const expectedWebSocketOrigin = "wss://example-convex.convex.cloud"
const academicExchangePdfRoutes = [
  "/api/intranet/academic-exchange/*/pdf",
  "/api/reviewer/academic-exchange/*/pdf",
  "/api/reviewer/academic-exchange/export",
]
const expectedPdfRuntimeAssets = [
  "./public/templates/academic-exchange-application-form-template.pdf",
  "./public/fonts/FZFSK.TTF",
  "./public/fonts/FZSSK.TTF",
  "./public/fonts/FZHTK.TTF",
  "./public/fonts/FZKTK.TTF",
]

const script = `
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://example-convex.convex.cloud"
  const config = require(${JSON.stringify(path.join(projectRoot, "next.config.js"))})
  config.headers().then((headers) => {
    const csp = headers[0].headers.find((header) => header.key === "Content-Security-Policy").value
    process.stdout.write(JSON.stringify({ csp, outputFileTracingIncludes: config.outputFileTracingIncludes }))
  })
`

const result = spawnSync(process.execPath, ["-e", script], {
  cwd: projectRoot,
  encoding: "utf8",
})

assert.equal(result.status, 0, result.stderr)
const configOutput = JSON.parse(result.stdout)
assert.match(configOutput.csp, new RegExp(expectedWebSocketOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))

for (const route of academicExchangePdfRoutes) {
  assert.deepEqual(
    configOutput.outputFileTracingIncludes?.[route],
    expectedPdfRuntimeAssets,
    `The ${route} Serverless function must include the PDF template and FZ fonts`
  )
}

console.log("Next.js CSP and PDF runtime assets are configured.")
