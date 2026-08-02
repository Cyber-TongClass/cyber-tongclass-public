import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

const [
  markdown,
  renderer,
  simulation,
  permissionsPage,
  permissionsClient,
  scopePicker,
  formTargetPicker,
  workflowEditor,
  groupMembers,
  groupPublications,
  expenseItems,
  reimbursementForm,
  reimbursementEdit,
  reimbursementDetail,
] = await Promise.all([
  read("src/components/markdown/markdown-split-editor.tsx"),
  read("src/components/oa-forms/oa-form-renderer.tsx"),
  read("src/components/oa/oa-workflow-simulation.tsx"),
  read("src/app/platform/permissions/page.tsx"),
  read("src/components/permissions/platform-permissions-client.tsx"),
  read("src/components/oa/oa-scope-picker.tsx"),
  read("src/components/oa/oa-form-target-picker.tsx"),
  read("src/components/oa/oa-workflow-editor.tsx"),
  read("src/components/institute/research-group-member-manager.tsx"),
  read("src/components/institute/research-group-publication-manager.tsx"),
  read("src/components/reimbursements/reimbursement-expense-items.tsx"),
  read("src/components/reimbursements/academic-exchange-form-client.tsx"),
  read("src/components/reimbursements/academic-exchange-edit-client.tsx"),
  read("src/components/reimbursements/academic-exchange-detail-client.tsx"),
])

for (const token of ["text-slate-", "bg-slate-", "bg-white", "rounded-md", "shadow"]) {
  assert.ok(!markdown.includes(token), `Markdown editor must not use legacy token: ${token}`)
  assert.ok(!renderer.includes(token), `OA form renderer must not use legacy token: ${token}`)
}
assert.ok(markdown.includes("aia-border-rule"), "Markdown editor must use AIA hairline rules")
assert.ok(renderer.includes("aia-border-rule"), "OA form renderer must use AIA hairline rules")
assert.ok(!renderer.includes("<Card"), "OA form renderer must not use Card wrappers")
assert.ok(renderer.includes("<fieldset"), "OA radio and checkbox groups must use fieldsets")
assert.ok(renderer.includes("<legend"), "OA radio and checkbox groups must expose legends")

assert.ok(simulation.includes("nodeToneLabels"), "Workflow simulation must expose semantic node-state labels")
assert.ok(simulation.includes('aria-live="polite"'), "Workflow simulation changes must be announced")
assert.ok(simulation.includes("sr-only"), "Workflow simulation must include screen-reader-only status copy")

assert.ok(permissionsPage.includes("aia-scope"), "Permissions workspace must establish the AIA font and surface scope")
assert.ok(permissionsClient.includes("onKeyDown"), "Permission tabs must support keyboard navigation")
assert.ok(permissionsClient.includes("tabIndex={isActive ? 0 : -1}"), "Permission tabs must use roving tab focus")

assert.ok(!scopePicker.includes("shadow-sm"), "Scope picker must not use shadows")
assert.ok(!scopePicker.includes("bg-background"), "Scope picker surface must use the AIA paper token")

for (const [name, source] of [
  ["academic exchange form", reimbursementForm],
  ["academic exchange edit", reimbursementEdit],
  ["academic exchange detail", reimbursementDetail],
  ["reimbursement expense items", expenseItems],
]) {
  assert.ok(!source.includes("border-l-2"), `${name} must not use side-stripe alerts`)
}

assert.ok(scopePicker.includes("min-h-11 min-w-11"), "Scope chip removal must provide a 44px touch target")
assert.ok(formTargetPicker.includes("min-h-11 min-w-11"), "Form target clear must provide a 44px touch target")
assert.ok(workflowEditor.includes("min-h-11 min-w-11"), "Workflow icon actions must provide 44px touch targets")
assert.ok(groupMembers.includes("min-h-11 min-w-11"), "Group member actions must provide 44px touch targets")
assert.ok(groupPublications.includes("min-h-11"), "Publication visibility must provide a 44px touch target")
assert.ok(expenseItems.includes("min-h-11"), "Reimbursement toolbar actions must provide a 44px touch target")

console.log("AIA final UI audit source contract passed")
