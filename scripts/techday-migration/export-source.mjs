#!/usr/bin/env node

import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs"
import { join, relative } from "node:path"

const args = new Map()
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1])
}

const uploadsDir = args.get("--uploads")
const outDir = args.get("--out") || "techday-export"

if (!uploadsDir || !existsSync(uploadsDir)) {
  console.error("Missing --uploads <dir>. Database extraction should be done from a reviewed dump process.")
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      walk(fullPath)
    } else {
      const bytes = readFileSync(fullPath)
      files.push({
        path: relative(uploadsDir, fullPath),
        size: stat.size,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      })
    }
  }
}

walk(uploadsDir)
writeFileSync(join(outDir, "files.json"), JSON.stringify(files, null, 2))
writeFileSync(join(outDir, "README.txt"), "Add reviewed SQL table JSON exports next to files.json before import.\n")
console.log(`Wrote ${files.length} file manifest rows to ${outDir}`)
