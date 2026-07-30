# Unified OA Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete secure teacher/super-administrator form management and add the versioned AIA workflow editor/runtime.

**Architecture:** Preserve legacy `approvalSteps` and adapt them at read time into an ordered V2 workflow. New definitions contain a fixed create node and configurable approval, batch approval, fill-form, and notification nodes. Scope authorization is centralized on the server and reused by option search and every saving mutation.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex, Tailwind/AIA design tokens, Node `node:test` source contracts.

---

## File Structure

Create `convex/lib/oaScopeAuthorization.ts` for actor-aware scope authorization, `convex/oaScopeOptions.ts` for bounded option search, `src/components/oa/oa-workflow-editor.tsx` for inline editing, `src/components/oa/oa-workflow-simulation.tsx` for the read-only preview, and `src/components/oa/oa-form-target-picker.tsx` for fill-form targets. Keep workflow runtime logic in `convex/lib/oaWorkflow.ts`, form endpoint orchestration in `convex/oaForms.ts`, shared client types/normalization in `src/lib/oa-forms.ts`, and all React hooks in `src/lib/api.ts`.

### Task 1: Lock the V2 workflow contract

**Files:**
- Create: `scripts/test-aia-unified-workflow-contract-source.mjs`
- Modify: `scripts/test-oa-forms.mjs`
- Modify: `src/lib/oa-forms.ts`
- Modify: `src/types/index.ts`
- Modify: `convex/schema.ts`

- [ ] **Step 1: Write the failing contract tests**

Add `node:test` assertions for the five node discriminators, unique IDs, fixed single `create_form`, required titles/scopes/targets/messages, legacy adaptation, and payload preservation:

```js
assert.deepEqual(normalizeOAWorkflowDefinition(undefined, legacySteps).nodes.map((node) => node.type), [
  "create_form",
  "approval",
])
assert.throws(() => validateOAWorkflowDefinition({ version: 2, nodes: [] }), /创建表单/)
assert.match(schemaSource, /workflowDefinitionSnapshot/)
```

- [ ] **Step 2: Run RED**

Run: `node --test scripts/test-aia-unified-workflow-contract-source.mjs scripts/test-oa-forms.mjs`  
Expected: FAIL because V2 types and validators do not exist.

- [ ] **Step 3: Implement the shared contract**

Define:

```ts
type OAWorkflowNode =
  | { id: string; type: "create_form"; title: string }
  | { id: string; type: "approval"; title: string; scope: OAUserScope }
  | { id: string; type: "batch_approval"; title: string; scope: OAUserScope; completion: "any" | "all" }
  | { id: string; type: "fill_form"; title: string; targetFormId: string }
  | { id: string; type: "notification"; title: string; scope: OAUserScope; message: string }

type OAWorkflowDefinition = { version: 2; nodes: OAWorkflowNode[] }
```

Add optional `workflowDefinition` to forms and optional `workflowDefinitionSnapshot`, `currentWorkflowNodeIndex`, and `workflowError` to submissions. Keep legacy fields optional and intact.

- [ ] **Step 4: Run GREEN and commit**

Run: `node --test scripts/test-aia-unified-workflow-contract-source.mjs scripts/test-oa-forms.mjs`  
Expected: PASS.

Commit only touched files with message `feat: define unified OA workflow contract`.

### Task 2: Centralize actor-aware scope authorization

**Files:**
- Create: `scripts/test-aia-scope-authorization-source.mjs`
- Create: `scripts/test-aia-scope-picker-authorization-source.mjs`
- Create: `convex/lib/oaScopeAuthorization.ts`
- Create: `convex/oaScopeOptions.ts`
- Modify: `convex/userGroups.ts`
- Modify: `convex/instituteDirectory.ts`
- Modify: `convex/oaForms.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/components/oa/oa-scope-picker.tsx`

- [ ] **Step 1: Write failing authorization tests**

