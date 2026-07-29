# Graduate Tong Class Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give graduate accounts a restricted three-section Tong Class shell, graduate roster, audience-aware events, and four-item intranet.

**Architecture:** Extend existing user and event queries with typed identity/audience inputs so filtering occurs in Convex. Reuse the existing Tong Class routes and components, branching only on `currentUser.identityType === "graduate"`; undergraduate paths remain unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex, Node.js source-contract tests, ESLint.

---

### Task 1: Add the failing graduate source contract

**Files:** Modify `scripts/test-aia-portal-source.mjs`.

- [ ] Add assertions that the navbar checks `currentUser?.identityType === "graduate"`, exposes exactly `成员`, `活动`, and `内网` for that branch, the intranet defines `techday`, `materials`, `reimbursements`, and `forms` as Graduate modules, and the event/user server sources contain `audiences` and `identityType` filtering.
- [ ] Run `node scripts/test-aia-portal-source.mjs`; expect failure because the Grad branch and event audience contract do not yet exist.

### Task 2: Make roster and events identity-aware in Convex

**Files:** Modify `convex/schema.ts`, `convex/users.ts`, `convex/events.ts`, `src/lib/api.ts`, and `src/types/index.ts`.

- [ ] Add `audiences: v.optional(v.array(v.union(v.literal("undergrad"), v.literal("graduate"))))` to the events table and create/update arguments.
- [ ] Extend `userListArgs` with optional `identityType`; in both public and signed-in directory queries select `user.identityType === args.identityType` when present, otherwise retain `isVisibleClassMember`.
- [ ] Let `events.list` accept an optional session token, resolve its identity when supplied, and retain an event when `audiences` is absent/empty or includes that identity; anonymous results retain only absent/empty audiences. Pass the stored session token in `useEvents`.
- [ ] Add `audiences?: Array<"undergrad" | "graduate">` to `Event`.
- [ ] Run `npx convex codegen` and the focused source contract; expect passing contracts and regenerated client types.

### Task 3: Add Grad-specific views while reusing the routes

**Files:** Modify `src/components/layout/tong-class-navbar.tsx`, `src/app/tong-class/members/page.tsx`, `src/app/tong-class/events/page.tsx`, and `src/app/tong-class/intranet/page.tsx`.

- [ ] Define `const isGraduate = currentUser?.identityType === "graduate"` in the navbar. For a graduate choose `[{ name: "成员", href: tongClassMembersPath(), auth: true }, { name: "活动", href: tongClassEventsPath(), auth: true }, { name: "内网", href: tongClassIntranetPath(), auth: true, loggedInOnly: true }]`; keep the existing array for all other users. Change the identity title to `人工智能研究院研究生内网` and subtitle to `Graduate Intranet` only when `isGraduate`.
- [ ] In Members, obtain `currentUser` with `useAuth`, request `useUsers({ limit: 1000, identityType: isGraduate ? "graduate" : undefined })`, and use `研究生成员` plus Grad-specific lede only for graduates. Preserve all filters/cards/profile links.
- [ ] Events continues to use the same `useEvents` component/API; update Grad-only hero copy to clarify that configured audience rules apply.
- [ ] In Intranet, read `currentUser`; if graduate, render `defaultIntranetModules.filter(({ id }) => ["techday", "materials", "reimbursements", "forms"].includes(id))` instead of the configured undergraduate list, and use a Graduate-specific title/lede.
- [ ] Run the focused source contract; expect it to pass.

### Task 4: Configure event audiences in administration

**Files:** Modify `src/app/admin/events/new/page.tsx`, `src/app/admin/events/[id]/page.tsx`, and `src/app/admin/events/page.tsx`.

- [ ] Add `audiences: ["undergrad", "graduate"]` to new-event state and carry `target.audiences || ["undergrad", "graduate"]` into edit state so legacy events remain shared.
- [ ] Add labelled undergrad and graduate checkboxes that toggle their values in `formData.audiences`; include `audiences` in create/update mutation payloads.
- [ ] Add an audience column/badge to the event list so administrators can see whether an event is shared or restricted.
- [ ] Run `node scripts/test-aia-portal-source.mjs` and `npm run lint`; both must exit successfully.

### Task 5: Verify live behavior

**Files:** Verify only.

- [ ] Run `npx convex codegen`, `node scripts/test-aia-portal-source.mjs`, and `npm run lint`.
- [ ] With graduate and undergraduate test accounts, verify `/tong-class` navigation labels, roster contents, event visibility for a graduate-only event, and the four Grad intranet cards. Verify unaudienced legacy events remain visible to both identities.
