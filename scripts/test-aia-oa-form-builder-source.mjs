import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(
  new URL("../src/components/oa-forms/oa-form-builder.tsx", import.meta.url),
  "utf8",
)

assert.doesNotMatch(source, /@\/components\/ui\/card/, "the AIA builder must not use legacy Card containers")
assert.doesNotMatch(source, /\b(?:bg|text|border)-slate-/, "the AIA builder must use semantic AIA color tokens")
assert.match(source, /aria-labelledby="oa-form-basic-title"/, "basic information must be a named region")
assert.match(source, /aria-labelledby="oa-form-fields-title"/, "field builder must be a named region")
assert.match(source, /aria-labelledby="oa-form-results-title"/, "result fields must be a named region")
assert.match(source, /htmlFor=/, "form controls must have programmatic labels")
assert.match(source, /aria-expanded=/, "field disclosure controls must expose their state")
assert.match(source, /aria-controls=/, "field disclosure controls must point to their editor")
assert.match(source, /role="status"/, "save feedback must be announced")
assert.match(source, /min-h-11/, "compact actions must retain touch-sized targets")
assert.match(source, /aia-border-rule/, "the builder must use the AIA hairline rule")

console.log("AIA OA form builder source contract passed")
