# Session-Aware Admin Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every client-facing current-user and admin-capability hook respects the existing Tong Class session token so valid super administrators can use protected administrative interfaces.

**Architecture:** `useAuth` is already the canonical resolver for the stored Tong Class session token and server-validated current account. The legacy convenience hooks in `src/lib/api.ts` will derive their values from `useAuth`, while protected backend operations retain their own session-token authorization checks.

**Tech Stack:** Next.js App Router, React hooks, Convex React client, Node.js built-in test runner, ESLint.

---

### Task 1: Lock in the session-aware capability contract

**Files:**
- Modify: `scripts/test-institute-binding-ui-source.mjs`
- Test: `scripts/test-institute-binding-ui-source.mjs`

- [ ] **Step 1: Write the failing test**

Add a test that reads `src/lib/api.ts` and verifies the four exported capability hooks delegate to `useAuth`, while asserting the old Identity-only direct query return statements are absent.

```js
test("legacy current-account hooks share the session-aware auth authority", () => {
  const api = source(apiPath)

  assert.match(api, /import\s+\{\s*useAuth\s*\}\s+from\s+["']@\/lib\/hooks\/use-auth["']/)
  for (const hook of ["useCurrentUser", "useCurrentUserRole", "useIsAdmin", "useIsSuperAdmin"]) {
    assert.match(api, new RegExp(`export function ${hook}\\s*\\(\\)\\s*\\{[\\s\\S]*?useAuth\\(\\)`))
  }
  assert.doesNotMatch(api, /return useQuery\(currentUserRef\)/)
  assert.doesNotMatch(api, /return useQuery\(currentUserRoleRef\)/)
  assert.doesNotMatch(api, /return useQuery\(isAdminRef\)/)
  assert.doesNotMatch(api, /return useQuery\(isSuperAdminRef\)/)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test scripts/test-institute-binding-ui-source.mjs`

Expected: the new test fails because `src/lib/api.ts` has no `useAuth` import and each capability hook directly invokes an Identity-only query.

- [ ] **Step 3: Implement the shared capability wrappers**

In `src/lib/api.ts`, import `useAuth` and replace the four direct-query bodies with session-aware derived values.

```ts
export function useCurrentUser() {
  return useAuth().currentUser
}

export function useCurrentUserRole() {
  return useAuth().currentRole
}

export function useIsAdmin() {
  return useAuth().isAdmin
}

export function useIsSuperAdmin() {
  return useAuth().isSuperAdmin
}
```

Remove the now-unused four Identity-only function references from the same file. Do not alter `convex/` or the session-token arguments used by protected mutations and queries.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test scripts/test-institute-binding-ui-source.mjs`

Expected: all tests pass, including the new capability-contract regression test.

- [ ] **Step 5: Run lint and commit only the scoped changes**

Run: `npm run lint`

Expected: exit code 0 with no warnings.

```bash
git add src/lib/api.ts scripts/test-institute-binding-ui-source.mjs
git commit -m "fix(auth): unify client admin capability checks"
```

### Task 2: Verify the active administrative route behavior

**Files:**
- Verify only: `src/app/admin/institute/bindings/page.tsx`

- [ ] **Step 1: Confirm the page consumes the shared capability hook**

Run: `node --test scripts/test-institute-binding-ui-source.mjs`

Expected: the existing binding-console test confirms the page uses `useIsSuperAdmin` and no direct Convex client API.

- [ ] **Step 2: Confirm active deployment account role without exposing credentials**

Run: `npx convex data users --deployment bold-sandpiper-236 --limit 500 --format json | node -e 'let s=""; process.stdin.on("data", c => s += c).on("end", () => { const user = JSON.parse(s).find((item) => item.studentId === "2400017416"); console.log(JSON.stringify({ studentId: user?.studentId, role: user?.role }, null, 2)); })'`

Expected: the command prints `studentId` `2400017416` and `role` `super_admin` only.

- [ ] **Step 3: Commit the documentation separately if it is intended to be retained**

```bash
git add docs/superpowers/specs/2026-07-23-session-aware-admin-capabilities-design.md docs/superpowers/plans/2026-07-23-session-aware-admin-capabilities.md
git commit -m "docs: specify session-aware admin capabilities"
```
