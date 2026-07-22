# OA Submission History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a unified OA submission list and stable, snapshot-based detail page with a Feishu-style single-level approval timeline.

**Architecture:** Store a frozen form snapshot on every OA submission and expose a guarded single-submission query through the existing React API layer. Keep ordinal/title calculation and timeline projection as pure frontend utilities, then build a shared detail component and two App Router pages around those values.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Convex, Tailwind CSS, lucide-react, Node 24 built-in test runner.

---

### Task 1: Submission presentation utilities and regression tests

**Files:**
- Create: `src/lib/oa-submissions.ts`
- Create: `scripts/oa-submissions.test.mjs`

- [ ] **Step 1: Write failing tests for deterministic submission titles and all approval statuses**

```js
import test from "node:test"
import assert from "node:assert/strict"
import { getSubmissionTitle, getApprovalTimeline } from "../src/lib/oa-submissions.ts"

test("numbers a form's submissions chronologically while displaying newest first", () => {
  const rows = [
    { _id: "new", formId: "form-a", formTitle: "学术交流支持申请", submittedAt: 20 },
    { _id: "old", formId: "form-a", formTitle: "学术交流支持申请", submittedAt: 10 },
  ]
  assert.equal(getSubmissionTitle(rows[0], rows), "学术交流支持申请的第 2 次提交")
  assert.equal(getSubmissionTitle(rows[1], rows), "学术交流支持申请的第 1 次提交")
})

test("projects pending, approved, rejected, and needs-changes timelines", () => {
  for (const reviewStatus of ["pending", "approved", "rejected", "needs_changes"]) {
    const nodes = getApprovalTimeline({ submitterName: "张三", submittedAt: 10, reviewStatus })
    assert.equal(nodes[0].label, "提交")
    assert.equal(nodes.at(-1).label, "结束")
  }
})
```

- [ ] **Step 2: Run the test and verify it fails because the module does not exist**

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: FAIL with `Cannot find module '../src/lib/oa-submissions.ts'`.

- [ ] **Step 3: Implement the smallest pure utility module**

```ts
export type SubmissionForPresentation = {
  _id: string
  formId: string
  formTitle?: string
  submittedAt: number
  submitterName: string
  reviewStatus: "pending" | "approved" | "rejected" | "needs_changes"
  reviewerName?: string
  reviewedAt?: number
  adminNote?: string
}

export function getSubmissionTitle(submission: SubmissionForPresentation, all: SubmissionForPresentation[]) {
  const sameForm = all.filter((row) => row.formId === submission.formId)
    .sort((left, right) => left.submittedAt - right.submittedAt || left._id.localeCompare(right._id))
  const index = sameForm.findIndex((row) => row._id === submission._id)
  return `${submission.formTitle || "未命名表单"}的第 ${index + 1} 次提交`
}
```

Define `getApprovalTimeline` to return only UI-neutral node data (`label`, `actor`, `detail`, `timestamp`, `state`), mapping the four review statuses to the specified `提交 → 管理员审核 → 结束` states. Do not import React or Convex from this module.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: PASS with 2 passing tests and no failures.

- [ ] **Step 5: Commit the utility and test**

```bash
git add src/lib/oa-submissions.ts scripts/oa-submissions.test.mjs
git commit -m "feat: add OA submission presentation helpers"
```

### Task 2: Frozen form snapshots and guarded detail query

**Files:**
- Modify: `convex/schema.ts` (OA submission document validator)
- Modify: `convex/oaForms.ts` (submit, listMine, and new owner-only detail query)
- Modify: `src/types/index.ts` (snapshot and returned submission types)
- Modify: `src/lib/api.ts` (function reference and `useMyOAFormSubmission` hook)

- [ ] **Step 1: Add a failing type-level/runtime test case for a snapshotless legacy record fallback**

Extend `scripts/oa-submissions.test.mjs` with a case that passes an item with no `formSnapshot` and a fallback current form to the exported snapshot resolver. Assert the original form title and field IDs are returned.

- [ ] **Step 2: Run the test and verify it fails because snapshot resolution is not exported**

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: FAIL with `getSubmissionFormSnapshot is not a function`.

- [ ] **Step 3: Update storage and APIs without changing access controls**

In `convex/schema.ts`, add optional `formSnapshot: v.any()` to `oaFormSubmissions`; the stored object contains `title`, optional `description`, `fields`, optional `resultFields`, and optional `resultsVisible`. Validate the snapshot structure in the mutation by building it solely from the already-sanitized stored form. In `submit`, construct that snapshot from the loaded form and store it with `answers`.

Add `getMine` in `convex/oaForms.ts` accepting `sessionToken` and submission ID. It must call `requireMember`, retrieve the row, reject any non-owner, load the current form only for a legacy fallback, serialize owner-visible results using the current or snapshot-compatible configuration, and return `null` for a missing submission. `listMine` must return `formTitle` sourced from the snapshot then current form, while retaining its existing result-visibility behavior.

