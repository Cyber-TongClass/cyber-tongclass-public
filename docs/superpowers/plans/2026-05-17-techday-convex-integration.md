# TechDay Convex Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the full TechDay platform natively into TongClass, replacing the FastAPI/SQL/local-file backend with Convex and TongClass-aligned Next.js UI.

**Architecture:** TechDay gets its own Convex schema, permission helpers, external session model, storage metadata, and route tree under `/techday/*` plus `/admin/techday/*`. Internal TongClass users are linked by `mainUserId`; external authors, volunteers, and reviewers remain TechDay-only and cannot unlock `/intranet`.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex, Tailwind CSS, shadcn/ui primitives, lucide-react.

---

## File Structure

- Modify `convex/schema.ts`: replace the small TechDay prototype schema with full TechDay tables.
- Create `convex/techday/lib.ts`: validators, normalization, hashing, actor/session, and permission helpers.
- Create `convex/techday/auth.ts`: external registration/login, internal sync, current principal, password changes.
- Create `convex/techday/directories.ts`: organizations, directions, role templates, and settings.
- Create `convex/techday/submissions.ts`: public exhibit, author CRUD, admin review, renumbering, votes, export rows.
- Create `convex/techday/reimbursements.ts`: volunteer/admin reimbursement CRUD, review, export rows.
- Create `convex/techday/awards.ts`: award definitions, reviewer recommendations, admin assignment.
- Create `convex/techday/posts.ts`: TechDay Markdown posts, visibility, manage/editor/publish flows.
- Create `convex/techday/files.ts`: upload URLs, storage metadata, permission-checked file URLs.
- Create `convex/techday/admin.ts`: user assignment, reviewer invites, export/migration helpers.
- Modify `src/lib/api.ts`: add TechDay query/mutation hooks so UI does not call raw Convex APIs.
- Create `src/types/techday.ts`: shared frontend TechDay types and labels.
- Create `src/components/techday/*`: shell, guards, badges, filters, forms, file controls, tables.
- Replace `src/app/techday/page.tsx` and create the full `/techday/*` route tree.
- Create `/src/app/admin/techday/*` admin route pages.
- Modify `src/app/intranet/page.tsx`: keep the TechDay block and align copy/grid.
- Create `scripts/techday-migration/README.md` and import helpers for manual, idempotent migration.
- Update `documents/api.md` with TechDay Convex modules and migration notes.

## Task 1: Schema Foundation

**Files:**
- Modify: `convex/schema.ts`

- [ ] Replace the prototype `techDayParticipants`, `techDayAnnouncements`, `techDaySessions`, and `techDaySubmissions` tables with the full TechDay table set from the design spec.
- [ ] Add indexes for email, student ID, role, main user, directions, submission filters, vote logs, reimbursements, awards, reviewer invites, posts, settings, and migration maps.
- [ ] Run `npm run build` after codegen-capable functions exist; before functions exist, run `npx convex codegen` only if it does not require missing module imports.

## Task 2: Convex Helpers And Auth

**Files:**
- Create: `convex/techday/lib.ts`
- Create: `convex/techday/auth.ts`
- Modify: `src/lib/api.ts`

- [ ] Implement text/email normalization, SHA-256 hashing, salt/token generation, and uniqueness helpers.
- [ ] Implement `resolvePrincipal` with three states: public, internal TongClass user, external TechDay session.
- [ ] Implement permission helpers: admin, author, volunteer, reviewer, vote editor, news publisher, owner/admin.
- [ ] Implement registration/login for author, volunteer, reviewer, and external login.
- [ ] Implement `syncInternalUser` so a logged-in TongClass user gets an internal TechDay user without a second login.
- [ ] Add `useTechDayCurrentPrincipal`, registration, login, logout, and session hooks in `src/lib/api.ts`.

## Task 3: Reference Data And Admin Settings

**Files:**
- Create: `convex/techday/directories.ts`
- Create: `convex/techday/admin.ts`
- Modify: `src/lib/api.ts`

- [ ] Implement public organization and direction listing.
- [ ] Implement admin CRUD for organizations, directions, role templates, awards, reviewer invites, user assignments, and vote/display settings.
- [ ] Implement CSV-shaped export rows for TechDay users.
- [ ] Add `src/lib/api.ts` hooks for these functions.

## Task 4: Submissions And File Storage

**Files:**
- Create: `convex/techday/submissions.ts`
- Create: `convex/techday/files.ts`
- Modify: `src/lib/api.ts`

- [ ] Implement public approved submission list/detail with filters for track, direction, year, and vote sorting when enabled.
- [ ] Implement author-owned submission create/update/delete and admin review/update/delete/renumber.
- [ ] Implement vote update with per-field audit logs.
- [ ] Implement storage URL generation and poster finalization/download URL functions.
- [ ] Add client hooks for public, author, admin, vote, export, and poster flows.

