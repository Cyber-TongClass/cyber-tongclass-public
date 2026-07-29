import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const contentFiles = [
  "src/components/content/audience-tabs.tsx",
  "src/components/content/news-timeline.tsx",
  "src/components/content/publication-archive.tsx",
]

function source(path) {
  return readFileSync(path, "utf8")
}

test("research and updates content uses the AIA editorial palette", () => {
  for (const path of contentFiles) {
    const content = source(path)

    assert.match(content, /--aia-(?:paper|ink|rule|muted|red|tag)/, `${path} should use AIA color tokens`)
    assert.doesNotMatch(content, /(?:bg|text|border|ring|placeholder:text)-slate-\d+/, `${path} should not use slate colors`)
    assert.doesNotMatch(content, /(?:bg|text|border|ring)-primary(?:\/\d+)?/, `${path} should not use Tong Class primary colors`)
    assert.doesNotMatch(content, /\bbg-white(?!\/)/, `${path} should use the AIA paper color instead of white`)
  }
})
