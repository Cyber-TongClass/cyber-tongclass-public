import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const academic = readFileSync("convex/academicExchange.ts", "utf8")
const forms = readFileSync("convex/oaForms.ts", "utf8")
const schema = readFileSync("convex/schema.ts", "utf8")

test("new academic exchange applications create one idempotent unified OA bridge", () => {
  assert.match(schema, /oaSubmissionId:\s*v\.optional\(v\.id\("oaFormSubmissions"\)\)/)
  assert.match(schema, /\.index\("by_oaSubmissionId",\s*\["oaSubmissionId"\]\)/)
  assert.match(academic, /createAcademicExchangeOABridge/)
  assert.match(academic, /const idempotencyKey = `academic-exchange:/)
  assert.match(academic, /submissionIdempotencyKey:\s*idempotencyKey/)
  assert.match(academic, /await startOAWorkflow/)
  assert.match(academic, /oaSubmissionId/)
})

test("bridge resolves only explicit reimbursement managers", () => {
  assert.match(academic, /\.eq\("category",\s*"reimbursement"\)/)
  assert.match(academic, /permission\.canManage\s*===\s*true/)
  const resolver = academic.slice(
    academic.indexOf("async function currentAcademicExchangeOAReviewerIds"),
    academic.indexOf("async function academicExchangeOAForm"),
  )
  assert.doesNotMatch(resolver, /role\s*===\s*"super_admin"/)
  assert.match(academic, /completion:\s*"any"/)
})

test("unified OA decisions synchronize the fixed reimbursement application", () => {
  assert.match(forms, /syncAcademicExchangeFromOASubmission/)
  assert.match(forms, /by_oaSubmissionId/)
  assert.match(forms, /needs_changes[\s\S]*approved[\s\S]*rejected/)
  assert.match(forms, /requireReimbursementRight\(ctx,\s*actor,\s*"canManage"\)/)
})

test("legacy reviewer writes are historical-only and applicant revision resumes OA", () => {
  assert.match(academic, /application\.oaSubmissionId[\s\S]*请在统一 OA 审核台处理/)
  assert.match(academic, /resumeAcademicExchangeOABridge/)
  assert.match(academic, /await resumeOAWorkflow/)
  assert.match(academic, /cancelAcademicExchangeOABridge/)
})
