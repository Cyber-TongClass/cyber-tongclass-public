# Remove Services Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the public `/services` entry point, return the AIA 404 page for that URL, and retain OA as an authenticated `/portal/list` option.

**Architecture:** The root services page becomes a thin server `notFound()` route. Navigation, footer, and sitemap discovery remove the dead public entry. The OA route remains unchanged and becomes discoverable through a new `PortalClient` list module.

**Tech Stack:** Next.js App Router, TypeScript, Node.js `assert` source-contract tests, ESLint.

---

## File structure

- Modify: `src/app/services/page.tsx` — return the shared 404 response for `/services`.
- Modify: `src/components/layout/aia-navbar.tsx` — remove the public `服务` nav entry.
- Modify: `src/components/layout/aia-footer.tsx` — remove the public `服务中心` footer link.
- Modify: `src/app/sitemap.tsx` — omit the deleted `/services` URL.
- Modify: `src/components/portal/portal-client.tsx` — add the OA directory to the common portal modules.
- Modify: `scripts/test-aia-portal-source.mjs` — source contracts for deletion and portal OA discovery.

### Task 1: Define the failing services-removal contract

**Files:**
- Modify: `scripts/test-aia-portal-source.mjs`

- [ ] **Step 1: Write the failing test**

Append this block before `console.log`:

```js
const servicesPage = readSource("src/app/services/page.tsx")
const aiaNavbar = readSource("src/components/layout/aia-navbar.tsx")
const aiaFooter = readSource("src/components/layout/aia-footer.tsx")
const sitemap = readSource("src/app/sitemap.tsx")

assert.match(servicesPage, /import\s*\{\s*notFound\s*\}\s*from\s*["']next\/navigation["']/)
assert.match(servicesPage, /notFound\(\)/)
assert.doesNotMatch(aiaNavbar, /href:\s*["']\/services["']/)
assert.doesNotMatch(aiaFooter, /href:\s*["']\/services["']/)
assert.doesNotMatch(sitemap, /pathname:\s*["']\/services["']/)
assert.match(portalClient, /href:\s*["']\/services\/oa["']/)
assert.match(portalClient, /title:\s*["']OA 与审批["']/)
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node scripts/test-aia-portal-source.mjs`

Expected: failure because `/services` still renders a directory, navigation and sitemap still expose it, and the portal lacks the OA module.

### Task 2: Remove public services discovery and add the OA portal option

**Files:**
- Modify: `src/app/services/page.tsx`
- Modify: `src/components/layout/aia-navbar.tsx`
- Modify: `src/components/layout/aia-footer.tsx`
- Modify: `src/app/sitemap.tsx`
- Modify: `src/components/portal/portal-client.tsx`

- [ ] **Step 1: Make `/services` return the existing application 404**

Replace `src/app/services/page.tsx` with:

```tsx
import { notFound } from "next/navigation"

export default function ServicesPage() {
  notFound()
}
```

- [ ] **Step 2: Remove the primary-nav entry**

Delete `{ name: "服务", href: "/services" },` from the AIA navigation items in `src/components/layout/aia-navbar.tsx`.

- [ ] **Step 3: Remove the footer entry**

Delete `{ name: "服务中心", href: "/services" },` from `platformLinks` in `src/components/layout/aia-footer.tsx`.

- [ ] **Step 4: Remove the sitemap entry**

Delete `{ pathname: "/services", changeFrequency: "weekly", priority: 0.8 },` from the public route list in `src/app/sitemap.tsx`.

- [ ] **Step 5: Add OA to the shared portal list**

Add this entry to `commonModules` after the notifications entry in `src/components/portal/portal-client.tsx`:

```ts
{
  href: "/services/oa",
  title: "OA 与审批",
  description: "办理研究院表单、材料提交与审批事项。",
},
```

- [ ] **Step 6: Run the focused contract test to verify it passes**

Run: `node scripts/test-aia-portal-source.mjs`

Expected: `AIA portal source checks passed.`

### Task 3: Verify user-visible routing and static checks

**Files:**
- Verify only: all files above.

- [ ] **Step 1: Run the focused source contract**

Run: `node scripts/test-aia-portal-source.mjs`

Expected: `AIA portal source checks passed.`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: process exits with code `0` and reports no ESLint warnings or errors.

- [ ] **Step 3: Verify the local route status codes**

Run:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/services
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/portal
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/portal/list
```

Expected: `/services` returns `404`, `/portal` redirects to `/portal/list`, and `/portal/list` returns `200`.
