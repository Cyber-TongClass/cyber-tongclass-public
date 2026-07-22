# Hide About Tong Class Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `关于通班` entry from the shared site navigation without changing the `/about` route or header brand.

**Architecture:** The desktop and mobile navigation menus both render the `navigation` array in `Navbar`. Removing the single `/about` item from that array updates both menu variants while leaving routing untouched.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, ESLint.

---

### Task 1: Remove the shared navigation entry

**Files:**
- Modify: `src/components/layout/navbar.tsx:21-29`
- Test: `npm run lint`

- [ ] **Step 1: Define the expected navigation configuration**

The navigation list must begin with the existing updates item and must not contain an object with `name: "关于通班"` or `href: "/about"`:

```ts
const navigation = [
  { name: "动态", href: "/updates" },
  { name: "成员", href: "/members" },
]
```

- [ ] **Step 2: Verify the current configuration needs the change**

Run: `rg -n 'name: "关于通班"|href: "/about"' src/components/layout/navbar.tsx`

Expected: the command reports the existing `关于通班` navigation object.

- [ ] **Step 3: Remove the `关于通班` object**

Delete this exact element from the shared `navigation` array:

```ts
{ name: "关于通班", href: "/about" },
```

Do not edit the remaining navigation entries, the desktop/mobile rendering logic, the `/about` page, or the header logo and title.

- [ ] **Step 4: Verify the configured menu no longer contains the entry**

Run: `! rg -n 'name: "关于通班"|href: "/about"' src/components/layout/navbar.tsx`

Expected: success with no output.

- [ ] **Step 5: Run the project quality gate**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors or warnings.

- [ ] **Step 6: Commit the scoped implementation**

```bash
git add src/components/layout/navbar.tsx docs/superpowers/plans/2026-07-23-hide-about-tongclass-navigation.md
git commit -m "fix: hide about tongclass navigation"
```
