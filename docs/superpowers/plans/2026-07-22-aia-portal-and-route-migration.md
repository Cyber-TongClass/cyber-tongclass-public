# AIA Portal and Tong Class Route Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AIA the public root experience, move the undergraduate Tong Class site intact under `/tong-class`, and preserve legacy paths with single-hop redirects.

**Architecture:** A path-aware public shell selects AIA or Tong Class navigation/footer without touching the independent Admin, Reviewer, or TechDay products. The portal consumes safe public hooks only, while the legacy migration uses App Router moves plus explicit `next.config.js` redirects and canonical metadata.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, `next/image`, Lucide, Node `node:test`.

---

## Locked files and boundaries

| Path | Responsibility |
| --- | --- |
| `public/brand/aia/*` | User-provided logo assets copied into the repository; no runtime dependency on a temporary clipboard path. |
| `src/components/layout/aia-*.tsx` | AIA public branding/navigation/footer. |
| `src/components/layout/tong-class-*.tsx` | Undergraduate subsite branding/navigation/footer. |
| `src/components/layout/app-shell.tsx` | Path-context selection; Admin, Reviewer, and TechDay must remain unwrapped. |
| `src/app/page.tsx` | AIA home only. |
| `src/app/tong-class/**` | Moved undergraduate pages and local metadata layout. |
| `next.config.js` | One-hop temporary redirects only; do not alter npm scripts. |
| `src/app/robots.ts`, `src/app/sitemap.ts`, `src/lib/site-url.ts` | Canonical public discovery, never permission enforcement. |

### Task 1: Add local AIA brand assets and test their contracts

**Files:**
- Create: `public/brand/aia/pku-iai-horizontal-lockup.png`
- Create: `public/brand/aia/aia-seal.png`
- Create: `scripts/test-aia-brand-assets.mjs`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Write the failing asset test.**

```js
// scripts/test-aia-brand-assets.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";

for (const asset of [
  "public/brand/aia/pku-iai-horizontal-lockup.png",
  "public/brand/aia/aia-seal.png",
]) {
  test(`${asset} is a non-empty local brand asset`, () => {
    assert.equal(existsSync(asset), true);
    assert.ok(statSync(asset).size > 1024);
  });
}
```

- [ ] **Step 2: Run the test and verify it fails before assets are present.**

Run: `node --test scripts/test-aia-brand-assets.mjs`

Expected: both subtests fail because the local assets do not exist.

- [ ] **Step 3: Copy and crop the approved asset without redrawing it.**

Copy `/var/folders/n_/5h9xlpc92hlbwtwk8yz7g45c0000gn/T/codex-clipboard-75370c4e-e502-4f46-bd34-03d974e65544.png` into `public/brand/aia/pku-iai-horizontal-lockup.png`. Use a local image tool to crop the second circular AIA seal from that source to `public/brand/aia/aia-seal.png`; preserve its red pixels and alpha channel. Do not use a generated replacement, a remote URL, or CSS recoloring.

Append the following variables in the existing root color block of `src/styles/globals.css`:

```css
--aia-red: 0 100% 30%;
--aia-warm: 40 33% 97%;
--aia-ink: 218 35% 16%;
```

- [ ] **Step 4: Run the asset test.**

Run: `node --test scripts/test-aia-brand-assets.mjs`

Expected: both assets pass existence and non-empty assertions.

- [ ] **Step 5: Commit only the brand foundation.**

```bash
git add public/brand/aia scripts/test-aia-brand-assets.mjs src/styles/globals.css
git commit -m "feat(brand): add approved AIA identity assets"
```

### Task 2: Build contextual AIA and Tong Class shells

**Files:**
- Create: `src/components/layout/aia-navbar.tsx`
- Create: `src/components/layout/aia-footer.tsx`
- Create: `src/components/layout/tong-class-navbar.tsx`
- Create: `src/components/layout/tong-class-footer.tsx`
- Create: `src/lib/tong-class-routes.ts`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write a failing pure route-context test.**

```js
// scripts/test-aia-route-migration.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { getPublicShellKind } from "../src/lib/tong-class-routes.ts";

test("chooses independent product shells before public shells", () => {
  assert.equal(getPublicShellKind("/admin/users"), "none");
  assert.equal(getPublicShellKind("/reviewer/login"), "none");
  assert.equal(getPublicShellKind("/techday/awards"), "none");
  assert.equal(getPublicShellKind("/tong-class/news"), "tong-class");
  assert.equal(getPublicShellKind("/people"), "aia");
});
```

