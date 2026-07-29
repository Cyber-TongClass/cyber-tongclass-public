import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(path, "utf8")

test("OA approval actions require replay protection and return stable stale results", () => {
  const schema = read("convex/schema.ts")
  const forms = read("convex/oaForms.ts")
  const api = read("src/lib/api.ts")

  assert.match(schema, /actionIdempotencyKey:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(schema, /actionRequestFingerprint:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(forms, /idempotencyKey:\s*v\.string\(\)/)
  assert.match(forms, /reason:\s*"stale_version"/)
  assert.match(forms, /reason:\s*"idempotency_conflict"/)
  assert.match(api, /idempotencyKey:\s*string/)
  assert.match(api, /idempotencyKey:\s*args\.idempotencyKey/)
})

test("OA approval UI renders field labels and handles no-op outcomes honestly", () => {
  const approvals = read("src/components/oa/aia-oa-approval-inbox-client.tsx")

  assert.match(approvals, /formFields/)
  assert.match(approvals, /field\.label/)
  assert.match(approvals, /result\.updated/)
  assert.match(approvals, /stale_version/)
  assert.match(approvals, /crypto\.randomUUID/)
  assert.match(approvals, /disabled=\{busyIds\.has\(item\.taskId\)\}/)
})

test("OA submit success becomes a locked completion state with a detail destination", () => {
  const submission = read("src/components/oa/aia-oa-form-submission-client.tsx")

  assert.match(submission, /submittedId/)
  assert.match(submission, /services\/oa\/submissions/)
  assert.match(submission, /查看本次提交/)
  assert.match(submission, /!submittedId && collecting/)
  assert.match(submission, /withReturnTo/)
})
