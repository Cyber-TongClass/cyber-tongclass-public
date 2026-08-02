import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("research group outputs hide summaries and title underlines without changing shared defaults", () => {
  const groupProfile = read("src/components/institute/research-group-profile.tsx")
  const outputList = read("src/components/institute/research-output-list.tsx")

  assert.match(
    groupProfile,
    /<ResearchOutputList[\s\S]*showSummary=\{false\}[\s\S]*underlineTitleLinks=\{false\}/,
  )
  assert.match(outputList, /showSummary = true/)
  assert.match(outputList, /underlineTitleLinks = true/)
  assert.match(outputList, /showSummary \?/)
  assert.match(outputList, /underlineTitleLinks\s*\?/)
})

test("teacher profiles stop after research directions while other profiles keep related content", () => {
  const personProfile = read("src/components/institute/person-profile.tsx")

  assert.match(
    personProfile,
    /\{person\.kind !== "teacher" \? \([\s\S]*person-groups-title[\s\S]*person-updates-title[\s\S]*\) : null\}/,
  )
})
