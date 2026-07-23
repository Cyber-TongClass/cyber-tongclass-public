import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const configPath = path.join(projectRoot, "next.config.js")

function getCsp(nodeEnv) {
  const script = `
    const config = require(${JSON.stringify(configPath)})
    config.headers().then((headers) => {
      const csp = headers[0].headers.find((header) => header.key === "Content-Security-Policy").value
      process.stdout.write(csp)
    })
  `
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: nodeEnv },
  })

  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}

assert.match(getCsp("development"), /script-src[^;]*'unsafe-eval'/)
assert.doesNotMatch(getCsp("production"), /script-src[^;]*'unsafe-eval'/)

console.log("Next.js CSP enables eval only for development.")
