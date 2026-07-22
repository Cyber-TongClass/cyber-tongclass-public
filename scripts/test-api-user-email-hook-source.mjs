import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/lib/api.ts", "utf8")
const marker = "export function useGetUserByEmail"
const start = source.indexOf(marker)
const end = source.indexOf("export function ", start + marker.length)
const hook = source.slice(start, end === -1 ? undefined : end)

test("legacy email lookup delegates to the session-aware account hook", () => {
  assert.notEqual(start, -1, "legacy email hook exists for compatibility")
  assert.match(hook, /return useUserByEmail\(email\)/)
  assert.doesNotMatch(hook, /api\.auth\.getUserByEmail/)
})
