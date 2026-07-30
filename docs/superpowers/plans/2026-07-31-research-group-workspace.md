# Research Group Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete teacher/super-administrator research-group profile management, persistent member ordering, automatic publication relation, and publication visibility control.

**Architecture:** Add optional member order for backward compatibility and a separate visibility-override table. A shared resolver derives publication relations only from structured account identifiers and is reused by management and public content queries.

**Tech Stack:** Next.js, React, TypeScript, Convex, existing AIA profile components and design tokens, Node pure-function/source-contract tests.

---

## File Structure

Create `convex/lib/researchGroupPublications.ts` for ordering and publication-relation logic. Split the management UI into profile, member, and publication components under `src/components/institute`. Keep query/mutation authorization in `convex/instituteDirectory.ts` and public relation integration in `convex/instituteContent.ts`.

### Task 1: Define and test the pure research-group domain

**Files:**
- Create: `scripts/test-research-group-workspace-domain.mjs`
- Create: `convex/lib/researchGroupPublications.ts`

- [ ] Write failing tests for stable legacy ordering, explicit order, compact `10/20/30` order generation, leader/member account deduplication, structured author relation, owner fallback, rejection of text-only name matching, automatic/explicit candidate deduplication, and hidden override.
- [ ] Run `node --test scripts/test-research-group-workspace-domain.mjs`; expect FAIL because the module is missing.
- [ ] Implement pure helpers for sorting, compact ordering, account-set creation, relation-source merging, and effective visibility.
- [ ] Re-run; expect PASS.
- [ ] Commit with message `feat: add research group publication domain`.

### Task 2: Add order and visibility persistence

**Files:**
- Create: `scripts/test-research-group-workspace-source.mjs`
- Modify: `convex/schema.ts`
- Modify: `convex/instituteDirectory.ts`

- [ ] Write failing source tests for optional `sortOrder`, `researchGroupPublicationVisibilityOverrides`, `by_group_publication`, `by_group`, exact-set reorder validation, index-first idempotent upsert, and a shared leader/super-administrator authorization helper.
- [ ] Run RED.
- [ ] Add optional assignment order and the override table. Implement `resolveManagedResearchGroup`.
- [ ] Make assign append at the end, duplicate assign an idempotent no-op/update, and missing remove a no-op.
- [ ] Implement `setTeacherGroupMemberOrder({ groupId?, orderedUserIds })` and `setTeacherGroupPublicationVisibility({ groupId?, publicationId, visible })`.
- [ ] Run GREEN and commit with message `feat: persist group ordering and publication visibility`.

### Task 3: Add complete profile editing

**Files:**
- Modify: `scripts/test-research-group-workspace-domain.mjs`
- Modify: `scripts/test-research-group-workspace-source.mjs`
- Modify: `convex/instituteDirectory.ts`

- [ ] Add failing tests for trim/normalization, deduplicated research areas, HTTP(S)-only public links, required valid names, same-value no-op, and leader/super-administrator authorization.
- [ ] Run RED.
- [ ] Implement `updateTeacherGroupProfile` for names, summaries, descriptions, research areas, recruitment copy, public links, and visibility. Normalize once on the server and patch only changed fields.
- [ ] Run GREEN and commit with message `feat: manage research group profiles`.

### Task 4: Return safe automatic publication candidates

**Files:**
- Modify: `scripts/test-research-group-workspace-domain.mjs`
- Modify: `scripts/test-research-group-workspace-source.mjs`
- Modify: `convex/lib/researchGroupPublications.ts`
- Modify: `convex/instituteDirectory.ts`

- [ ] Add failing tests for leader publication, member publication, nonmember exclusion, text-only same-name exclusion, authorship deduplication, global hidden content, explicit mentions, membership removal/re-addition, and persistent hidden overrides.
- [ ] Run RED.
- [ ] Load structured author IDs from encoded authors, `publicationAuthorships -> institutePeople.accountUserId`, and owner fallback. Merge explicit mentions and automatic candidates.
- [ ] Extend `listTeacherGroupRoster` with complete profile fields, fixed leader, ordered members, and safe publication DTOs: ID, title, display authors, venue, year, relation source, effective visibility. Do not expose internal account IDs.
- [ ] Run GREEN and commit with message `feat: list group publication candidates`.

### Task 5: Apply the same relation to public content

**Files:**
- Modify: `scripts/test-institute-content-relations.mjs`
- Modify: `convex/instituteContent.ts`