- [ ] **Step 2: Run the test and verify it fails before route helpers exist.**

Run: `node --test scripts/test-aia-route-migration.mjs`

Expected: missing `tong-class-routes.ts` module.

- [ ] **Step 3: Implement canonical route helpers and contextual shell selection.**

```ts
// src/lib/tong-class-routes.ts
export type PublicShellKind = "aia" | "tong-class" | "none";
export function getPublicShellKind(pathname: string): PublicShellKind {
  if (/^\/(admin|reviewer|techday)(?:\/|$)/.test(pathname)) return "none";
  return pathname === "/tong-class" || pathname.startsWith("/tong-class/") ? "tong-class" : "aia";
}
export const tongClassPath = (path = "") => `/tong-class${path.startsWith("/") ? path : `/${path}`}`.replace(/\/$/, "") || "/tong-class";
```

`AiaNavbar` must include `/institute`, `/people`, `/groups`, `/research`, `/updates`, `/services`, `/contact`, and `/tong-class`; use the local seal asset and accessible “AIA” text. `TongClassNavbar` must route all moved undergraduate links through `tongClassPath`. `AppShell` must use the pathname helper and render no public navbar/footer for `/admin`, `/reviewer`, and `/techday`.

- [ ] **Step 4: Run the shell-selection test and lint.**

Run: `node --test scripts/test-aia-route-migration.mjs && npm run lint`

Expected: route test passes and lint exits zero.

- [ ] **Step 5: Commit the contextual shells.**

```bash
git add src/components/layout/aia-navbar.tsx src/components/layout/aia-footer.tsx \
  src/components/layout/tong-class-navbar.tsx src/components/layout/tong-class-footer.tsx \
  src/components/layout/app-shell.tsx src/app/layout.tsx src/lib/tong-class-routes.ts \
  scripts/test-aia-route-migration.mjs
git commit -m "feat(layout): add AIA and Tong Class contextual shells"
```

### Task 3: Replace the root with the AIA academic gateway

**Files:**
- Create: `src/components/institute/aia-home.tsx`
- Create: `src/components/institute/aia-hero.tsx`
- Create: `src/components/institute/service-directory.tsx`
- Create: `src/components/institute/reservation-placeholder-card.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/institute/page.tsx`
- Create: `src/app/research/page.tsx`
- Create: `src/app/updates/page.tsx`
- Create: `src/app/services/page.tsx`
- Create: `src/app/contact/page.tsx`

- [ ] **Step 1: Write the failing source-level accessibility/brand test.**

```js
// scripts/test-aia-portal-source.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("AIA home has its agreed identity and a single primary heading", () => {
  const source = readFileSync("src/components/institute/aia-hero.tsx", "utf8");
  assert.match(source, /北京大学人工智能研究院综合服务系统/);
  assert.match(source, /Artificial Intelligence Agora/);
  assert.match(source, /The Integrated Services Platform of PKU IAI/);
  assert.equal((source.match(/<h1/g) ?? []).length, 1);
});
```

- [ ] **Step 2: Run the test and verify its initial missing-file failure.**

Run: `node --test scripts/test-aia-portal-source.mjs`

Expected: `ENOENT` for `aia-hero.tsx`.

- [ ] **Step 3: Implement the static, accessible gateway.**

```tsx
// src/components/institute/aia-hero.tsx
import Image from "next/image";
import Link from "next/link";

export function AiaHero() {
  return <section className="bg-[hsl(var(--aia-warm))]">
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-12 lg:py-24">
      <div className="lg:col-span-7">
        <Image src="/brand/aia/pku-iai-horizontal-lockup.png" alt="北京大学人工智能研究院" width={1754} height={328} priority />
        <p className="mt-8 text-sm font-semibold tracking-[0.18em] text-[hsl(var(--primary))]">AIA · ARTIFICIAL INTELLIGENCE AGORA</p>
        <h1 className="mt-3 text-4xl font-semibold text-[hsl(var(--aia-ink))] sm:text-5xl">北京大学人工智能研究院综合服务系统</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">The Integrated Services Platform of PKU IAI</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="btn-primary" href="/institute">探索研究院</Link><Link className="btn-secondary" href="/tong-class">进入通班</Link></div>
      </div>
    </div>
  </section>;
}
```

