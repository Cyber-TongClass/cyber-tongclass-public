# News Detail Decision Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authorized publication manager make their current news decision directly from the submission detail sidebar using the same decision panel as the review desk.

**Architecture:** The Convex detail query will separately calculate view access and live decision eligibility, then project `canReview` and `myTaskId` without leaking permission rows. A focused client component will own comment validation and mutation state, while both the queue and detail page compose it.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex queries/mutations, Node test runner source-contract tests, ESLint.

---

### Task 1: Lock the detail authorization regression

**Files:**
- Modify: `scripts/test-aia-content-review-detail-source.mjs`

- [ ] **Step 1: Write failing source-contract assertions**

Require `getSubmissionDetail` to read the current permission row, derive live publication decision eligibility, and pass it to `projectSubmissionWithTasks`:

```js
assert.match(detail, /const permission = await getPermission\(ctx,\s*args\.category,\s*viewer\._id\)/)
assert.match(detail, /const canDecide = permission\?\.canManage === true[\s\S]*?workflowStage[\s\S]*?publication_approval/)
assert.match(detail, /projectSubmissionWithTasks\(ctx,\s*submission,\s*viewer\._id,\s*canDecide\)/)
```

Keep the privacy assertions that missing, mismatched, and unauthorized IDs all return `null`, but replace the obsolete assertion that forbids `getPermission`.

- [ ] **Step 2: Require the shared decision component**

Read `content-review-decision-panel.tsx` and assert that both the detail page and review desk import and render it. Require the detail sidebar heading `我的抉择`, and require the shared panel to call `useReviewContentSubmission` with optional `myTaskId`.

- [ ] **Step 3: Run the focused test and observe RED**

Run:

```bash
node --test scripts/test-aia-content-review-detail-source.mjs
```

Expected: failures for the missing live permission projection and missing shared panel.

- [ ] **Step 4: Commit the red test**

```bash
git add scripts/test-aia-content-review-detail-source.mjs
git commit -m "test: cover news detail decisions"
```

### Task 2: Project exact live decision eligibility

**Files:**
- Modify: `convex/contentReview.ts`

- [ ] **Step 1: Separate viewing from deciding**

In `getSubmissionDetail`, keep the immutable creator/task/super-admin view relationship. Read the current permission only after `canView` succeeds and derive:

```ts
const permission = await getPermission(ctx, args.category, viewer._id)
const canDecide = permission?.canManage === true
  && submission.status === "pending"
  && (submission.workflowStage ?? "publication_approval") === "publication_approval"
return await projectSubmissionWithTasks(ctx, submission, viewer._id, canDecide)
```

This allows the existing review mutation to lazily create a task for a newly authorized manager while preventing source-review decisions in the publication detail surface.

- [ ] **Step 2: Run focused authorization tests**

Run:

```bash
node --test scripts/test-aia-content-review-detail-source.mjs scripts/test-aia-content-review-security-source.mjs scripts/test-aia-content-review-revocation-source.mjs scripts/test-aia-content-review-workflow.mjs
```

Expected: all tests pass.

- [ ] **Step 3: Commit the backend fix**

```bash
git add convex/contentReview.ts scripts/test-aia-content-review-detail-source.mjs
git commit -m "fix: expose live news detail decisions"
```

### Task 3: Share the decision UI between list and detail

**Files:**
- Create: `src/components/class-work/content-review-decision-panel.tsx`
- Modify: `src/components/class-work/content-review-desk.tsx`
- Modify: `src/components/class-work/content-submission-detail.tsx`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Define the reusable projection type**

Extend the public client type for a content submission with the existing projected properties:

```ts
myTaskId?: string
canReview?: boolean
workflowStage?: "source_review" | "publication_approval" | "complete"
tasks?: Array<{ _id: string; isMine?: boolean; reviewerName: string; status: "pending" | "approved" | "rejected" | "skipped"; comment?: string; decidedAt?: number }>
```

- [ ] **Step 2: Implement `ContentReviewDecisionPanel`**

The component accepts `submission`, optional `compact`, and `onComplete`. It owns comment, busy, and error state; rejects an empty comment for `rejected`; calls:

```ts
await review({
  id: submission._id,
  ...(submission.myTaskId ? { taskId: submission.myTaskId } : {}),
  decision,
  ...(comment ? { comment } : {}),
})
```

When `canReview` is false, render an exact read-only reason based on submission status, workflow stage, and the current user's projected task status.

- [ ] **Step 3: Replace duplicated queue controls**

Remove comments/busy/decision state and the inline textarea/buttons from `content-review-desk.tsx`. Render the shared component beneath each summary and keep queue-level success feedback through `onComplete`.

- [ ] **Step 4: Add the detail sidebar block**

Between `ContentReviewStatus` and the visibility scope, render:

```tsx
<section className="mt-7 border-t aia-border-rule pt-5" aria-labelledby="content-decision-title">
  <h2 id="content-decision-title" className="aia-serif text-xl font-semibold">我的抉择</h2>
  <ContentReviewDecisionPanel submission={submission} />
</section>
```

- [ ] **Step 5: Run focused source and lint checks**

Run:

```bash
node --test scripts/test-aia-content-review-detail-source.mjs scripts/test-aia-class-work-ui-source.mjs scripts/test-aia-semantic-status-source.mjs
npx eslint src/components/class-work/content-review-decision-panel.tsx src/components/class-work/content-review-desk.tsx src/components/class-work/content-submission-detail.tsx src/lib/api.ts
npx tsc --noEmit --incremental false
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit the shared UI**

```bash
git add src/components/class-work/content-review-decision-panel.tsx src/components/class-work/content-review-desk.tsx src/components/class-work/content-submission-detail.tsx src/lib/api.ts scripts/test-aia-content-review-detail-source.mjs
git commit -m "feat: add news detail decision panel"
```

### Task 4: Browser regression

**Files:**
- No production file changes expected.

- [ ] **Step 1: Open the supplied submission detail**

Navigate to `/class-work/news/submissions/s9754xpeq0pa4y27t6k9w010358ccnsm` with an account that has news publication management permission.

- [ ] **Step 2: Verify the sidebar**

Confirm the sidebar order is `审核流程`, `我的抉择`, `发布后可见范围`. Confirm the decision panel contains the comment field and enabled `同意` / `不通过` actions only for a live eligible task.

- [ ] **Step 3: Verify an actual decision**

Use isolated local test data or a disposable pending submission, approve it, and verify the status updates to `已通过` and the decision buttons disappear. Do not mutate the user's referenced submission unless it is explicitly a disposable local fixture.

- [ ] **Step 4: Run final focused regression**

```bash
node --test scripts/test-aia-content-review-detail-source.mjs scripts/test-aia-content-review-security-source.mjs scripts/test-aia-content-review-revocation-source.mjs scripts/test-aia-content-review-workflow.mjs scripts/test-aia-class-work-ui-source.mjs scripts/test-aia-semantic-status-source.mjs
npm run lint
npx tsc --noEmit --incremental false
git diff --check
```

Expected: every command exits 0 and the browser flow matches the design.
