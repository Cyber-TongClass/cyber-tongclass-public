#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const args = new Map()
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1])
}

const inputDir = args.get("--input")
if (!inputDir || !existsSync(inputDir)) {
  console.error("Missing --input <export-dir>")
  process.exit(1)
}

const filesPath = join(inputDir, "files.json")
const files = existsSync(filesPath) ? JSON.parse(readFileSync(filesPath, "utf8")) : []

console.log("TechDay Convex import dry-run")
console.log(`Files in manifest: ${files.length}`)
console.log("Implement table imports with Convex mutations that upsert by legacyId/source mapping.")
