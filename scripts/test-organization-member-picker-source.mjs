import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync("src/app/organization/manage/page.tsx", "utf8")

assert.match(source, /<input[\s\S]*list="add-member-candidates"/)
assert.match(source, /<datalist id="add-member-candidates">/)
assert.match(source, /<option key=\{user\.id\} value=\{user\.username\}>/)
assert.match(source, /candidate\.username\.toLocaleLowerCase\(\) === normalizedCandidateQuery/)
assert.match(source, /candidate\.name\.toLocaleLowerCase\(\) === normalizedCandidateQuery/)
assert.doesNotMatch(source, /<select[\s\S]*id="add-member-select"/)

console.log("Organization member picker supports typing and dropdown selection")
