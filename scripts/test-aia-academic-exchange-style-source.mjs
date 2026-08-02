import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const files = [
  "src/components/reimbursements/academic-exchange-list-client.tsx",
  "src/components/reimbursements/academic-exchange-form-client.tsx",
  "src/components/reimbursements/academic-exchange-detail-client.tsx",
  "src/components/reimbursements/academic-exchange-edit-client.tsx",
  "src/components/reimbursements/reimbursement-expense-items.tsx",
  "src/components/reimbursements/reimbursement-file-upload-field.tsx",
]

const sources = Object.fromEntries(files.map((file) => [file, readFileSync(file, "utf8")]))

for (const [file, source] of Object.entries(sources)) {
  if (file.includes("reimbursement-expense") || file.includes("reimbursement-file")) {
    assert.match(source, /aia-border-rule|aia-text-muted|aia-bg-tag/, `${file} must use shared AIA tokens`)
    assert.doesNotMatch(source, /text-slate-|bg-slate-|border-slate-/, `${file} must not reintroduce the slate palette`)
    continue
  }
  assert.match(source, /aia-scope/, `${file} must opt into the existing AIA typography and token scope`)
  assert.match(source, /aia-serif/, `${file} must use the existing editorial serif for its page heading`)
  assert.match(source, /aia-mono/, `${file} must use the existing mono treatment for metadata or section markers`)
  assert.match(source, /aia-border-rule/, `${file} must use AIA hairline separators`)
  assert.doesNotMatch(source, /@\/components\/ui\/card/, `${file} must not import the Card visual primitive`)
  assert.doesNotMatch(source, /<(?:Card|CardHeader|CardTitle|CardContent)\b/, `${file} must not render nested cards`)
  assert.doesNotMatch(
    source,
    /\b(?:shadow(?:-\w+)?|bg-primary|text-slate-\d+|border-slate-\d+|bg-slate-\d+|bg-\[hsl\(211,30%,97%\)\])\b/,
    `${file} must not retain the slate/card/blue-hero visual language`,
  )
}

const listSource = sources[files[0]]
assert.match(listSource, /aia-bg-tag/, "resource links should use the existing quiet AIA tag token")
assert.doesNotMatch(listSource, />\s*ACADEMIC\s*</, "the independent blue ACADEMIC hero must be removed")
assert.match(listSource, /role="status"/, "the list loading state must remain accessible")

const formSource = sources[files[1]]
const labelIds = [...formSource.matchAll(/<Label\s+htmlFor="([^"]+)"/g)].map((match) => match[1])
assert.ok(labelIds.length >= 15, "the application form should explicitly associate all field labels")
for (const id of labelIds) {
  assert.match(formSource, new RegExp(`\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `label target #${id} must exist`)
}
assert.doesNotMatch(formSource, /<Label(?:\s*)>/, "form labels must not be left without htmlFor")
assert.match(formSource, /aria-live="polite"/, "submission and validation feedback must be announced")

const detailSource = sources[files[2]]
assert.match(detailSource, /role="status"/, "detail loading and operation feedback must remain accessible")
assert.match(detailSource, /aia-bg-tag/, "application status should use the existing quiet AIA tag token")

const editSource = sources[files[3]]
assert.match(editSource, /aria-live="polite"/, "correction feedback must be announced")
assert.doesNotMatch(editSource, /text-slate-|bg-slate-|<Card\b/, "the correction surface must use the AIA hairline language")

console.log("AIA academic-exchange hairline style source checks passed")