Assert that default results contain undergraduate, graduate, teacher, and other; teachers receive only led/managed groups and addressable accounts; super administrators receive all bounded matches; saving mutations call `assertActorCanUseScope`; and all account searches are bounded.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/test-aia-scope-authorization-source.mjs scripts/test-aia-scope-picker-authorization-source.mjs`  
Expected: FAIL because current queries return global directories.

- [ ] **Step 3: Implement server search and save-time authorization**

Expose:

```ts
searchManageableScopeOptions({
  sessionToken,
  purpose: "form_audience" | "workflow_approver" | "notification",
  query?: string,
})
```

Return a bounded discriminated DTO. Derive teacher research groups through `institutePeople.accountUserId` and group leadership, never display-name matching. Validate every explicit account, research-group, and user-group ID again in mutations.

- [ ] **Step 4: Upgrade picker keyboard behavior**

Use the server query, preserve the existing AIA tag appearance, and implement ArrowUp, ArrowDown, Enter, Escape, and `aria-activedescendant`. Keep union semantics.

- [ ] **Step 5: Run GREEN and commit**

Run both new scripts plus `node --test scripts/test-aia-identity-groups.mjs`.  
Expected: PASS.

Commit with message `feat: secure OA scope selection`.

### Task 3: Unify teacher and super-administrator form management

**Files:**
- Create: `scripts/test-aia-form-management-super-admin-source.mjs`
- Modify: `convex/oaForms.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/app/forms/manage/page.tsx`
- Modify: `src/app/forms/manage/[id]/page.tsx`
- Modify: `src/app/forms/manage/new/page.tsx`
- Modify: `src/app/forms/manage/form-editor.tsx`
- Modify: `src/components/portal/portal-client.tsx`

- [ ] **Step 1: Write failing management tests**

Assert teacher-owner-only behavior, super-administrator all-form behavior, denial for ordinary administrators, super-administrator-only pinning, unified `/forms/manage/[id]` links, and portal visibility for teacher or super administrator.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/test-aia-form-management-super-admin-source.mjs`  
Expected: FAIL at get/edit guards and routing.

- [ ] **Step 3: Implement canonical manage endpoints**

Add `manageList`, `manageGet`, `manageUpsert`, `manageSetStatus`, `manageRemove`, `manageListSubmissions`, and `manageSetPinned`. Teachers may act only on owned forms; super administrators may act on all; pinning requires super administrator. Keep old teacher/admin endpoints as compatibility wrappers.

- [ ] **Step 4: Switch pages to canonical hooks**

Add `useManageOA*` hooks in `src/lib/api.ts`, update route guards, eliminate legacy admin-edit redirection, and expose new/edit/list routes to eligible super administrators.

- [ ] **Step 5: Run GREEN and commit**

Run the new test and existing OA API/security tests.  
Expected: PASS.

Commit with message `feat: unify OA form management access`.

### Task 4: Add V2 execution, grants, and immutable audit events

**Files:**
- Create: `scripts/test-aia-oa-workflow-v2-source.mjs`
- Create: `scripts/test-aia-unified-workflow-execution-source.mjs`
- Modify: `convex/schema.ts`
- Modify: `convex/lib/oaWorkflow.ts`
- Modify: `convex/oaForms.ts`

- [ ] **Step 1: Write failing runtime tests**

Cover legacy adaptation, ordered non-review nodes, batch `any/all`, stable task/grant/notification natural keys, paused fill target, and revision creating a new version without overwriting earlier comments.

- [ ] **Step 2: Run RED**

Run the two new scripts.  
Expected: FAIL because grants and non-review nodes do not exist.

- [ ] **Step 3: Add persistence**

Create `oaFormAccessGrants` with `by_naturalKey` and `by_form_user`. Add deterministic natural keys to approval tasks. Extend audit actions with node start/completion, grant, notification, and pause events.

- [ ] **Step 4: Implement the ordered runner**

Add:

```ts
adaptLegacyApprovalSteps()
validateWorkflowDefinitionStructure()
runWorkflowUntilBlocked()
activateReviewNode()
grantFillFormAccess()
pauseWorkflow()
```

Run through create/fill/notification nodes automatically and stop at approval nodes. `approval` must resolve exactly one reviewer; `batch_approval` must resolve at least one reviewer. Include grants in list, detail, and submit authorization.

- [ ] **Step 5: Run GREEN and commit**

Run new scripts and existing OA workflow/security scripts.  
Expected: PASS.

Commit with message `feat: execute unified OA workflows`.

### Task 5: Validate save and publication

**Files:**
- Modify: `scripts/test-aia-unified-workflow-contract-source.mjs`
- Modify: `convex/oaForms.ts`
- Modify: `convex/lib/oaWorkflow.ts`
- Modify: `src/lib/oa-forms.ts`

- [ ] **Step 1: Add failing publication assertions**

