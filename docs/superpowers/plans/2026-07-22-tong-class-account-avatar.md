# Tong Class Account Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Tong Class login control with an authenticated avatar and account menu.

**Architecture:** `TongClassNavbar` already consumes `useAuth()` to decide which navigation links are visible. Extend that existing hook result with the user record and logout callback, then render an account menu only when both the authenticated state and user record are available. The source-level Node test protects the logged-in and logged-out branches without adding a browser-test dependency.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, shadcn dropdown menu, Node test runner.

---

### Task 1: Protect authenticated account navigation

**Files:**
- Create: `scripts/test-tong-class-login-navigation-source.mjs`
- Modify: `src/components/layout/tong-class-navbar.tsx`

- [ ] **Step 1: Write the failing test**

```js
test("Tong Class navigation renders an account control from the authenticated user", () => {
  const source = readFileSync("src/components/layout/tong-class-navbar.tsx", "utf8")

  assert.match(source, /const\s+\{\s*currentUser,\s*isAuthenticated,\s*logout\s*\}\s*=\s*useAuth\(\)/)
  assert.match(source, /const\s+currentUserPhoto\s*=\s*currentUser\?\.realPhoto\s*\|\|\s*currentUser\?\.avatar/)
  assert.match(source, /isAuthenticated\s*&&\s*currentUser\s*\?/)
  assert.match(source, /logout\(tongClassHomePath\(\)\)/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-tong-class-login-navigation-source.mjs`

Expected: failure because the static navbar currently destructures only `isAuthenticated` and has no account control.

- [ ] **Step 3: Implement the minimal account control**

```tsx
const { currentUser, isAuthenticated, logout } = useAuth()
const currentUserPhoto = currentUser?.realPhoto || currentUser?.avatar

{isAuthenticated && currentUser ? (
  <DropdownMenu>{/* avatar, profile link, and logout */}</DropdownMenu>
) : (
  <Link href="/login">登录</Link>
)}
```

Use `tongClassMembersPath(currentUser.username || String(currentUser._id))` for the profile path and `logout(tongClassHomePath())` for logout. Add corresponding mobile menu controls.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test-tong-class-login-navigation-source.mjs`

Expected: one passing subtest.

- [ ] **Step 5: Run lint for the edited component**

Run: `npx eslint src/components/layout/tong-class-navbar.tsx scripts/test-tong-class-login-navigation-source.mjs --max-warnings=0`

Expected: exit code 0.
