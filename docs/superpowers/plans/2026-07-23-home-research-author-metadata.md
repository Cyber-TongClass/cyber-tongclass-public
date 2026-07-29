# Home Research Author Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render homepage research authors as decoded display names, never the URL-encoded `tc-author` storage metadata.

**Architecture:** The repository already exposes `formatPublicationAuthorsForText` from `src/lib/publication-authors.ts`; it decodes author metadata and preserves the existing plain-text markers for co-first and corresponding authors. The homepage AIA research component will call this shared formatter rather than joining the raw database strings. A focused Node source test will lock the component to that shared formatter.

**Tech Stack:** Next.js, React, TypeScript, Node.js built-in `node:test`, ESLint.

---

## File structure

`src/components/institute/home-live-research.tsx` owns the homepage research-results presentation and will import and use the shared text formatter. `scripts/test-aia-home-research-author-metadata.mjs` will provide a regression guard without adding dependencies or changing package scripts.

### Task 1: Cover the homepage author-rendering contract

**Files:**
- Create: `scripts/test-aia-home-research-author-metadata.mjs`
- Test: `scripts/test-aia-home-research-author-metadata.mjs`

- [ ] **Step 1: Write the failing source-level regression test**

```js
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/components/institute/home-live-research.tsx", "utf8")

test("homepage research authors are rendered through the shared metadata decoder", () => {
  assert.match(source, /import\s*\{\s*formatPublicationAuthorsForText\s*\}\s*from\s*["']@\/lib\/publication-authors["']/)
  assert.match(source, /\{formatPublicationAuthorsForText\(item\.authors\)\}/)
  assert.doesNotMatch(source, /\{item\.authors\.join\(["']、["']\)\}/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-aia-home-research-author-metadata.mjs`

Expected: FAIL because `HomeLiveResearch` directly renders `item.authors.join("、")` and does not import the shared formatter.

- [ ] **Step 3: Commit the failing test**

```bash
git add scripts/test-aia-home-research-author-metadata.mjs
git commit -m "test: cover homepage author metadata rendering"
```

### Task 2: Decode author metadata before homepage rendering

**Files:**
- Modify: `src/components/institute/home-live-research.tsx:3-4,50`
- Test: `scripts/test-aia-home-research-author-metadata.mjs`

- [ ] **Step 1: Import the shared formatter**

Add this import below the existing AIA section-heading import:

```ts
import { formatPublicationAuthorsForText } from "@/lib/publication-authors"
```

- [ ] **Step 2: Replace raw author joining with the formatter**

Replace this expression:

```tsx
{item.authors.join("、")}
```

with:

```tsx
{formatPublicationAuthorsForText(item.authors)}
```

The venue separator remains unchanged:

```tsx
{item.venue ? ` · ${item.venue}` : ""}
```

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `node --test scripts/test-aia-home-research-author-metadata.mjs`

Expected: PASS with one passing subtest.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no warnings.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/components/institute/home-live-research.tsx scripts/test-aia-home-research-author-metadata.mjs
git commit -m "fix: decode homepage research author metadata"
```
