# OA Form Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic OA form publishing, submission, file upload, and review platform, then extend it with configurable result association.

**Architecture:** Use a Convex-backed form definition and submission model. Keep reusable schema/validation helpers in `src/lib/oa-forms.ts`, expose only wrapper hooks from `src/lib/api.ts`, and render admin/member experiences with focused components under `src/components/oa-forms/`.

**Tech Stack:** Next.js App Router, React client components, Convex queries/mutations/storage, shadcn-style local UI primitives, Node built-in test runner for helper tests, TypeScript.

---

### Task 1: Pure form schema helpers with TDD

- [ ] Create `scripts/test-oa-forms.mjs` first. It imports `src/lib/oa-forms.ts` and asserts slug normalization, default form creation, required-field validation, table answer validation, file metadata validation, CSV escaping, and status/result labels.
- [ ] Run `node --test scripts/test-oa-forms.mjs`; expected RED failure because `src/lib/oa-forms.ts` does not exist yet.
- [ ] Create `src/lib/oa-forms.ts` with field/status types, default builders, validation helpers, CSV helpers, and example form template helpers.
- [ ] Run `node --test scripts/test-oa-forms.mjs`; expected GREEN pass.

### Task 2: Convex OA form backend

- [ ] Modify `convex/schema.ts` to add `oaForms` and `oaFormSubmissions` tables with indexes by slug, published state, category, creator, form, submitter, status, and created time.
- [ ] Create `convex/oaForms.ts` with session helpers, admin guards, validators, published form list/get queries, admin list/get/upsert/publish/remove queries/mutations, upload URL generation, submission create/list/get queries, attachment URL query, review mutation, CSV export query, result config update mutation, and result batch update mutation.
- [ ] Ensure all insert/upsert behavior is idempotent by slug where applicable.
- [ ] Run `npx convex codegen` after backend changes.

### Task 3: API wrappers and shared components

- [ ] Modify `src/lib/api.ts` to add OA form wrapper hooks for published forms, admin forms, submissions, upload URL generation, attachment URL lookup, review, export, and result updates.
- [ ] Modify `src/types/index.ts` to expose OA form and submission interfaces.
- [ ] Create `src/components/oa-forms/oa-form-renderer.tsx` for member-side field rendering and answer state.
- [ ] Create `src/components/oa-forms/oa-form-builder.tsx` for admin field configuration.
- [ ] Create `src/components/oa-forms/oa-form-submissions-table.tsx` for admin review list.

### Task 4: Phase B pages and navigation

- [ ] Modify `src/app/intranet/page.tsx` to add an OA form entry.
- [ ] Create `src/app/intranet/forms/page.tsx` for published/current form list.
- [ ] Create `src/app/intranet/forms/[slug]/page.tsx` for member submission and own history.
- [ ] Modify `src/app/admin/layout.tsx` and `src/app/admin/page.tsx` to add OA form management navigation.
- [ ] Create `src/app/admin/forms/page.tsx` for admin list and creation.
- [ ] Create `src/app/admin/forms/[id]/page.tsx` for builder/edit/publish.
- [ ] Create `src/app/admin/forms/[id]/submissions/page.tsx` for review, CSV export, and attachment links.

### Task 5: Phase B verification and subagent review

- [ ] Run `node --test scripts/test-oa-forms.mjs`.
- [ ] Run `npx convex codegen`.
- [ ] Run `npx tsc --noEmit --incremental false`.
- [ ] Run `npm run lint`.
- [ ] Dispatch a subagent to independently inspect Phase B behavior, run focused checks where possible, and report blockers before Phase C starts.

### Task 6: Phase C result association

- [ ] Extend admin builder with result field configuration and result visibility settings.
- [ ] Extend submissions admin page with editable result columns and batch import textarea keyed by student id or submission id.
- [ ] Extend member form page/detail to show visible result values for the current user’s own submission.
- [ ] Extend helper tests for result import parsing and visibility filtering.
- [ ] Re-run full verification.

### Task 7: Reimbursement subtype and separated entries

- [ ] Extend base OA form schema/types/helpers with `kind: "form" | "reimbursement"`, defaulting existing/missing records to `form`.
- [ ] Add reimbursement default template helper with project, invoice, expense table, and receipt upload fields.
- [ ] Filter `/intranet/forms` and `/admin/forms` to generic `kind=form` records.
- [ ] Upgrade `/intranet/reimbursements` to show existing academic-exchange entry plus published `kind=reimbursement` forms.
- [ ] Add `/admin/reimbursements` for reimbursement form templates and link it from admin navigation while preserving `/admin/reimbursements/tables`.
- [ ] Reuse `OAFormBuilder`, `OAFormRenderer`, and `OAFormSubmissionsTable` rather than duplicating form logic.
- [ ] Verify helper tests, Convex codegen, source typecheck, and dev-page responses.
