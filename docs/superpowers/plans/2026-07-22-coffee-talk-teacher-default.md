# Coffee Talk Teacher Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every account explicitly classified as a teacher immediately available for Coffee Talk by default, while allowing that teacher and a super administrator to opt out.

**Architecture:** Keep Coffee Talk applications assigned to `institutePeople` records, but automatically create and bind a non-demo public directory record whenever a user becomes a teacher. The new availability mutation derives authority from the session and changes only the bound teacher record; the client renders a teacher self-service switch in account settings. This preserves existing application ownership, notification, and state-transition contracts.

**Tech Stack:** Next.js App Router, React, Convex, Node.js source-contract tests.

---

### Task 1: Cover the teacher-directory synchronization contract

**Files:**
- Create: `scripts/test-coffee-talk-teacher-default-source.mjs`
- Modify: `convex/users.ts`
- Modify: `convex/instituteDirectory.ts`

- [ ] **Step 1: Write the failing source-contract test**

```js
assert.match(users, /ensureTeacherCoffeeTalkProfile\(ctx, \{ userId, user, now \}\)/)
assert.match(directory, /export async function ensureTeacherCoffeeTalkProfile/)
assert.match(directory, /coffeeTalkOpen: true/)
assert.match(directory, /accountUserId: input\.userId/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: FAIL because automatic teacher-profile synchronization does not yet exist.

- [ ] **Step 3: Implement the minimal synchronization helper and invoke it after teacher account creation or assignment**

```ts
if (storedIdentityType === "teacher") {
  await ensureTeacherCoffeeTalkProfile(ctx, { userId, user: createdUser, now })
}
```

The helper finds a profile already bound to that account, otherwise inserts a public non-demo teacher profile with `coffeeTalkOpen: true`; it must use a deterministic collision-free slug and never overwrite an existing unbound profile.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: PASS.

### Task 2: Add secure Coffee Talk availability control

**Files:**
- Modify: `convex/coffeeTalk.ts`
- Modify: `src/lib/api.ts`
- Modify: `scripts/test-coffee-talk-teacher-default-source.mjs`

- [ ] **Step 1: Extend the failing test for the authorization boundary**

```js
assert.match(coffeeTalk, /export const setTeacherAvailability = mutation/)
assert.match(coffeeTalk, /getUserBySession/)
assert.match(coffeeTalk, /actor\.role === "super_admin"/)
assert.match(coffeeTalk, /accountUserId.*actor\._id/)
assert.match(coffeeTalk, /coffeeTalkOpen: args\.open/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: FAIL because the availability mutation and canonical hook do not exist.

- [ ] **Step 3: Implement the mutation and hook**

```ts
export const setTeacherAvailability = mutation({
  args: { sessionToken: v.string(), open: v.boolean(), teacherSlug: v.optional(v.string()) },
  handler: async (ctx, args) => { /* session-derived teacher or super-admin only */ },
})
```

The teacher may change only a profile bound to their account; a super administrator may target an explicit teacher slug. The mutation does not expose account IDs and cannot change a non-teacher profile.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: PASS.

### Task 3: Add a standalone idempotent migration for existing teachers

**Files:**
- Modify: `convex/instituteDirectory.ts`
- Modify: `scripts/test-coffee-talk-teacher-default-source.mjs`

- [ ] **Step 1: Extend the failing test for the migration contract**

```js
assert.match(directory, /export const syncExistingTeacherCoffeeTalkProfiles = mutation/)
assert.match(directory, /requireSuperAdminBySession/)
assert.match(directory, /user\.identityType !== "teacher"/)
assert.match(directory, /ensureTeacherCoffeeTalkProfile/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: FAIL because existing teacher accounts are not yet backfilled.

- [ ] **Step 3: Implement the manually triggered migration**

```ts
export const syncExistingTeacherCoffeeTalkProfiles = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => { /* super-admin gated, idempotent */ },
})
```

It scans only users whose stored identity is `teacher`, calls the same synchronization helper, and returns created/skipped counts. It is never called by the build, start, or dev lifecycle.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: PASS.

### Task 4: Provide the teacher self-service switch

**Files:**
- Modify: `src/app/settings/page.tsx`
- Modify: `src/lib/api.ts`
- Modify: `scripts/test-coffee-talk-teacher-default-source.mjs`

- [ ] **Step 1: Extend the failing test for the settings UI**

```js
assert.match(settings, /currentUser\.identityType === "teacher"/)
assert.match(settings, /useSetCoffeeTalkTeacherAvailability/)
assert.match(settings, /Coffee Talk 申请/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: FAIL because teachers cannot currently set their own availability.

- [ ] **Step 3: Implement the availability card**

```tsx
{currentUser.identityType === "teacher" ? (
  <Card>{/* enabled/disabled explanation and one toggle button */}</Card>
) : null}
```

The switch calls only the canonical hook, prevents duplicate requests, and reports the actual mutation error. It never renders for other identity groups.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs`

Expected: PASS.

### Task 5: Verify affected behavior

**Files:**
- Test: `scripts/test-coffee-talk-teacher-default-source.mjs`
- Test: `scripts/test-coffee-talk-backend-source.mjs`
- Test: `scripts/test-coffee-talk-live-ui-source.mjs`
- Test: `scripts/test-aia-identity-groups.mjs`

- [ ] **Step 1: Run the focused source-contract suite**

Run: `node --test scripts/test-coffee-talk-teacher-default-source.mjs scripts/test-coffee-talk-backend-source.mjs scripts/test-coffee-talk-live-ui-source.mjs scripts/test-aia-identity-groups.mjs`

Expected: PASS with no failed subtests.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no warnings.

- [ ] **Step 3: Commit only files owned by this change**

```bash
git add convex/users.ts convex/instituteDirectory.ts convex/coffeeTalk.ts src/lib/api.ts src/app/settings/page.tsx scripts/test-coffee-talk-teacher-default-source.mjs docs/superpowers/plans/2026-07-22-coffee-talk-teacher-default.md
git commit -m "fix: default teachers to Coffee Talk availability"
```
