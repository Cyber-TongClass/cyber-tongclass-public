import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const [coffeeTalk, schema, form, applyClient, api, myClient, teacherClient] = await Promise.all([
  readFile("convex/coffeeTalk.ts", "utf8"),
  readFile("convex/schema.ts", "utf8"),
  readFile("src/components/coffee-talk/coffee-talk-application-form.tsx", "utf8"),
  readFile("src/components/coffee-talk/coffee-talk-apply-client.tsx", "utf8"),
  readFile("src/lib/api.ts", "utf8"),
  readFile("src/components/coffee-talk/coffee-talk-my-client.tsx", "utf8"),
  readFile("src/components/coffee-talk/coffee-talk-teacher-manage-client.tsx", "utf8"),
])

function mutationBlock(source, name) {
  const marker = `export const ${name} = mutation({`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `${name} mutation is present`)
  const next = source.indexOf("export const ", start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

function inputBlock(source, id) {
  const start = source.indexOf(`id="${id}"`)
  assert.notEqual(start, -1, `${id} input is present`)
  const end = source.indexOf("/>", start)
  assert.notEqual(end, -1, `${id} input closes`)
  return source.slice(start, end)
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
  assert.doesNotMatch(inputBlock(form, "coffee-talk-applicant-name"), /onChange/)
  assert.doesNotMatch(inputBlock(form, "coffee-talk-email"), /onChange/)
  assert.match(applyClient, /useCurrentUser\(\)/)
  assert.match(api, /export type CoffeeTalkApplicationInput = \{[\s\S]*?teacherSlug: string/)
  assert.doesNotMatch(api, /export type CoffeeTalkApplicationInput = \{[\s\S]*?applicantName:/)
})

test("Coffee Talk history renders current applicant details instead of snapshots", () => {
  assert.match(coffeeTalk, /getCurrentApplicantProfile\(ctx, application\)/)
  assert.match(coffeeTalk, /applicant: applicant/)
  assert.match(myClient, /申请资料：/)
  assert.match(myClient, /application\.applicant\.applicantName/)
  assert.match(teacherClient, /application\.applicant\.applicantName/)
  assert.match(teacherClient, /application\.contact\.email/)
})
