import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const publicationAuthors = await import("../src/lib/publication-authors.ts")
const editorSource = await readFile(
  new URL("../src/components/publications/publication-author-editor.tsx", import.meta.url),
  "utf8",
)

test("publication author matching safely normalizes incomplete account names", () => {
  const normalize = publicationAuthors.normalizePublicationAuthorSearchValue
  assert.equal(typeof normalize, "function")
  assert.equal(normalize(undefined), "")
  assert.equal(normalize(null), "")
  assert.equal(normalize("  Guangyuan Jiang  "), "guangyuan jiang")
})

test("publication author editor uses the shared null-safe normalizer", () => {
  assert.match(editorSource, /normalizePublicationAuthorSearchValue/)
  assert.doesNotMatch(editorSource, /function normalize\(value:\s*string\)/)
})
