import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { join, relative } from "node:path"
import test from "node:test"

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "_generated" ? [] : collectTypeScriptFiles(path)
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : []
  })
}

test("Convex module paths contain only deployment-safe filename characters", () => {
  const invalidPaths = collectTypeScriptFiles("convex")
    .map((path) => relative("convex", path))
    .filter((path) => !/^[A-Za-z0-9_./]+$/.test(path))

  assert.deepEqual(invalidPaths, [])
})