- [ ] Write failing assertions that group filtering and public relation DTOs use the shared resolver, hidden overrides suppress both paths, and legacy explicit mentions remain compatible.
- [ ] Run RED.
- [ ] Make `contentKeysForResearchGroup` equal explicit publication mentions union automatic structured-author candidates minus hidden overrides. Add effective group slugs to relation DTOs so the existing profile's second filter remains correct.
- [ ] Run GREEN and commit with message `feat: derive public group publications`.

### Task 6: Expose canonical React hooks

**Files:**
- Modify: `scripts/test-research-group-workspace-source.mjs`
- Modify: `src/lib/api.ts`
- Modify: `src/types/institute.ts`

- [ ] Add failing assertions for `useTeacherGroupRoster(groupId?)`, `useUpdateTeacherGroupProfile`, `useSetTeacherGroupMemberOrder`, and `useSetTeacherGroupPublicationVisibility`; require session token and optional group ID.
- [ ] Run RED.
- [ ] Add hooks and DTO types; keep components free of direct Convex imports.
- [ ] Run GREEN and commit with message `feat: expose group workspace hooks`.

### Task 7: Build the complete AIA management workspace

**Files:**
- Create: `scripts/test-research-group-manage-ui-source.mjs`
- Create: `src/components/institute/research-group-profile-editor.tsx`
- Create: `src/components/institute/research-group-member-manager.tsx`
- Create: `src/components/institute/research-group-publication-manager.tsx`
- Modify: `src/app/groups/manage/page.tsx`

- [ ] Write failing source tests for all profile fields, research-area tags, public links, visibility, desktop dual columns, fixed leader, accessible up/down controls, publication counts and visibility controls, hidden-row retention, responsive states, and AIA fonts/tokens without card/shadow styling.
- [ ] Run RED.
- [ ] Implement the profile editor above a `lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]` management area.
- [ ] Implement member up/down reorder first; add a drag handle only when it preserves keyboard operation. Keep the leader fixed.
- [ ] Implement publication toggles with independent pending/error state so one action does not lock the whole page.
- [ ] Run GREEN, typecheck, and commit with message `feat: add research group management workspace`.

### Task 8: Preserve public links and public ordering

**Files:**
- Modify: `scripts/test-research-group-roster-links.mjs`
- Modify: `src/components/institute/demo-directory-data.ts`
- Modify: `src/components/institute/live-directory-view-model.ts`
- Modify: `src/components/institute/research-group-profile.tsx`
- Modify: `src/components/institute/live-research-group-profile.tsx`

- [ ] Write failing tests proving the adapter preserves public links, unsafe URLs are not links, leader appears once first, members follow stored order, and only effective-public publications render.
- [ ] Run RED.
- [ ] Pass `publicLinks` through the view model and render them with `src/lib/safe-external-url.ts`. Preserve current typography.
- [ ] Run GREEN and commit with message `feat: complete public research group profiles`.

### Task 9: Add super-administrator group selection

**Files:**
- Modify: `scripts/test-research-group-manage-ui-source.mjs`
- Modify: `src/components/portal/portal-client.tsx`
- Modify: `src/app/groups/manage/page.tsx`

- [ ] Add failing tests for super-administrator portal entry and group selector, teacher-hidden selector, group ID propagation to all hooks, and no ordinary-administrator entry.
- [ ] Run RED.
- [ ] Add the flat AIA selector and pass the selected group ID through every query/mutation. Teachers remain scoped to their led group.
- [ ] Run GREEN and commit with message `feat: let super administrators manage research groups`.

### Task 10: Phase 3 integration verification

- [ ] Run:

```bash
for f in \
  scripts/test-research-group-workspace-domain.mjs \
  scripts/test-research-group-workspace-source.mjs \
  scripts/test-research-group-manage-ui-source.mjs \
  scripts/test-teacher-group-assignment-source.mjs \
  scripts/test-research-group-roster-links.mjs \
  scripts/test-institute-directory.mjs \
  scripts/test-institute-directory-relationships.mjs \
  scripts/test-institute-content-relations.mjs; do node --test "$f" || exit 1; done
```

- [ ] Run `npm run lint`, `npx tsc --noEmit --pretty false --incremental false`, and every `scripts/test-*.mjs`.
- [ ] Browser-test profile save/refresh, leader order, keyboard reorder persistence, add/remove idempotency, automatic article appearance, hide/show persistence, membership recomputation, super-administrator selection, authorization denials, responsive dual-column stacking, and consistent fonts.
- [ ] Commit verification corrections with message `test: verify research group workspace`.
