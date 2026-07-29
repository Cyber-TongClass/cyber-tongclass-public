import { cpSync, existsSync, mkdirSync } from "node:fs"
import { spawn } from "node:child_process"
import { resolve } from "node:path"

const root = process.cwd()
const serverPath = resolve(root, ".next/standalone/server.js")
const staticSource = resolve(root, ".next/static")
const publicSource = resolve(root, "public")
const standaloneRoot = resolve(root, ".next/standalone")

for (const requiredPath of [serverPath, staticSource, publicSource]) {
  if (!existsSync(requiredPath)) {
    throw new Error(`缺少构建产物：${requiredPath}。请先运行 npm run build 或 npx next build。`)
  }
}

mkdirSync(resolve(standaloneRoot, ".next"), { recursive: true })
cpSync(staticSource, resolve(standaloneRoot, ".next/static"), { recursive: true })
cpSync(publicSource, resolve(standaloneRoot, "public"), { recursive: true })

const server = spawn(process.execPath, [serverPath], {
  cwd: standaloneRoot,
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
    PORT: process.env.PORT || "3000",
  },
  stdio: "inherit",
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal))
}

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exitCode = code ?? 1
})
