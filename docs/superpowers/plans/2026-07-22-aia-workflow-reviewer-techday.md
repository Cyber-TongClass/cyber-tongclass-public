# AIA Workflow, Reviewer, and TechDay Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scoped, versioned approval workflows while preserving legacy OA records, and let an explicitly linked teacher derive Academic Reviewer and TechDay review capabilities without merging independent identities.

**Architecture:** Workflow rules use typed scope selectors and immutable definition versions; submitted instances snapshot concrete assignees and write append-only events. Reviewer and TechDay remain separate credentials/products; a teacher gains only explicit derived capability through a verified binding, never through email matching or token concatenation.

**Tech Stack:** Convex, TypeScript, Next.js route handlers, React hooks, Node `node:test`.

---

## Dependencies and files

Start only after the foundation plan supplies active session actors, identity types, system/custom access groups, and public DTO boundaries; start workflow notification projection only after the directory/Coffee Talk plan adds `userNotifications`.

| Path | Responsibility |
| --- | --- |
| `convex/lib/scope-selector.ts` | Pure typed scope matching; empty include denies and excludes win. |
| `convex/lib/approval-workflow.ts` | Immutable version/instance event logic and idempotency helpers. |
| `convex/approvalWorkflows.ts` | Admin definition, submit/claim/act/repair functions. |
| `convex/oaForms.ts` | Legacy OA adapter; never deletes existing submissions. |
| `convex/reviewerAuth.ts`, `convex/reviewer/lib.ts` | Explicit independent/derived Reviewer binding and session restrictions. |
| `convex/techday/lib.ts` | Rejects unrelated dual tokens and exposes teacher-review capability separately from TechDay role. |

### Task 1: Add typed scope selectors and tests

**Files:**
- Create: `convex/lib/scope-selector.ts`
- Create: `scripts/test-scope-selector.mjs`
- Modify: `convex/schema.ts`

- [ ] **Step 1: Write failing scope semantics tests.**

```js
// scripts/test-scope-selector.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { matchesScope } from "../convex/lib/scope-selector.ts";

const actor = { identityType: "graduate", organization: "pku", cohort: 2024, researchGroupIds: ["g1"], accessGroupIds: ["ag1"], userId: "u1" };
test("empty includes deny and exclusions override inclusions", () => {
  assert.equal(matchesScope(actor, { match: "all", include: [], exclude: [] }), false);
  assert.equal(matchesScope(actor, { match: "all", include: [{ dimension: "organization", values: ["pku"] }], exclude: [{ dimension: "user", values: ["u1"] }] }), false);
});
test("all and any operate over typed clauses", () => {
  assert.equal(matchesScope(actor, { match: "all", include: [{ dimension: "identityType", values: ["graduate"] }, { dimension: "researchGroup", values: ["g1"] }], exclude: [] }), true);
  assert.equal(matchesScope(actor, { match: "any", include: [{ dimension: "cohort", values: [2023] }, { dimension: "accessGroup", values: ["ag1"] }], exclude: [] }), true);
});
```

- [ ] **Step 2: Run the test before the selector exists.**

Run: `node --test scripts/test-scope-selector.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the typed selector.**

```ts
// convex/lib/scope-selector.ts
export type ScopeClause = { dimension: "identityType" | "organization" | "cohort" | "researchGroup" | "accessGroup" | "user"; values: Array<string | number> };
export type ScopeSelector = { match: "all" | "any"; include: ScopeClause[]; exclude: ScopeClause[] };
export function matchesScope(actor: Record<string, unknown>, selector: ScopeSelector) {
  const matches = (clause: ScopeClause) => {
    const actual = clause.dimension === "researchGroup" ? actor.researchGroupIds : clause.dimension === "accessGroup" ? actor.accessGroupIds : clause.dimension === "user" ? actor.userId : actor[clause.dimension];
    return Array.isArray(actual) ? actual.some((value) => clause.values.includes(value as string | number)) : clause.values.includes(actual as string | number);
  };
  if (selector.include.length === 0 || selector.exclude.some(matches)) return false;
  return selector.match === "all" ? selector.include.every(matches) : selector.include.some(matches);
}
```

Add persistent `accessGroups` and `accessGroupMembers` tables/indexes as specified in the foundation design before any workflow UI. Do not create free-text `@` selectors.

- [ ] **Step 4: Run scope tests and commit.**

Run: `node --test scripts/test-scope-selector.mjs`

Expected: two passing tests.

```bash
git add convex/lib/scope-selector.ts convex/schema.ts scripts/test-scope-selector.mjs
git commit -m "feat(scope): add typed AIA scope selector"
```

### Task 2: Implement immutable sequential approval engine

**Files:**
- Create: `convex/lib/approval-workflow.ts`
- Create: `convex/approvalWorkflows.ts`
- Modify: `convex/schema.ts`
- Create: `scripts/test-approval-workflow.mjs`

- [ ] **Step 1: Write failing workflow transition tests.**

```js
// scripts/test-approval-workflow.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { applyApprovalAction } from "../convex/lib/approval-workflow.ts";

