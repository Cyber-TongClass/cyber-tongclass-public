import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const forms = readFileSync("convex/oaForms.ts", "utf8")
const users = readFileSync("convex/users.ts", "utf8")

function exportedBlock(source, name) {
  const marker = `export const ${name} = `
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `${name} is exported`)
  const next = source.indexOf("export const ", start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

test("AIA manual-review forms retain the super-admin boundary and private attachments", () => {
  const review = exportedBlock(forms, "adminReviewSubmission")
  const attachment = exportedBlock(forms, "getAttachmentUrl")

  assert.match(
    review,
    /const admin = requireAdmin\(actor\)\s+assertCanManageAIAWorkflowForm\(admin, form\)/,
    "manual review must enforce the same AIA form-management boundary as workflow forms",
  )
  assert.match(
    attachment,
    /const isLegacyAdmin = isAdmin && !hasWorkflow && \(!isAIAWorkflowForm\(form\) \|\| user\.role === "super_admin"\)/,
    "only a super-admin may fetch attachments for AIA-scoped manual-review forms",
  )
})

test("Tong Class directory visibility is a super-admin-only account setting", () => {
  const create = exportedBlock(users, "create")
  const update = exportedBlock(users, "update")

  for (const [name, source] of [["create", create], ["update", update]]) {
    assert.match(
      source,
      /if \([^)]*isClassMember !== undefined\) \{\s*assertCanSetTongClassVisibility\(actor\.role\)\s*\}/,
      `${name} rejects direct directory-visibility changes by self-service and ordinary-admin callers`,
    )
  }
})
