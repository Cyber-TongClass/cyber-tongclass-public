import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/institute/home-live-research.tsx", "utf8")

test("homepage research authors are rendered through the shared metadata decoder", () => {
  assert.match(source, /import\s*\{\s*formatPublicationAuthorsForText\s*\}\s*from\s*["']@\/lib\/publication-authors["']/)
  assert.match(source, /\{formatPublicationAuthorsForText\(item\.authors\)\}/)
  assert.doesNotMatch(source, /\{item\.authors\.join\(["']、["']\)\}/)
})