Assert rejection for empty reviewer resolution, empty notification resolution, invalid/unpublished fill target, unauthorized scope, duplicate node ID, and missing title.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/test-aia-unified-workflow-contract-source.mjs`  
Expected: FAIL because publication currently changes status without runtime validation.

- [ ] **Step 3: Implement two-level validation**

Validate structure on save. On publication, resolve current recipients and target forms with the current actor. Do not accept a syntactically non-empty group that resolves to zero accounts.

- [ ] **Step 4: Run GREEN and commit**

Run the contract and workflow security tests.  
Expected: PASS.

Commit with message `fix: validate OA workflows before publication`.

### Task 6: Build the AIA inline editor and live simulation

**Files:**
- Create: `scripts/test-aia-unified-workflow-editor-source.mjs`
- Create: `src/components/oa/oa-workflow-editor.tsx`
- Create: `src/components/oa/oa-workflow-simulation.tsx`
- Create: `src/components/oa/oa-form-target-picker.tsx`
- Modify: `src/components/admin/oa-workflow/oa-workflow-editor.tsx`
- Modify: `src/app/forms/manage/form-editor.tsx`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Write failing UI source tests**

Assert the fixed start node, four addable node types, between-node add controls, inline expansion, saved `workflowDefinition`, absence of deletion, desktop dual-column layout, responsive stacking, batch branches, three simulation modes, no mutation in simulation, and existing `aia-serif`/`aia-mono`/rule tokens.

- [ ] **Step 2: Run RED**

Run: `node --test scripts/test-aia-unified-workflow-editor-source.mjs`  
Expected: FAIL because the teacher editor has no workflow UI.

- [ ] **Step 3: Implement the editor**

Use flat divided rows without `Card`, large rounding, or shadows. Keep the existing font stack. Insert controls between nodes and expand configuration in place. The target-form picker uses a server-filtered `listEditorVisibleForms` query.

- [ ] **Step 4: Implement the simulation**

Render normal, deferred, and rejected sample paths from the draft only. Render batch reviewers as branches. Do not call any mutation hook.

- [ ] **Step 5: Save workflow with the form**

Remove `delete draft.approvalSteps`, normalize legacy forms on load, and include `workflowDefinition` in the canonical manage upsert payload.

- [ ] **Step 6: Run GREEN and commit**

Run the new UI test, OA UI source tests, and `npx tsc --noEmit --pretty false --incremental false`.  
Expected: PASS.

Commit with message `feat: add AIA OA workflow editor`.

### Task 7: Render defer, re-review, and batch history

**Files:**
- Create: `scripts/test-aia-unified-workflow-review-ui-source.mjs`
- Modify: `scripts/test-aia-oa-ui-source.mjs`
- Modify: `src/components/oa/aia-oa-approval-inbox-client.tsx`
- Modify: `src/components/oa/aia-oa-approval-task-detail-client.tsx`
- Modify: `src/app/services/oa/submissions/[id]/page.tsx`
- Modify: `convex/oaForms.ts`
- Modify: `convex/lib/oaWorkflow.ts`

- [ ] **Step 1: Write failing history tests**

Assert the label `暂缓评审`, mandatory comment, amber state, permanent prior comment, subsequent `复审` row, and grouped branch display by node/version.

- [ ] **Step 2: Run RED**

Run the new review UI test and existing OA UI test.  
Expected: FAIL for wording and grouped branch data.

- [ ] **Step 3: Expose stable history DTOs**

Include node ID, node title, workflow version, reviewer status, decision, comment, and acted time. Never expose a client-supplied reviewer identity as authoritative.

- [ ] **Step 4: Implement AIA timeline rendering**

Group tasks by node/version. Keep old comments visible and append re-review below. Use amber for defer/partial, ink/green for approved, red for rejected, and muted gray for future nodes.

- [ ] **Step 5: Run GREEN and commit**

Run all Phase 1 scripts, lint, and typecheck.  
Expected: PASS.

Commit with message `feat: show OA re-review and batch history`.

### Task 8: Phase 1 integration verification

**Files:**
- Modify only stale source-contract tests that demonstrably assert superseded routes or names.

- [ ] **Step 1: Run the Phase 1 matrix**

```bash
for f in \
  scripts/test-oa-forms.mjs \
  scripts/test-aia-oa-api-source.mjs \
  scripts/test-aia-oa-security-source.mjs \
  scripts/test-aia-oa-workflow-source.mjs \
  scripts/test-aia-oa-workflow-scope-clear-source.mjs \
  scripts/test-aia-form-management-super-admin-source.mjs \
  scripts/test-aia-scope-authorization-source.mjs \
  scripts/test-aia-unified-workflow-contract-source.mjs \
  scripts/test-aia-oa-workflow-v2-source.mjs \
  scripts/test-aia-unified-workflow-editor-source.mjs \
  scripts/test-aia-unified-workflow-review-ui-source.mjs; do node --test "$f" || exit 1; done
```

Expected: all PASS.

- [ ] **Step 2: Run repository gates**

Run `npm run lint`, `npx tsc --noEmit --pretty false --incremental false`, then all `scripts/test-*.mjs`. Update only stale assertions that conflict with approved behavior.

- [ ] **Step 3: Browser acceptance**

Verify teacher ownership, super-administrator all-form access/pinning, picker authorization and keyboard operation, workflow persistence, simulation responsiveness, real approve/reject/defer/re-review, batch `any/all`, fill grants, and notification idempotency.

- [ ] **Step 4: Commit verification fixes**

Commit with message `test: verify unified OA form workflows`.