test("any_one completion cancels sibling tasks and activates the next step", () => {
  const result = applyApprovalAction({ taskStatus: "active", siblings: ["a", "b"], instanceVersion: 2 }, "approve");
  assert.deepEqual(result, { taskStatus: "completed", cancelSiblingIds: ["a", "b"], nextInstanceVersion: 3, instanceStatus: "running" });
});
test("stale or invalid actions fail", () => {
  assert.throws(() => applyApprovalAction({ taskStatus: "completed", siblings: [], instanceVersion: 2 }, "approve"), /WORKFLOW_TASK_NOT_ACTIVE/);
});
```

- [ ] **Step 2: Run the test before implementation.**

Run: `node --test scripts/test-approval-workflow.mjs`

Expected: missing module failure.

- [ ] **Step 3: Add schema for immutable definitions/instances/events.**

Add `approvalWorkflowDefinitions`, `approvalWorkflowDefinitionSteps`, `approvalWorkflowInstances`, `approvalStepInstances`, `approvalTasks`, `approvalEvents`, `approvalActionReceipts`, and `approvalMessages` to `convex/schema.ts`. Definitions use a stable `key`, integer `version`, draft/published status, and immutable published copies. Steps allow only `executionMode: "any_one"`, a typed `assigneeScope`, ordinal, and action list `approve|reject|request_changes`. Instance rows contain definition/version snapshot, resource reference, state version, submitter, and current status. Task rows store concrete snapshotted assignee ids, not a dynamic selector.

- [ ] **Step 4: Implement pure actions and server mutation contract.**

```ts
// convex/lib/approval-workflow.ts
export function applyApprovalAction(input: { taskStatus: "active" | "completed" | "cancelled"; siblings: string[]; instanceVersion: number }, action: "approve" | "reject" | "request_changes") {
  if (input.taskStatus !== "active") throw new Error("WORKFLOW_TASK_NOT_ACTIVE");
  return { taskStatus: "completed" as const, cancelSiblingIds: input.siblings,
    nextInstanceVersion: input.instanceVersion + 1,
    instanceStatus: action === "approve" ? "running" : action === "reject" ? "rejected" : "needs_changes" };
}
```

`approvalWorkflows.ts` must derive actor server-side, reject stale `expectedVersion`, check action receipts before writes, validate the active task belongs to the actor, complete it/cancel siblings, append immutable event, project notifications with internal helper, and create next-step tasks from an assignee snapshot. If a published step resolves no assignee, publishing must fail; if an active assignee becomes disabled, mark the instance `failed` and create a scoped repair task rather than skipping it.

- [ ] **Step 5: Run workflow tests and commit.**

Run: `node --test scripts/test-approval-workflow.mjs && npx convex codegen`

Expected: both tests pass and codegen exits zero.

```bash
git add convex/schema.ts convex/lib/approval-workflow.ts convex/approvalWorkflows.ts scripts/test-approval-workflow.mjs
git commit -m "feat(workflow): add immutable sequential approval engine"
```

### Task 3: Bridge legacy OA without rewriting historical submissions

**Files:**
- Modify: `convex/oaForms.ts`
- Modify: `convex/schema.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/types/index.ts`
- Modify: `src/components/oa-forms/oa-form-builder.tsx`
- Modify: `src/components/oa-forms/oa-form-submissions-table.tsx`
- Create: `scripts/test-oa-workflow-bridge.mjs`

- [ ] **Step 1: Write failing legacy compatibility tests.**

```js
// scripts/test-oa-workflow-bridge.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { legacySubmissionMode } from "../convex/oaForms.ts";
test("a historical submission without an instance remains readable", () => {
  assert.equal(legacySubmissionMode({ workflowInstanceId: undefined }), "legacy-one-step");
});
```

- [ ] **Step 2: Run before the bridge export exists.**

Run: `node --test scripts/test-oa-workflow-bridge.mjs`

Expected: missing export failure.

- [ ] **Step 3: Add version references and lazy adapter.**

Add optional `formVersionId`, `workflowInstanceId`, and `workflowStateVersion` to legacy `oaFormSubmissions`; add `oaFormVersions` for immutable published form schema snapshots. Define `legacySubmissionMode` as:

```ts
export const legacySubmissionMode = (submission: { workflowInstanceId?: unknown }) =>
  submission.workflowInstanceId === undefined ? "legacy-one-step" : "workflow";
