import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = (path) => readFileSync(path, "utf8")

test("new AIA components use icon names and prop types supported by the installed Lucide version", () => {
  for (const path of [
    "src/components/coffee-talk/coffee-talk-application-form.tsx",
    "src/components/coffee-talk/coffee-talk-backend-unavailable-state.tsx",
  ]) {
    const file = source(path)
    assert.match(file, /AlertCircle/)
    assert.doesNotMatch(file, /CircleAlert/)
  }

  const directoryPreview = source("src/components/institute/institute-directory-preview.tsx")
  assert.match(directoryPreview, /type\s+LucideIcon/)
  assert.doesNotMatch(directoryPreview, /ComponentType<\{ className\?: string; "aria-hidden"\?: boolean \}>/)
})