In `src/types/index.ts`, add `OAFormSnapshot`, optional `formSnapshot`, and optional `formTitle` to `OAFormSubmission`. In `src/lib/api.ts`, register the `oaForms:getMine` reference and expose `useMyOAFormSubmission(id)` following the established session-token hook pattern. Components must continue using this API wrapper rather than raw Convex.

- [ ] **Step 4: Implement the client-side snapshot resolver and make the test pass**

Export `getSubmissionFormSnapshot(submission, fallbackForm)` from `src/lib/oa-submissions.ts`, returning `submission.formSnapshot` when present or a structural snapshot of `fallbackForm` otherwise. It must return `null` when neither exists.

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: PASS with all three tests passing.

- [ ] **Step 5: Regenerate Convex types and commit**

Run: `npx convex codegen`

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: code generation exits 0 and all tests pass.

```bash
git add convex/schema.ts convex/oaForms.ts src/types/index.ts src/lib/api.ts src/lib/oa-submissions.ts scripts/oa-submissions.test.mjs
git commit -m "feat: preserve OA form snapshots for submissions"
```

### Task 3: Submission list, compact detail, and approval timeline UI

**Files:**
- Create: `src/components/oa-forms/oa-submission-detail.tsx`
- Create: `src/app/intranet/forms/submissions/page.tsx`
- Create: `src/app/intranet/forms/submissions/[id]/page.tsx`
- Modify: `src/app/intranet/forms/page.tsx`
- Modify: `src/app/intranet/forms/[slug]/page.tsx`

- [ ] **Step 1: Write a failing UI-adjacent utility test for a table answer**

Extend `scripts/oa-submissions.test.mjs` with a table-field snapshot and answer rows. Assert `formatSubmissionAnswer` returns a display model containing every column label and nonempty cell, rather than JSON text.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: FAIL because `formatSubmissionAnswer` is not exported.

- [ ] **Step 3: Add the shared read-only detail component and pages**

Implement `OAFormSubmissionDetail` in `src/components/oa-forms/oa-submission-detail.tsx`. It receives the submission, its resolved snapshot, and the complete owner submission list. Render the stable title from `getSubmissionTitle`, a compact two-column field list, dedicated file links through the existing `useOAFormAttachmentUrl`, table cells in a responsive table, owner-visible result fields, and the vertical approval timeline from `getApprovalTimeline`. Use green/orange/gray dots, avatars with name initials, and show notes only where present.

Implement `/intranet/forms/submissions` to call `useMyOAFormSubmissions()` and link each row to `/intranet/forms/submissions/<id>`. Implement `/intranet/forms/submissions/[id]` to call both `useMyOAFormSubmission(id)` and `useMyOAFormSubmissions()` so the title's ordinal is stable. Both pages must provide loading, empty, and inaccessible/not-found states.

Add a “我的提交” navigation action to `/intranet/forms`. On the individual form page, replace the current record table and read-only submission dialog with a link to the unified list; retain the existing edit path for editable submissions and its submission form behavior.

- [ ] **Step 4: Implement table formatting and make all focused tests pass**

Export a display-model `formatSubmissionAnswer` from `src/lib/oa-submissions.ts` and have the component render that model. Keep plain text and multi-select values readable, never `JSON.stringify` a table answer, and leave attachment authorization to the existing attachment hook.

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: PASS with all tests passing.

- [ ] **Step 5: Lint and commit the UI**

Run: `npm run lint`

Expected: exit code 0 with no warnings.

```bash
git add src/components/oa-forms/oa-submission-detail.tsx src/app/intranet/forms/page.tsx src/app/intranet/forms/[slug]/page.tsx src/app/intranet/forms/submissions/page.tsx src/app/intranet/forms/submissions/[id]/page.tsx src/lib/oa-submissions.ts scripts/oa-submissions.test.mjs
git commit -m "feat: add OA submission history and approval detail"
```

### Task 4: End-to-end verification and regression review

**Files:**
- Verify: `scripts/oa-submissions.test.mjs`
- Verify: `src/app/intranet/forms/submissions/page.tsx`
- Verify: `src/app/intranet/forms/submissions/[id]/page.tsx`

- [ ] **Step 1: Run all feature regression tests**

Run: `node --test scripts/oa-submissions.test.mjs`

Expected: all tests pass.

- [ ] **Step 2: Run repository lint**

Run: `npm run lint`

Expected: exit code 0 with no warnings.

- [ ] **Step 3: Verify the requested behavior manually in local development**

Open `/intranet/forms/submissions` while authenticated. Confirm multi-form submissions are newest first, each title uses the chronological ordinal, and every row opens a stable URL. Edit a form definition after a submission, then confirm the submission detail still renders the saved snapshot. Check all four review statuses, an attachment answer, and a table answer.

- [ ] **Step 4: Confirm the verification pass left no uncommitted feature changes**

Run: `git status --short`

Expected: only the user’s pre-existing unrelated changes, with no unstaged or untracked OA submission-history files. If verification exposed a defect, return to the task that owns that file, add a focused failing test, fix it, and rerun Steps 1–3 before committing the specific changed files with `git commit -m "fix: correct OA submission history verification"`.
