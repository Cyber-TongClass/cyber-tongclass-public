import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const workflow = await readFile(new URL("../convex/externalNewsSync.ts", import.meta.url), "utf8")
const review = await readFile(new URL("../convex/contentReview.ts", import.meta.url), "utf8")

for (const exportedName of [
  "runScheduled",
  "runNow",
  "getOperations",
  "saveSettings",
  "listMyReviewQueue",
  "getReviewDraft",
  "saveReviewDraft",
  "adoptPendingSnapshot",
  "decideReview",
  "ingestFetchedItem",
]) {
  assert.match(workflow, new RegExp(`export const ${exportedName}\\s*=`), `${exportedName} must be exported`)
}

assert.match(workflow, /EXTERNAL_NEWS_SOURCES/, "the action must use only fixed source descriptors")
assert.match(workflow, /externalNewsSyncLimits\(trigger\)/, "sync limits must depend on the run trigger")
assert.match(workflow, /page < limits\.maxPages/, "manual sync must be able to stop after the first source page")
assert.match(workflow, /slice\(0, limits\.maxItemsPerSource\)/, "manual sync must cap each source to its newest item")
assert.doesNotMatch(workflow, /args:\s*\{[^}]*url:\s*v\.string\(\)/s, "no action may accept an arbitrary fetch URL")
assert.match(workflow, /stage:\s*"source_review"/, "source review tasks must be explicit")
assert.match(review, /stage:\s*"publication_approval"/, "publication approval tasks must be explicit")
assert.match(review, /submission\.sourcePublishedAt \?\? now/, "external publication must retain the source date")
assert.doesNotMatch(workflow, /console\.(?:log|error|warn)/, "sync must not log fetched HTML or credentials")

console.log("external news backend source contracts: ok")
