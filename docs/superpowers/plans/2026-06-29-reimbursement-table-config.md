# Reimbursement Table Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build dynamic reimbursement material tables so students click “查看表单” and admins maintain table content in the backend.

**Architecture:** Add a focused Convex module and schema table for reimbursement material tables. Add client API wrappers and shared table helper functions. Update student material pages to link table resources to an HTML table view, and add an admin editor route for CRUD-style table management.

**Tech Stack:** Next.js App Router, React client components, Convex queries/mutations, TypeScript, Tailwind CSS, existing shadcn-style UI primitives, Node-based lightweight helper tests.

---

## File Structure

`convex/schema.ts` adds the `reimbursementMaterialTables` table. `convex/reimbursementTables.ts` owns auth-gated admin mutations, published public queries, and an idempotent default seed mutation. `src/types/index.ts` adds shared TypeScript table types. `src/lib/reimbursement-material-tables.ts` owns pure normalization/search helpers and static material metadata. `scripts/test-reimbursement-material-tables.mjs` verifies the pure helpers. `src/lib/api.ts` exposes wrapper hooks. `src/app/intranet/reimbursements/academic-exchange/page.tsx`, `src/app/intranet/materials/page.tsx`, and the new `src/app/intranet/reimbursements/tables/[slug]/page.tsx` implement student viewing. `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, and the new `src/app/admin/reimbursements/tables/page.tsx` implement admin access.

### Task 1: Shared types and helper tests

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/reimbursement-material-tables.ts`
- Create: `scripts/test-reimbursement-material-tables.mjs`

- [ ] **Step 1: Write the failing helper test**

Create `scripts/test-reimbursement-material-tables.mjs` with assertions that import `filterReimbursementRows`, `normalizeReimbursementTableDraft`, and `createDefaultLivingExpenseTableDraft` from `../src/lib/reimbursement-material-tables.ts`. The script must verify that search matches across all cells, blank rows are removed, row cell counts are padded to match columns, and the default draft uses slug `living-expense-standards`.

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `node scripts/test-reimbursement-material-tables.mjs`

Expected: FAIL because `src/lib/reimbursement-material-tables.ts` does not exist yet.

- [ ] **Step 3: Add shared table types and helper implementation**

Add `ReimbursementMaterialTableColumn`, `ReimbursementMaterialTableRow`, `ReimbursementMaterialTable`, and `ReimbursementMaterialTableDraft` to `src/types/index.ts`. Implement `src/lib/reimbursement-material-tables.ts` with `ACADEMIC_EXCHANGE_REIMBURSEMENT_CATEGORY`, `reimbursementMaterialFiles`, `reimbursementMaterialTableCards`, `createDefaultLivingExpenseTableDraft`, `normalizeReimbursementTableDraft`, and `filterReimbursementRows`.

- [ ] **Step 4: Run the helper test to verify it passes**

Run: `node scripts/test-reimbursement-material-tables.mjs`

Expected: PASS with a short success message.

### Task 2: Convex persistence and client hooks

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/reimbursementTables.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add Convex schema**

Add `reimbursementMaterialTables` with fields `slug`, `title`, `description`, `category`, `columns`, `rows`, `isPublished`, `createdBy`, `createdAt`, and `updatedAt`, plus indexes `by_slug`, `by_category`, and `by_published_category`.

- [ ] **Step 2: Add Convex functions**

Create `convex/reimbursementTables.ts` with public `listPublished` and `getPublishedBySlug` queries, admin `listAdmin`, `upsertAdmin`, `removeAdmin`, and `seedAcademicExchangeDefaults` functions. Reuse session-token hashing in the module, require `admin` or `super_admin`, normalize slug/title/rows, and make upsert and seed idempotent by slug.

- [ ] **Step 3: Add client wrappers**

In `src/lib/api.ts`, add `makeFunctionReference` constants for the six Convex functions and export hooks named `usePublishedReimbursementMaterialTables`, `usePublishedReimbursementMaterialTable`, `useAdminReimbursementMaterialTables`, `useUpsertReimbursementMaterialTable`, `useRemoveReimbursementMaterialTable`, and `useSeedAcademicExchangeReimbursementTables`.

- [ ] **Step 4: Run Convex codegen**

Run: `npx convex codegen`

Expected: command exits 0 and regenerated files remain ignored by git.

### Task 3: Student “查看表单” experience

**Files:**
- Modify: `src/app/intranet/reimbursements/academic-exchange/page.tsx`
- Modify: `src/app/intranet/materials/page.tsx`
- Create: `src/app/intranet/reimbursements/tables/[slug]/page.tsx`

- [ ] **Step 1: Update academic exchange material cards**

Use `reimbursementMaterialFiles`, `reimbursementMaterialTableCards`, and `usePublishedReimbursementMaterialTables` to render file cards as downloads and table cards as links to `/intranet/reimbursements/tables/${slug}` with button text “查看表单”.

- [ ] **Step 2: Update intranet materials page**

Keep existing non-reimbursement sections. For the academic exchange reimbursement section, render static file downloads plus published table cards, using “下载文件” for files and “查看表单” for tables.

- [ ] **Step 3: Add table detail page**

Create a client page at `src/app/intranet/reimbursements/tables/[slug]/page.tsx`. It reads `params.slug`, fetches `usePublishedReimbursementMaterialTable`, shows title/description/updated date/search, filters rows with `filterReimbursementRows`, and renders a horizontally scrollable HTML table.

- [ ] **Step 4: Run lint for touched frontend files**

Run: `npm run lint`

Expected: no lint errors from new frontend code.

### Task 4: Admin table management UI

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/page.tsx`
- Create: `src/app/admin/reimbursements/tables/page.tsx`

- [ ] **Step 1: Add admin navigation**

Add `/admin/reimbursements/tables` to the admin sidebar and to the dashboard quick actions with a `Receipt` or `TableProperties` icon. Include the route in `adminAllowedPrefixes` so normal admins can access it.

- [ ] **Step 2: Build the admin editor**

Create a client page with a table list, selected draft state, form fields for title/slug/description/category/published, inline column label editing, inline cell editing, add/remove column buttons, add/remove row buttons, save button, seed default button, and delete button. Use existing `Input`, `Textarea`, `Button`, `Card`, `Label`, and `Table` primitives.

- [ ] **Step 3: Protect destructive action**

Use `useConfirmDialog` for delete confirmation. Save and seed actions display inline status messages from caught errors.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: no lint errors from admin UI code.

### Task 5: Final verification

**Files:**
- No new files beyond previous tasks.

- [ ] **Step 1: Run helper tests**

Run: `node scripts/test-reimbursement-material-tables.mjs`

Expected: PASS.

- [ ] **Step 2: Run Convex codegen**

Run: `npx convex codegen`

Expected: exits 0.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: exits 0, or report exact pre-existing failures if unrelated files fail.

- [ ] **Step 4: Review git diff**

Run: `git diff --stat` and `git diff --name-only`

Expected: changes are limited to reimbursement table feature files plus existing unrelated user changes that remain unstaged.