```

Existing `adminReviewSubmission` retains its exported name but delegates: for a legacy record it atomically creates a `legacy-one-step` instance/event and applies the requested action; for a new record it routes to the approval engine. Editing a published form creates a new draft/version and never rewrites labels/fields/scope on old submissions.

- [ ] **Step 4: Update admin and applicant UI through API hooks.**

Use timeline/task action components fed by workflow DTOs. Existing legacy submissions continue to display their original form snapshot/status. No raw workflow IDs or client actor ids become authorization inputs.

- [ ] **Step 5: Run bridge tests, existing OA tests, and commit.**

Run: `node --test scripts/test-oa-workflow-bridge.mjs scripts/test-oa-forms.mjs`

Expected: all cases pass, including legacy read path.

```bash
git add convex/oaForms.ts convex/schema.ts src/lib/api.ts src/types/index.ts \
  src/components/oa-forms/oa-form-builder.tsx src/components/oa-forms/oa-form-submissions-table.tsx \
  scripts/test-oa-workflow-bridge.mjs
git commit -m "feat(oa): bridge legacy submissions to approval workflows"
```

### Task 4: Add explicit Teacher–Academic Reviewer binding

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/reviewer/lib.ts`
- Modify: `convex/reviewerAuth.ts`
- Modify: `convex/academicExchange.ts`
- Create: `src/app/api/reviewer/exchange/route.ts`
- Modify: `src/lib/server/reviewer-session.ts`
- Create: `scripts/test-reviewer-bridge.mjs`

- [ ] **Step 1: Write failing binding tests.**

```js
// scripts/test-reviewer-bridge.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { bindingMethodAllowed } from "../convex/reviewer/lib.ts";
test("email equality is not a binding method", () => {
  assert.equal(bindingMethodAllowed("email"), false);
  assert.equal(bindingMethodAllowed("super_admin"), true);
  assert.equal(bindingMethodAllowed("dual_session"), true);
});
```

- [ ] **Step 2: Run the test before the helper export exists.**

Run: `node --test scripts/test-reviewer-bridge.mjs`

Expected: missing export failure.

- [ ] **Step 3: Persist explicit binding and derived session source.**

Add optional `mainUserId`, `teacherDerivedEnabled`, `linkedAt`, `linkedByUserId`, and `linkMethod: "super_admin" | "dual_session"` to `reviewerAccounts`; add `credentialSource: "independent" | "teacher_derived"` and optional `mainUserId` to Reviewer sessions. Export:

```ts
export const bindingMethodAllowed = (method: string) => method === "super_admin" || method === "dual_session";
```

Provide a super-admin binding mutation and a dual-session proof binding mutation. Both must validate a live main account with `identityType === "teacher"`, a live independent reviewer session, and the explicit account/person linkage. Do not match email/name. Independent reviewer disable revokes independent sessions; teacher-derived suspension revokes derived sessions only.

- [ ] **Step 4: Implement cookie exchange with no bearer-token copying.**

`/api/reviewer/exchange/route.ts` obtains only the authenticated main session cookie once the foundation cookie migration is complete, calls a protected Convex exchange mutation, and sets a short-lived HttpOnly/Secure/SameSite Reviewer cookie. It must reject missing binding, disabled teacher, disabled binding, and mismatched session proof. It must never put a main bearer token inside the Reviewer cookie, local storage, request body, or audit record.