`ReservationPlaceholderCard` must contain a disabled `<button disabled aria-describedby="west-building-status">` and the visible text “西楼预约 · 筹备中”; it must not import a mutation, form, or reservation URL. `ServiceDirectory` must link Coffee Talk to `/services/coffee-talk`, not a non-existent booking route. `AiaHome` composes exactly one hero, service directory, directory preview links, and a static focus update; do not retain the old automatic carousel.

- [ ] **Step 4: Run the portal source test and lint.**

Run: `node --test scripts/test-aia-portal-source.mjs && npm run lint`

Expected: the source contract passes and lint exits zero.

- [ ] **Step 5: Commit the new root and public placeholder pages.**

```bash
git add src/app/page.tsx src/app/institute src/app/research src/app/updates src/app/services src/app/contact \
  src/components/institute/aia-home.tsx src/components/institute/aia-hero.tsx \
  src/components/institute/service-directory.tsx src/components/institute/reservation-placeholder-card.tsx \
  scripts/test-aia-portal-source.mjs
git commit -m "feat(portal): add AIA academic gateway and services"
```

### Task 4: Move Tong Class beneath `/tong-class` without duplicate page implementations

**Files:**
- Create: `src/app/tong-class/layout.tsx`
- Move: `src/app/about/**` → `src/app/tong-class/about/**`
- Move: `src/app/members/**` → `src/app/tong-class/members/**`
- Move: `src/app/news/**` → `src/app/tong-class/news/**`
- Move: `src/app/publications/**` → `src/app/tong-class/publications/**`
- Move: `src/app/resources/**` → `src/app/tong-class/resources/**`
- Move: `src/app/courses/**` → `src/app/tong-class/courses/**`
- Move: `src/app/events/**` → `src/app/tong-class/events/**`
- Move: `src/app/intranet/**` → `src/app/tong-class/intranet/**`
- Modify: `src/app/search/page.tsx`
- Modify: `src/components/publications/publication-authors-list.tsx`
- Modify: `src/components/courses/course-directory-page.tsx`
- Modify: `src/lib/intranet-modules.ts`

- [ ] **Step 1: Write the failing canonical-link regression test.**

```js
// append to scripts/test-aia-route-migration.mjs
import { tongClassPath } from "../src/lib/tong-class-routes.ts";
test("canonical undergraduate links are rooted once under tong-class", () => {
  assert.equal(tongClassPath("/members/alice"), "/tong-class/members/alice");
  assert.equal(tongClassPath("news"), "/tong-class/news");
});
```

- [ ] **Step 2: Run the route test before moving pages.**

Run: `node --test scripts/test-aia-route-migration.mjs`

Expected: the helper tests pass; the next step will make moved routes accessible.

- [ ] **Step 3: Move route trees and update every internal link.**

Use `git mv` for each listed App Router subtree. Create `src/app/tong-class/page.tsx` from the former Tong Class home implementation and retain only AIA in `src/app/page.tsx`. Consolidate course detail to `src/app/tong-class/courses/[name]/page.tsx`; remove duplicate old course detail routes instead of proxying them. Update only UI links and `Link` values to use `tongClassPath`; do not rewrite `/api/intranet/...` service URLs.

`src/app/tong-class/layout.tsx` must export a title template and description for Tong Class, but it must not set all child canonical URLs to `/tong-class`.

- [ ] **Step 4: Verify no old public page tree remains.**

Run: `find src/app -path '*/page.tsx' | rg '/(about|members|news|publications|resources|courses|events|intranet)/'`

Expected: each listed public page path begins with `src/app/tong-class/`, except purposeful non-page API paths.

- [ ] **Step 5: Run lint and commit the route relocation.**

Run: `npm run lint`

Expected: lint exits zero.

```bash
git add -A src/app src/components/publications/publication-authors-list.tsx \
  src/components/courses/course-directory-page.tsx src/lib/intranet-modules.ts src/app/search/page.tsx
git commit -m "refactor(tong-class): move undergraduate site under tong-class"
```

### Task 5: Add one-hop compatibility redirects and canonical discovery metadata

