# Portal List Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/portal/list` the canonical AIA portal module list and redirect the legacy `/portal` URL to it.

**Architecture:** The portal client remains a single shared component. A new server page at `/portal/list` renders it; the root portal route becomes a server redirect only. The existing source-contract test verifies all three public routing contracts before lint checks the project.

**Tech Stack:** Next.js App Router, TypeScript, Node.js `assert` source-contract tests, ESLint.

---

## File structure

- Create: `src/app/portal/list/page.tsx` — canonical server route that supplies portal metadata and renders `PortalClient`.
- Modify: `src/app/portal/page.tsx` — legacy redirect route with no portal UI.
- Modify: `src/components/portal/portal-client.tsx` — change the login return URL to `/portal/list`.
- Modify: `scripts/test-aia-portal-source.mjs` — source-level contracts for the new canonical page, redirect route, and login target.

### Task 1: Define the routing contract test

**Files:**
- Modify: `scripts/test-aia-portal-source.mjs`

- [ ] **Step 1: Write the failing test**

Add the following source reads and assertions immediately after the existing `portalClient` assertion block:

```js
const portalPage = readSource("src/app/portal/page.tsx")
const portalListPage = readSource("src/app/portal/list/page.tsx")

assert.match(portalPage, /import\s*\{\s*redirect\s*\}\s*from\s*["']next\/navigation["']/)
assert.match(portalPage, /redirect\(["']\/portal\/list["']\)/)
assert.doesNotMatch(portalPage, /PortalClient/)
assert.match(portalListPage, /from\s+["']@\/components\/portal\/portal-client["']/)
assert.match(portalListPage, /<PortalClient\s*\/?\s*>/)
assert.match(portalClient, /const loginHref = "\/login\?next=%2Fportal%2Flist"/)
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node scripts/test-aia-portal-source.mjs`

Expected: failure because `src/app/portal/list/page.tsx` does not exist and the root route does not redirect.

- [ ] **Step 3: Commit the failing test**

```bash
git add scripts/test-aia-portal-source.mjs
git commit -m "test: define portal list route contract"
```

### Task 2: Introduce the canonical list route

**Files:**
- Create: `src/app/portal/list/page.tsx`
- Modify: `src/app/portal/page.tsx`
- Modify: `src/components/portal/portal-client.tsx`

- [ ] **Step 1: Create the canonical route**

Create `src/app/portal/list/page.tsx` with:

```tsx
import type { Metadata } from "next"

import { PortalClient } from "@/components/portal/portal-client"

export const metadata: Metadata = {
  title: "内网",
  description:
    "北京大学人工智能研究院内网入口 — 在同一研究院外壳下，按账户身份呈现通知、Coffee Talk、通班与管理模块。",
  robots: { index: false, follow: false },
}

export default function PortalListPage() {
  return <PortalClient />
}
```

- [ ] **Step 2: Replace the legacy route with a server redirect**

Replace all content in `src/app/portal/page.tsx` with:

```tsx
import { redirect } from "next/navigation"

export default function PortalPage() {
  redirect("/portal/list")
}
```

- [ ] **Step 3: Update the post-login destination**

In `src/components/portal/portal-client.tsx`, replace:

```ts
const loginHref = "/login?next=%2Fportal"
```

with:

```ts
const loginHref = "/login?next=%2Fportal%2Flist"
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node scripts/test-aia-portal-source.mjs`

Expected: `AIA portal source checks passed.`

- [ ] **Step 5: Commit the implementation**

```bash
git add src/app/portal/page.tsx src/app/portal/list/page.tsx src/components/portal/portal-client.tsx
git commit -m "feat: make portal list canonical"
```

### Task 3: Verify the canonical and legacy URLs

**Files:**
- Verify only: `src/app/portal/page.tsx`
- Verify only: `src/app/portal/list/page.tsx`
- Verify only: `src/components/portal/portal-client.tsx`
- Verify only: `scripts/test-aia-portal-source.mjs`

- [ ] **Step 1: Run the focused source contract**

Run: `node scripts/test-aia-portal-source.mjs`

Expected: `AIA portal source checks passed.`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: process exits with code `0` and reports no ESLint warnings or errors.

- [ ] **Step 3: Verify both local routes in the running app**

Run:

```bash
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/portal
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/portal/list
```

Expected: `/portal` returns a redirect whose destination is `/portal/list`; `/portal/list` returns `200`.
