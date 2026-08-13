import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("teacher profiles show directly related papers and corresponding role", async () => {
  const [profile, liveProfile, viewModel, outputList, demoTypes] = await Promise.all([
    readFile(new URL("../src/components/institute/person-profile.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/institute/live-person-profile.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/institute/live-directory-view-model.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/institute/research-output-list.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/institute/demo-directory-data.ts", import.meta.url), "utf8"),
  ])
  assert.match(profile, /person\.kind === "teacher"[\s\S]*heading="相关论文"/)
  assert.match(liveProfile, /toDirectoryResearchOutput\(item, `\/people\/\$\{slug\}`, slug\)/)
  assert.doesNotMatch(liveProfile, /researchGroupSlug/)
  assert.match(viewModel, /isCorrespondingContributor/)
  assert.match(viewModel, /profile\.slug === personSlug/)
  assert.match(outputList, /isCorrespondingContributor[\s\S]*通讯作者/)
  assert.match(demoTypes, /isCorrespondingContributor\?: boolean/)
})