**Files:**
- Modify: `next.config.js`
- Create: `src/lib/site-url.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/robots.ts`
- Modify: `src/app/sitemap.ts`
- Create: `scripts/test-aia-metadata-source.mjs`

- [ ] **Step 1: Write a failing source contract test.**

```js
// scripts/test-aia-metadata-source.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("discovery excludes private products and legacy canonical URLs", () => {
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  const robots = readFileSync("src/app/robots.ts", "utf8");
  assert.match(sitemap, /"\/tong-class"/);
  assert.doesNotMatch(sitemap, /"\/admin"/);
  assert.match(robots, /"\/reviewer"/);
});
```

- [ ] **Step 2: Run the test before changing discovery metadata.**

Run: `node --test scripts/test-aia-metadata-source.mjs`

Expected: one or more assertions fail against the former Tong Class-only metadata.

- [ ] **Step 3: Implement exact temporary redirects and metadata.**

Add this ordered section to `redirects()` in `next.config.js` with `permanent: false`:

```js
{ source: "/resources/courses/:path*", destination: "/tong-class/courses/:path*", permanent: false },
{ source: "/about/:path*", destination: "/tong-class/about/:path*", permanent: false },
{ source: "/members/:path*", destination: "/tong-class/members/:path*", permanent: false },
{ source: "/users", destination: "/tong-class/members", permanent: false },
{ source: "/users/:path*", destination: "/tong-class/members/:path*", permanent: false },
{ source: "/news/:path*", destination: "/tong-class/news/:path*", permanent: false },
{ source: "/publications/:path*", destination: "/tong-class/publications/:path*", permanent: false },
{ source: "/resources/:path*", destination: "/tong-class/resources/:path*", permanent: false },
{ source: "/courses/:path*", destination: "/tong-class/courses/:path*", permanent: false },
{ source: "/events/:path*", destination: "/tong-class/events/:path*", permanent: false },
{ source: "/intranet/:path*", destination: "/tong-class/intranet/:path*", permanent: false },
```

Create `src/lib/site-url.ts`:

```ts
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://tongclass.ac.cn");
export const absoluteSiteUrl = (pathname: string) => new URL(pathname, siteUrl).toString();
```

Root metadata must name AIA and use the local seal icon. Sitemap must contain only the agreed public AIA/Tong Class static paths and must not include `/admin`, `/reviewer`, `/account`, `/login`, `/search`, `/tong-class/intranet`, `/tong-class/courses`, or `/tong-class/events`. Robots must explicitly disallow those private/non-discovery paths; it does not substitute for authorization.

- [ ] **Step 4: Run source tests and actual redirect smoke checks.**

Run:

```bash
node --test scripts/test-aia-brand-assets.mjs scripts/test-aia-route-migration.mjs scripts/test-aia-metadata-source.mjs
npm run dev -- -p 3000
```

Expected: all script tests pass; the dev server reports a running URL. In a second terminal run:

```bash
curl -sSI 'http://localhost:3000/about?next=%2Fintranet%2Fforms&filter=latest'
curl -sSI 'http://localhost:3000/resources/courses/AI%20Intro?q=test'
curl -sSI 'http://localhost:3000/intranet/forms/example?action=resume'
```

Each response must be a single `307` with a `/tong-class/...` `Location` that preserves its query string. `/admin`, `/reviewer`, and `/techday` must not redirect to `/tong-class`.

- [ ] **Step 5: Commit temporary migration routing and discovery.**

```bash
git add next.config.js src/lib/site-url.ts src/app/layout.tsx src/app/robots.ts src/app/sitemap.ts \
  scripts/test-aia-metadata-source.mjs
git commit -m "feat(seo): add AIA canonical metadata and legacy redirects"
```

## Final verification matrix

- [ ] Run `node --test scripts/test-aia-brand-assets.mjs scripts/test-aia-route-migration.mjs scripts/test-aia-portal-source.mjs scripts/test-aia-metadata-source.mjs`; expect all tests passing.
- [ ] At 1440×900, 768×1024, and 390×844, verify one H1 on AIA home, keyboard-accessible navigation/menu, local logo alt text, no automatic carousel, and the disabled West Building card.
- [ ] Verify AIA root, `/tong-class`, Admin, Reviewer, and TechDay each receive only their intended shell.
- [ ] Do not convert redirects from temporary 307 to permanent 308 until external-link and login-return behavior has been observed in the development deployment.
