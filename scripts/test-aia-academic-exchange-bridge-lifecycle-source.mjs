import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const academic = readFileSync("convex/academicExchange.ts", "utf8")
const forms = readFileSync("convex/oaForms.ts", "utf8")
const schema = readFileSync("convex/schema.ts", "utf8")
const api = readFileSync("src/lib/api.ts", "utf8")
const formClient = readFileSync("src/components/reimbursements/academic-exchange-form-client.tsx", "utf8")

test("academic exchange creation has a client-stable idempotency key and backend fingerprint", () => {
  assert.match(schema, /creationIdempotencyKey:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(schema, /creationRequestFingerprint:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(schema, /\.index\("by_user_idempotency",\s*\["userId",\s*"creationIdempotencyKey"\]\)/)
  assert.match(academic, /idempotencyKey:\s*v\.string\(\)/)
  assert.match(academic, /by_user_idempotency/)
  assert.match(academic, /creationRequestFingerprint/)
  assert.match(academic, /同一提交请求标识不能用于不同内容/)
  assert.match(formClient, /submissionIdempotencyKeyRef/)
  assert.match(formClient, /idempotencyKey:\s*submissionIdempotencyKeyRef\.current/)
  assert.match(api, /idempotencyKey/)
})

test("withdraw cancels both pending and needs-changes OA bridges and records withdrawal", () => {
  assert.match(academic, /workflowStatus\s*!==\s*"pending"[\s\S]*workflowStatus\s*!==\s*"needs_changes"/)
  assert.match(academic, /action:\s*"workflow_withdrawn"/)
  assert.match(academic, /已撤回/)
  assert.match(schema, /v\.literal\("workflow_withdrawn"\)/)
})

test("bridged academic exchange submissions cannot use the generic OA resubmission path", () => {
  assert.match(forms, /submission\.formSlug\s*===\s*ACADEMIC_EXCHANGE_OA_SLUG[\s\S]*请在学术交流申请页面补充材料/)
  assert.match(forms, /academicExchangeSupportApplications[\s\S]*oaSubmissionId/)
  assert.match(forms, /const detailHref = `\/services\/oa\/reimbursements\/academic-exchange\/\$\{String\(application\._id\)\}`/)
  assert.match(forms, /application\.status === "needs_changes"\s*\?\s*`\$\{detailHref\}\/edit`/)
})

test("legacy reviewer attachment access rejects bridged applications", () => {
  assert.match(academic, /application\.oaSubmissionId[\s\S]*统一 OA 审批台/)
})

test("super-admin direct mutation cannot split a bridged application from OA", () => {
  assert.match(academic, /existing\.oaSubmissionId[\s\S]*统一 OA/)
  assert.match(academic, /existing\.oaSubmissionId[\s\S]*不能删除/)
})

test("create-only reimbursement form owners cannot read applicant attachments", () => {
  assert.match(forms, /const isFormOwner = formKind\(form\) !== "reimbursement"/)
})