- [ ] **Step 5: Run binding tests and commit.**

Run: `node --test scripts/test-reviewer-bridge.mjs && npm run lint`

Expected: three binding method assertions pass and lint exits zero.

```bash
git add convex/schema.ts convex/reviewer/lib.ts convex/reviewerAuth.ts convex/academicExchange.ts \
  src/app/api/reviewer/exchange/route.ts src/lib/server/reviewer-session.ts scripts/test-reviewer-bridge.mjs
git commit -m "feat(reviewer): add explicit teacher-derived reviewer access"
```

### Task 5: Add teachers’ multi-direction TechDay review capability without role replacement

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/techday/lib.ts`
- Modify: `convex/techday/auth.ts`
- Modify: `convex/techday/awards.ts`
- Modify: `convex/techday/admin.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/types/techday.ts`
- Create: `scripts/test-techday-review-capability.mjs`

- [ ] **Step 1: Write failing multi-direction/identity-mismatch tests.**

```js
// scripts/test-techday-review-capability.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { canReviewDirection, rejectUnboundDualIdentity } from "../convex/techday/lib.ts";
test("teacher capability can cover multiple explicitly assigned directions", () => {
  assert.equal(canReviewDirection(["d1", "d2"], "d2"), true);
  assert.equal(canReviewDirection(["d1"], "d2"), false);
});
test("unbound main and TechDay identities are rejected", () => {
  assert.throws(() => rejectUnboundDualIdentity(false), /IDENTITY_MISMATCH/);
});
```

- [ ] **Step 2: Run before the helpers exist.**

Run: `node --test scripts/test-techday-review-capability.mjs`

Expected: missing export failure.

- [ ] **Step 3: Add link/direction schema and capability resolver.**

Add `techDayTeacherReviewerLinks` (`mainUserId`, optional `techDayReviewerUserId`, `enabled`, `createdBy`, timestamps) and `techDayTeacherReviewerDirections` (`linkId`, `directionId`, `createdBy`, timestamps) with uniqueness indexes. Add:

```ts
export const canReviewDirection = (directionIds: string[], directionId: string) => directionIds.includes(directionId);
export function rejectUnboundDualIdentity(bound: boolean) { if (!bound) throw new Error("IDENTITY_MISMATCH"); }
```

Modify principal resolution so an arbitrary valid main token plus arbitrary TechDay token cannot form one principal. Add a separate `teacherReviewer` capability exposing explicit direction IDs; do not overwrite `techDayUsers.role` or author/volunteer identity.

- [ ] **Step 4: Restrict reads/decisions and update UI.**

Award/recommendation queries must filter by capability directions; recommendation write requires an explicitly bound stable TechDay reviewer identity or returns `REVIEWER_IDENTITY_REQUIRED`. UI changes inspect `principal.capabilities.techdayReviewer`, not equality with `techDayUser.role === "reviewer"`.

- [ ] **Step 5: Run tests, codegen, and commit.**

Run: `node --test scripts/test-techday-review-capability.mjs && npx convex codegen && npm run lint`

Expected: both capability tests pass, codegen/lint exit zero.

```bash
git add convex/schema.ts convex/techday/lib.ts convex/techday/auth.ts convex/techday/awards.ts \
  convex/techday/admin.ts src/lib/api.ts src/types/techday.ts scripts/test-techday-review-capability.mjs
git commit -m "feat(techday): add teacher reviewer direction capabilities"
```

## Final verification matrix

- [ ] Run `node --test scripts/test-scope-selector.mjs scripts/test-approval-workflow.mjs scripts/test-oa-workflow-bridge.mjs scripts/test-reviewer-bridge.mjs scripts/test-techday-review-capability.mjs`; expect all passing.
- [ ] Verify empty scope includes deny; exclusions beat inclusions; published workflow versions cannot change; stale task/version/idempotency conflict actions are rejected; legacy OA remains readable.
- [ ] Verify independent Reviewer credentials still work, but email-only binding, disabled teacher, disabled reviewer, and unmatched dual session fail. Verify teacher-derived reviewer access never grants TechDay review without an explicit link/direction.
- [ ] Directly test TechDay author, volunteer, external reviewer, teacher reviewer, admin, and an unrelated dual-token pair. Each read/decision must be limited to allowed directions and produce no cross-product privilege escalation.
