import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const source = await readFile(new URL("../convex/oaForms.ts", import.meta.url), "utf8")
const manageGet = source.slice(source.indexOf("export const manageGet"), source.indexOf("export const manageUpsert"))

test("manageGet returns null for stale or foreign deployment form IDs", () => {
  assert.match(manageGet, /args:\s*\{\s*sessionToken:\s*v\.string\(\),\s*id:\s*v\.string\(\)/)
  assert.match(manageGet, /ctx\.db\.normalizeId\("oaForms",\s*args\.id\)/)
  assert.match(manageGet, /if\s*\(!normalizedId\)\s*return null/)
  assert.match(manageGet, /ctx\.db\.get\(normalizedId\)/)
})
