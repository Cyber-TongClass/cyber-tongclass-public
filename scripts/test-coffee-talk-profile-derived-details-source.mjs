import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const [coffeeTalk, schema, form, applyClient, api] = await Promise.all([
  readFile("convex/coffeeTalk.ts", "utf8"),
  readFile("convex/schema.ts", "utf8"),
  readFile("src/components/coffee-talk/coffee-talk-application-form.tsx", "utf8"),
  readFile("src/components/coffee-talk/coffee-talk-apply-client.tsx", "utf8"),
  readFile("src/lib/api.ts", "utf8"),
])

function mutationBlock(source, name) {
  const marker = `export const ${name} = mutation({`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `${name} mutation is present`)
  const next = source.indexOf("export const ", start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

test("Coffee Talk trusts applicant details derived from the authenticated account", () => {
  const submitBlock = mutationBlock(coffeeTalk, "submitApplication")

  assert.match(coffeeTalk, /deriveCoffeeTalkApplicantProfile\(applicant\)/)
  assert.doesNotMatch(submitBlock, /applicantName:\s*v\.string\(\)/)
  assert.doesNotMatch(submitBlock, /affiliation:\s*v\.string\(\)/)
  assert.doesNotMatch(submitBlock, /identity:\s*v\.string\(\)/)
  assert.doesNotMatch(submitBlock, /email:\s*v\.string\(\)/)
  assert.match(schema, /applicantIdentity:\s*v\.optional\(/)
  assert.match(schema, /v\.literal\("teacher"\)/)
})

test("Coffee Talk application fields are read-only account data", () => {
  assert.match(form, /applicantProfile/)
  assert.match(form, /readOnly/)
  assert.doesNotMatch(form, /coffee-talk-applicant-name[\s\S]*?onChange/)
  assert.doesNotMatch(form, /coffee-talk-email[\s\S]*?onChange/)
  assert.match(applyClient, /useCurrentUser\(\)/)
  assert.match(api, /export type CoffeeTalkApplicationInput = \{[\s\S]*?teacherSlug: string/)
  assert.doesNotMatch(api, /export type CoffeeTalkApplicationInput = \{[\s\S]*?applicantName:/)
})
