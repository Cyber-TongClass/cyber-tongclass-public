import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("login retries the legacy studentId contract when the generic identifier contract fails", () => {
  const source = readFileSync("src/lib/hooks/use-auth.ts", "utf8")

  assert.match(source, /loginMutation\(\{\s*identifier:\s*trimmedIdentifier,\s*password\s*:\s*password\s*,?\s*\}\)/)
  assert.match(source, /loginMutation\(\{\s*studentId:\s*trimmedIdentifier,\s*password\s*:\s*password\s*,?\s*\}\)/)
})
