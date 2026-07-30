# Platform Permissions, Class Work, and Reimbursements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add super-administrator permission management, authorized class-work publishing, fixed reimbursement OA, and identity-correct academic-exchange PDFs.

**Architecture:** Extend Kimi's existing content-review skeleton instead of replacing it. Permissions remain per-user/category capabilities, while group assignment is expanded by a server-authorized scope mutation. News and activities use parallel review tasks; reimbursement form submissions continue through the OA task engine.

**Tech Stack:** Next.js, React, TypeScript, Convex, existing Markdown/AIA OA components, pdf-lib, Node source-contract and pure-function tests.

---

## File Structure

Keep permission and content-review transaction logic in `convex/contentReview.ts`; extract pure completion/idempotency logic to `convex/lib/contentReviewWorkflow.ts`. Add UI under `src/components/permissions` and `src/components/class-work`. Put all class-work routes under `src/app/class-work`. Reuse the OA scope picker and AIA typography tokens. Put PDF brand logic in `src/lib/academic-exchange-brand.ts`.

### Task 1: Normalize account-role labels

**Files:**
- Modify: `scripts/test-aia-role-registration-source.mjs`
- Modify: `src/lib/account-role.ts`
- Modify: `src/app/admin/users/new/page.tsx`
- Modify: `src/app/admin/users/[id]/page.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] Write failing assertions that every authorization-role editor uses `普通用户`, `管理员`, `超级管理员` from the shared label module while identity-group language remains unchanged.
- [ ] Run `node --test scripts/test-aia-role-registration-source.mjs`; expect FAIL on hard-coded `成员`.
- [ ] Replace hard-coded role labels with `accountRoleLabels/accountRoleOptions`.
- [ ] Re-run the test; expect PASS.
- [ ] Commit with message `fix: standardize account role labels`.

### Task 2: Extend the permission contract

**Files:**
- Create: `scripts/test-aia-platform-permissions-source.mjs`
- Modify: `convex/schema.ts`
- Modify: `convex/contentReview.ts`
- Modify: `src/lib/api.ts`

- [ ] Write failing tests for `news | events | reimbursement`, independent `canCreate/canManage`, super-administrator effective rights, disabled-account rejection, server-side scope expansion, and idempotent indexed upsert.
- [ ] Run RED: `node --test scripts/test-aia-platform-permissions-source.mjs`.
- [ ] Extend the category validator and implement:

```ts
listPermissions({ sessionToken, category })
setPermissionsForScope({ sessionToken, category, scope, canCreate, canManage })
removePermission({ sessionToken, category, userId })
myPermissions({ sessionToken })
```

Resolve the scope on the server, deduplicate accounts, and upsert by category/user. Do not trust client-expanded users.

- [ ] Run GREEN and commit with message `feat: add platform capability assignments`.

### Task 3: Build the OA-styled permission page

**Files:**
- Create: `scripts/test-aia-permissions-ui-source.mjs`
- Create: `src/app/admin/permissions/page.tsx`
- Create: `src/components/permissions/platform-permissions-client.tsx`
- Create: `src/components/permissions/permission-subject-picker.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/lib/api.ts`

- [ ] Write failing source tests for super-administrator guard, navigation visibility, news/activity/reimbursement tabs, shared picker, independent checkboxes, authorized-person rows, AIA typography, flat dividers, loading/empty/error states, and absence of card/table-heavy styling.
- [ ] Run RED.
- [ ] Implement the page using `aia-serif`, `aia-mono`, `aia-border-rule`, and the shared picker wrapper. Label reimbursement permissions `创建报销表单` and `审批报销`.
- [ ] Run GREEN, typecheck, and commit with message `feat: add platform permission management`.

### Task 4: Implement parallel content-review tasks

**Files:**
- Create: `scripts/test-aia-content-review-workflow.mjs`
- Create: `scripts/test-aia-content-review-security-source.mjs`
- Create: `convex/lib/contentReviewWorkflow.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/contentReview.ts`
- Modify: `src/lib/api.ts`

- [ ] Write failing pure tests for submission idempotency, reviewer-task natural keys, all-reviewers approval, first rejection, skipped remaining tasks, self-review exclusion, and no-reviewer rejection.
- [ ] Run RED.
- [ ] Add `contentReviewTasks` indexed by submission/user and user/status/created time. Add submission idempotency key/fingerprint.
- [ ] Change submit to resolve current managers, exclude the creator, create one task/notification per reviewer, and reject when none remain.
- [ ] Change review to authorize by stored task ID. Publish exactly once only after all tasks approve; reject immediately and skip pending tasks after one rejection.
- [ ] Run GREEN and commit with message `feat: add parallel content review`.

### Task 5: Close news and activity audience leaks

**Files:**
- Create: `scripts/test-aia-content-scope-enforcement-source.mjs`
- Modify: `convex/news.ts`
- Modify: `convex/events.ts`
- Modify: `convex/instituteContent.ts`
- Modify: `src/lib/api.ts`

- [ ] Write failing assertions for audience enforcement in list, detail, count, institute updates, and search-related queries.
- [ ] Run RED.
- [ ] Route every public read through `getUserBySession`, `loadOAUserScopeContext`, and `userMatchesOAUserScope`. Anonymous users may see only unscoped public content. Pass scope context to event counts.
- [ ] Run GREEN with existing content-audience scripts.
- [ ] Commit with message `fix: enforce content audiences on every read`.

### Task 6: Fix content-review notification destinations

**Files:**
- Create: `scripts/test-aia-content-review-notifications-source.mjs`
- Modify: `convex/oaForms.ts`
- Modify: `convex/contentReview.ts`
- Modify: `src/components/notifications/aia-notification-inbox-client.tsx`

- [ ] Write failing tests proving `content_review` never falls through to Coffee Talk, reviewer messages open management tasks, creator messages open submission details, and missing records fall back safely.
- [ ] Run RED.
- [ ] Add an explicit content-review notification branch and retain natural-key deduplication.
- [ ] Run GREEN and commit with message `fix: route content review notifications`.

### Task 7: Add portal capability gating and class-work routes

**Files:**
- Create: `scripts/test-aia-class-work-portal-source.mjs`
- Create: `src/components/class-work/class-work-access-guard.tsx`
- Create: `src/app/class-work/news/new/page.tsx`
- Create: `src/app/class-work/news/manage/page.tsx`
- Create: `src/app/class-work/events/new/page.tsx`
- Create: `src/app/class-work/events/manage/page.tsx`
- Create: `src/app/class-work/news/submissions/[id]/page.tsx`
- Create: `src/app/class-work/events/submissions/[id]/page.tsx`
- Modify: `src/components/portal/portal-client.tsx`

- [ ] Write failing tests for loading-safe gating and independent create/manage links.
- [ ] Run RED.
- [ ] Use `useMyContentPermissions`; show `班级工作` only when at least one effective capability exists. Do not grant `/admin` access.
- [ ] Add server-backed access guards on every route.
- [ ] Run GREEN and commit with message `feat: add class work portal routes`.

### Task 8: Build content creation and review UI

**Files:**
- Create: `scripts/test-aia-class-work-ui-source.mjs`
- Create: `src/components/class-work/content-submission-editor.tsx`
- Create: `src/components/class-work/content-review-desk.tsx`
- Create: `src/components/class-work/content-submission-detail.tsx`
- Create: `src/components/class-work/content-review-status.tsx`

- [ ] Write failing source tests for Markdown news fields, activity fields, shared audience picker, submission redirect, OA-style management rows, rejection comments, parallel status, responsive/loading/error/empty states, and existing fonts/tokens.
- [ ] Run RED.
- [ ] Implement shared editors and review desk. Creation submits for review and never directly publishes. Reuse the existing Markdown editor and OA row language.
- [ ] Run GREEN, typecheck, and commit with message `feat: add class work publishing UI`.

### Task 9: Add the fixed reimbursement OA and capability-controlled custom forms

**Files:**
- Create: `scripts/test-aia-reimbursement-oa-source.mjs`
- Create: `src/app/services/oa/reimbursements/page.tsx`
- Create: `src/components/oa/aia-reimbursement-workspace-client.tsx`
- Create: `src/app/forms/manage/reimbursements/new/page.tsx`
- Modify: `src/components/oa/aia-oa-form-list-client.tsx`
- Modify: `convex/oaForms.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/app/forms/manage/page.tsx`

- [ ] Write failing tests for the fixed row below pinned items, academic exchange first, no duplicate custom reimbursement rows, create capability, review capability, super-administrator access, and denial for ordinary administrators.
- [ ] Run RED.
- [ ] Add `/services/oa/reimbursements`; filter custom forms by audience. Add a dedicated reimbursement-form create mutation that forces `kind = "reimbursement"` and checks `reimbursement.canCreate`.
- [ ] Resolve current reimbursement managers into an OA approval step using `completion: "any"`; create idempotent OA tasks so they appear in the existing inbox.
- [ ] Run GREEN and commit with message `feat: integrate reimbursements with OA`.

### Task 10: Move academic exchange behind an AIA login guard

**Files:**
- Create: `scripts/test-aia-academic-exchange-access-source.mjs`
- Create: `src/components/reimbursements/academic-exchange-list-client.tsx`
- Create: `src/components/reimbursements/academic-exchange-form-client.tsx`
- Create: `src/components/reimbursements/academic-exchange-detail-client.tsx`
- Create: `src/app/services/oa/reimbursements/academic-exchange/page.tsx`
- Create: `src/app/services/oa/reimbursements/academic-exchange/new/page.tsx`
- Create: `src/app/services/oa/reimbursements/academic-exchange/[id]/page.tsx`
- Modify: `src/app/tong-class/intranet/reimbursements/academic-exchange/**`

- [ ] Write failing tests for all authenticated AIA identities, unauthenticated denial, preserved old URLs, and no broad relaxation of the Tong Class layout.
- [ ] Run RED.
- [ ] Extract shared clients, add AIA OA routes, and make old routes redirect or reuse components while their existing guard remains scoped.
- [ ] Run GREEN and commit with message `feat: expose academic exchange through OA`.

### Task 11: Snapshot and render PDF branding

**Files:**
- Create: `scripts/test-academic-exchange-pdf-brand.mjs`
- Create: `src/lib/academic-exchange-brand.ts`
- Modify: `scripts/test-academic-exchange-pdf-template.mjs`
- Modify: `convex/schema.ts`
- Modify: `convex/academicExchange.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/server/academic-exchange-pdf.ts`
- Modify: `src/app/api/intranet/academic-exchange/[id]/pdf/route.ts`
- Modify: `src/app/api/reviewer/academic-exchange/[id]/pdf/route.ts`
- Modify: `src/app/api/reviewer/academic-exchange/export/route.ts`

- [ ] Write failing pure tests for `undergrad -> tong_class`, all other identities -> `institute`, write-once snapshots, institute fallback, mixed-brand export, and consistent title/prefix/filename.
- [ ] Run RED.
- [ ] Store `pdfBrand?: "tong_class" | "institute"` at creation. Derive historical fallback from owner identity and persist only when absent.
- [ ] Update the PDF renderer to cover the fixed template title rectangle and redraw the appropriate brand using existing PDF fonts. Apply the same brand to continuation pages, number prefixes, browser filenames, reviewer downloads, and ZIP entries.
- [ ] Run GREEN plus `pdftotext`/rendered-image checks from the existing PDF scripts.
- [ ] Commit with message `feat: brand academic exchange PDFs by identity`.

### Task 12: Phase 2 integration verification

- [ ] Run all Phase 2 tests named in Tasks 1–11 and the existing audience, notification, portal, reimbursement, and PDF scripts.
- [ ] Run `npm run lint`, `npx tsc --noEmit --pretty false --incremental false`, and every `scripts/test-*.mjs`.
- [ ] Browser-test super-administrator permission management, ordinary capability gating, content create/review/reject, audience isolation, notification links, fixed reimbursement, custom reimbursement approval, and both PDF brands.
- [ ] Commit only verification corrections with message `test: verify permissions class work and reimbursements`.