## Task 5: Reimbursements

**Files:**
- Create: `convex/techday/reimbursements.ts`
- Modify: `convex/techday/files.ts`
- Modify: `src/lib/api.ts`

- [ ] Implement owner/admin reimbursement list, create, update, delete, review, attachment finalize, attachment URL, and CSV-shaped export rows.
- [ ] Enforce organization assignment rules from the source project.
- [ ] Add client hooks for reimbursement workflows.

## Task 6: Awards And Reviewer Workflow

**Files:**
- Create: `convex/techday/awards.ts`
- Modify: `src/lib/api.ts`

- [ ] Implement award CRUD.
- [ ] Implement reviewer/admin award submission listing with direction/year/track/status filters.
- [ ] Implement reviewer recommendation upsert/delete.
- [ ] Implement admin award assignment and computed tags/badges.
- [ ] Add client hooks for awards.

## Task 7: TechDay Posts

**Files:**
- Create: `convex/techday/posts.ts`
- Modify: `src/lib/api.ts`

- [ ] Implement published list/detail with `public`, `authenticated`, and role-based visibility.
- [ ] Implement manage list, create, update, delete, and publish toggle for admin/news publishers.
- [ ] Preserve source fields: slug, title, date, category, summary, tags, visibility, author, published, content.
- [ ] Add client hooks for posts.

## Task 8: Frontend Shared Components

**Files:**
- Create: `src/types/techday.ts`
- Create: `src/components/techday/techday-shell.tsx`
- Create: `src/components/techday/techday-access-guard.tsx`
- Create: `src/components/techday/techday-badges.tsx`
- Create: `src/components/techday/techday-filters.tsx`
- Create: `src/components/techday/techday-file-controls.tsx`
- Create: `src/components/techday/techday-submission-form.tsx`

- [ ] Implement shared labels, status colors, track/year/direction controls, role-aware guard, storage upload/download controls, and submission form.
- [ ] Use existing `Button`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`, `ConfirmDialog`, `Input`, `Textarea`, `Select`, and `Label`.

## Task 9: Public And Participant Routes

**Files:**
- Replace: `src/app/techday/page.tsx`
- Create: `src/app/techday/login/page.tsx`
- Create: `src/app/techday/papers/[id]/page.tsx`
- Create: `src/app/techday/news/page.tsx`
- Create: `src/app/techday/news/[slug]/page.tsx`
- Create: `src/app/techday/news/manage/page.tsx`
- Create: `src/app/techday/news/editor/new/page.tsx`
- Create: `src/app/techday/news/editor/[slug]/page.tsx`
- Create: `src/app/techday/register/author/page.tsx`
- Create: `src/app/techday/register/volunteer/page.tsx`
- Create: `src/app/techday/register/reviewer/page.tsx`
- Create: `src/app/techday/author/profile/page.tsx`
- Create: `src/app/techday/author/submissions/new/page.tsx`
- Create: `src/app/techday/author/submissions/[id]/edit/page.tsx`
- Create: `src/app/techday/volunteer/profile/page.tsx`
- Create: `src/app/techday/reimbursements/page.tsx`
- Create: `src/app/techday/awards/page.tsx`

- [ ] Port each source Vite route into Next App Router using the shared component layer and TechDay hooks.
- [ ] Keep all identity checks role-aware and scoped to TechDay.
- [ ] Align visual design with the TongClass site instead of carrying over the Vite header.

## Task 10: Admin Routes

**Files:**
- Create: `src/app/admin/techday/settings/page.tsx`
- Create: `src/app/admin/techday/exhibits/page.tsx`
- Create: `src/app/admin/techday/database/page.tsx`

- [ ] Port settings, exhibit review, and scoped maintenance views.
- [ ] Gate settings/exhibits to TechDay admin or TongClass admin/super_admin.
- [ ] Gate database maintenance to TongClass super_admin and only expose allowlisted TechDay tables/imports.

## Task 11: Migration Utilities And Docs

**Files:**
- Create: `scripts/techday-migration/README.md`
- Create: `scripts/techday-migration/export-source.mjs`
- Create: `scripts/techday-migration/import-to-convex.mjs`
- Modify: `documents/api.md`

- [ ] Document required source DB dump and upload directory inputs.
- [ ] Implement idempotent JSON export/import skeleton using legacy IDs and file manifests.
- [ ] Document that these scripts are manually run and never tied to `dev`, `build`, `start`, or lifecycle hooks.
- [ ] Update API docs with TechDay Convex module summaries.

## Task 12: Verification

**Files:**
- Modify as needed based on lint/build errors.

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Manually inspect `/intranet`, `/techday`, `/techday/papers/[id]`, external registration/login, author profile/submission, reimbursements, awards, `/admin/techday/settings`, and `/admin/techday/exhibits`.
- [ ] Fix compile, lint, runtime, and obvious UI issues without deleting user work.
