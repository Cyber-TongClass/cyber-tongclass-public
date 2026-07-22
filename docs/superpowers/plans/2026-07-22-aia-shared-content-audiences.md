# AIA Shared Content Audiences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `/research` and `/updates` from the real Tong Class publication and news records and add deduplicated All/Undergrad/Grad filtering based on linked author account identity.

**Architecture:** Convex remains the authoritative privacy boundary: it aggregates the existing records, resolves linked author users, and returns safe DTOs with only a content ID and normalized audience tags added. Shared client components render the existing publication archive and news timeline in both the Tong Class and AIA routes; a small pure helper deduplicates IDs and computes tab counts.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex, Tailwind CSS, shadcn/ui, Node test runner.

---

## File Structure

- Create `convex/lib/contentAudience.ts`: pure parsing, linked-user fallback, and audience normalization helpers for server queries.
- Modify `convex/instituteContent.ts`: read all public/shared real records, resolve linked users and structured authorships, and emit safe audience-tagged DTOs.
- Modify `src/types/institute.ts`: define public audience and DTO ID/audience fields.
- Create `src/lib/content-audience.ts`: deduplicate public items and compute audience collections/counts.
- Create `src/components/content/audience-tabs.tsx`: accessible All/Undergrad/Grad tab control.
- Create `src/components/content/publication-archive.tsx`: shared publication search/filter/group/list presentation.
- Create `src/components/content/news-timeline.tsx`: shared news search/filter/group/timeline presentation.
- Modify `src/app/research/page.tsx`: use the public projection and shared publication archive with audience tabs.
- Modify `src/app/updates/page.tsx`: use the public projection and shared news timeline with audience tabs.
- Modify `src/app/tong-class/publications/page.tsx`: delegate presentation to the shared publication archive.
- Modify `src/app/tong-class/news/page.tsx`: delegate presentation to the shared news timeline.
- Create `scripts/test-aia-content-audiences.mjs`: source and pure-function regression tests for classification and unique counts.
- Modify `scripts/test-aia-live-content-pages.mjs`: update safe-hook and real-archive expectations.
- Modify `scripts/test-institute-content-relations.mjs`: update DTO allow-list and shared-record expectations.

### Task 1: Server Audience Classification

**Files:**
- Create: `convex/lib/contentAudience.ts`
- Create: `scripts/test-aia-content-audiences.mjs`

- [ ] **Step 1: Write failing classification tests**

Test explicit metadata, malformed metadata, duplicate user IDs, structured person account IDs, owner fallback, mixed audiences, and teacher-only content. The core assertions must include:

```js
assert.deepEqual(
  audience.collectPublicationUserIds({
    authors: [encodedUndergrad, encodedGraduate, encodedUndergrad],
    structuredAccountUserIds: ["users:grad"],
    ownerUserId: "users:owner",
  }),
  ["users:undergrad", "users:graduate", "users:grad"],
)
assert.deepEqual(
  audience.collectPublicationUserIds({
    authors: ["Legacy Author"],
    structuredAccountUserIds: [],
    ownerUserId: "users:owner",
  }),
  ["users:owner"],
)
assert.deepEqual(
  audience.toPublicAudiences(["undergrad", "graduate", "undergrad", "teacher"]),
  ["undergrad", "graduate"],
)
```

- [ ] **Step 2: Run the new test and verify failure**

Run: `node --test scripts/test-aia-content-audiences.mjs`

Expected: FAIL because `convex/lib/contentAudience.ts` does not exist.

- [ ] **Step 3: Implement pure server helpers**

Implement a defensive decoder that recognizes only structured `[tc-author:<encoded JSON>]` metadata with a non-empty `userId`, combines those IDs with structured person-account IDs, preserves first-seen ordering, and uses the owner only if the combined explicit set is empty. Normalize resolved identity values with:

```ts
export type PublicContentAudience = "undergrad" | "graduate"

export function toPublicAudiences(values: readonly string[]): PublicContentAudience[] {
  const result = new Set<PublicContentAudience>()
  for (const value of values) {
    if (value === "undergrad" || value === "graduate") result.add(value)
  }
  return ["undergrad", "graduate"].filter((value) => result.has(value as PublicContentAudience)) as PublicContentAudience[]
}
```

- [ ] **Step 4: Run the focused test**

Run: `node --test scripts/test-aia-content-audiences.mjs`

Expected: all classification cases PASS.

- [ ] **Step 5: Commit the isolated helper**

```bash
git add convex/lib/contentAudience.ts scripts/test-aia-content-audiences.mjs
git commit -m "feat(content): classify audiences from linked authors"
```

### Task 2: Safe Shared Convex Projection

**Files:**
- Modify: `convex/instituteContent.ts`
- Modify: `src/types/institute.ts`
- Modify: `scripts/test-aia-content-audiences.mjs`
- Modify: `scripts/test-institute-content-relations.mjs`

- [ ] **Step 1: Extend failing DTO/query tests**

Assert that public research and update DTOs contain `id` and normalized `audiences`, never contain `userId`, `authorId`, account bindings, or roles, and that query source includes legacy/unscoped shared records while excluding hidden publications and unpublished news.

```js
assert.deepEqual(research.audiences, ["undergrad", "graduate"])
assert.equal(research.id, "publications:1")
assertFieldsAreAbsent(research, ["userId", "authorId", "accountUserId", "role"])
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test scripts/test-aia-content-audiences.mjs scripts/test-institute-content-relations.mjs`

Expected: FAIL because the DTO and query do not yet expose the safe fields or shared records.

- [ ] **Step 3: Extend public DTO contracts**

Add the shared type and required fields:

```ts
export type PublicContentAudience = "undergrad" | "graduate"

export type PublicInstituteResearch = {
  id: string
  audiences: PublicContentAudience[]
  // existing public publication fields
}

export type PublicInstituteUpdate = {
  id: string
  audiences: PublicContentAudience[]
  // existing public news fields
}
```

- [ ] **Step 4: Aggregate real publication and news records**

For publications, query the table in descending order and keep records whose `visibility !== "hidden"`. For news, keep `isPublished === true`. Preserve existing person/group filters. For each publication, load `publicationAuthorships`, then its `institutePeople` records, collect `accountUserId` values even when the public profile itself is hidden, merge explicit encoded author users, apply owner fallback only when no explicit linked user exists, resolve each user with `resolveUserIdentityType`, and call `toPublicAudiences`. For news, resolve `authorId` the same way. Pass `{ id: String(record._id), audiences }` into the DTO constructor without exposing author IDs.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
node --test scripts/test-aia-content-audiences.mjs scripts/test-institute-content-relations.mjs
npx tsc --noEmit
```

Expected: tests PASS and TypeScript reports no errors.

- [ ] **Step 6: Commit the projection**

```bash
git add convex/instituteContent.ts src/types/institute.ts scripts/test-aia-content-audiences.mjs scripts/test-institute-content-relations.mjs
git commit -m "feat(content): expose safe shared archive audiences"
```

### Task 3: Client Deduplication and Audience Tabs

**Files:**
- Create: `src/lib/content-audience.ts`
- Create: `src/components/content/audience-tabs.tsx`
- Modify: `scripts/test-aia-content-audiences.mjs`

- [ ] **Step 1: Add failing unique-count tests**

Test duplicate rows and mixed audiences:

```js
const items = [
  { id: "p1", audiences: ["undergrad", "graduate"] },
  { id: "p1", audiences: ["undergrad", "graduate"] },
  { id: "p2", audiences: ["graduate"] },
  { id: "p3", audiences: [] },
]
assert.deepEqual(content.buildAudienceCollections(items).counts, {
  all: 3,
  undergrad: 1,
  graduate: 2,
})
```

- [ ] **Step 2: Run and verify the client-helper test fails**

Run: `node --test scripts/test-aia-content-audiences.mjs`

Expected: FAIL because the client helper and tabs do not exist.

- [ ] **Step 3: Implement the pure deduplication helper**

Export `ContentAudienceFilter = "all" | PublicContentAudience` and `buildAudienceCollections<T extends { id: string; audiences: PublicContentAudience[] }>()`. Deduplicate through `Map<string, T>`, then return `all`, `undergrad`, `graduate`, and unique counts.

- [ ] **Step 4: Implement accessible tabs**

Render three buttons with `aria-pressed`, visible labels and counts, keyboard focus styles, and a typed `onChange`. The component receives `value`, `counts`, and `onChange`; it performs no data fetching.

- [ ] **Step 5: Run the focused test and lint the new files**

Run:

```bash
node --test scripts/test-aia-content-audiences.mjs
npx eslint -c .eslintrc.json --max-warnings=0 src/lib/content-audience.ts src/components/content/audience-tabs.tsx
```

Expected: PASS with no warnings.

- [ ] **Step 6: Commit client audience primitives**

```bash
git add src/lib/content-audience.ts src/components/content/audience-tabs.tsx scripts/test-aia-content-audiences.mjs
git commit -m "feat(content): add deduplicated audience tabs"
```

### Task 4: Shared Publication Archive and AIA Research

**Files:**
- Create: `src/components/content/publication-archive.tsx`
- Modify: `src/app/tong-class/publications/page.tsx`
- Modify: `src/app/research/page.tsx`
- Modify: `scripts/test-aia-live-content-pages.mjs`

- [ ] **Step 1: Update page source tests to fail**

Assert that the Tong Class and AIA pages both render `PublicationArchive`, that only the AIA page renders `AudienceTabs`, that `/research` requests `limit: 100`, and that components do not import Convex directly.

- [ ] **Step 2: Run and verify failure**

Run: `node --test scripts/test-aia-live-content-pages.mjs`

Expected: FAIL because the archive has not been extracted.

- [ ] **Step 3: Extract the publication archive**

Move the existing search, preprint/published selector, category selector, sort controls, clear action, count, year grouping, venue badges, author rendering, external link, loading state, and empty state into a controlled component:

```ts
type PublicationArchiveItem = {
  id: string
  title: string
  authors: string[]
  venue: string
  year: number
  abstract: string
  url?: string
  category: string
  subCategory?: string
}

type PublicationArchiveProps = {
  items: PublicationArchiveItem[] | undefined
  detailHref: (item: PublicationArchiveItem) => string
  audienceControl?: React.ReactNode
}
```

Keep item IDs as the React keys. Apply any AIA audience selection before passing `items`, so the archive composes audience filtering with its own controls.

- [ ] **Step 4: Delegate both publication pages to the shared component**

The Tong Class page maps `_id` to `id` and preserves its existing hero copy. The AIA page calls `usePublicInstituteResearch({ limit: 100 })`, builds deduplicated collections, holds the selected audience state, renders `AudienceTabs`, and passes the selected collection to `PublicationArchive`. Both detail functions return `/tong-class/publications/${item.id}`.

- [ ] **Step 5: Verify publications**

Run:

```bash
node --test scripts/test-aia-live-content-pages.mjs scripts/test-aia-content-audiences.mjs
npx tsc --noEmit
```

Expected: PASS with no type errors.

- [ ] **Step 6: Commit publication UI**

```bash
git add src/components/content/publication-archive.tsx src/app/tong-class/publications/page.tsx src/app/research/page.tsx scripts/test-aia-live-content-pages.mjs
git commit -m "feat(research): reuse the real publication archive"
```

### Task 5: Shared News Timeline and AIA Updates

**Files:**
- Create: `src/components/content/news-timeline.tsx`
- Modify: `src/app/tong-class/news/page.tsx`
- Modify: `src/app/updates/page.tsx`
- Modify: `scripts/test-aia-live-content-pages.mjs`

- [ ] **Step 1: Extend failing page source tests**

Assert that both news pages render `NewsTimeline`, that `/updates` alone renders `AudienceTabs`, requests `limit: 100`, and keeps safe external-link handling.

- [ ] **Step 2: Run and verify failure**

Run: `node --test scripts/test-aia-live-content-pages.mjs`

Expected: FAIL because the timeline has not been extracted.

- [ ] **Step 3: Extract the news timeline**

Move the existing search, category selection, clear action, count, loading state, empty state, year/month grouping, cover image, and link behavior into:

```ts
type NewsTimelineItem = {
  id: string
  title: string
  content: string
  sourceUrl?: string
  coverImageUrl?: string
  category: string
  publishedAt: number
}

type NewsTimelineProps = {
  items: NewsTimelineItem[] | undefined
  detailHref: (item: NewsTimelineItem) => string
  audienceControl?: React.ReactNode
}
```

Allow only `http://` and `https://` values to become external links; otherwise use `detailHref`.

- [ ] **Step 4: Delegate both news pages to the shared component**

The Tong Class page maps `_id` to `id` and preserves its existing hero copy. The AIA page calls `usePublicInstituteUpdates({ limit: 100 })`, deduplicates, renders `AudienceTabs`, and supplies the selected collection to `NewsTimeline`. Both local detail functions return `/tong-class/news/${item.id}`.

- [ ] **Step 5: Verify news UI and typecheck**

Run:

```bash
node --test scripts/test-aia-live-content-pages.mjs scripts/test-aia-content-audiences.mjs
npx tsc --noEmit
```

Expected: PASS with no type errors.

- [ ] **Step 6: Commit news UI**

```bash
git add src/components/content/news-timeline.tsx src/app/tong-class/news/page.tsx src/app/updates/page.tsx scripts/test-aia-live-content-pages.mjs
git commit -m "feat(updates): reuse the real news timeline"
```

### Task 6: Integration, Local Deployment, and Browser Verification

**Files:**
- Modify only files from Tasks 1–5 if verification finds defects.

- [ ] **Step 1: Run focused and complete test suites**

Run:

```bash
node --test scripts/test-aia-content-audiences.mjs scripts/test-aia-live-content-pages.mjs scripts/test-institute-content-relations.mjs
node --test scripts/test-*.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Run static quality gates**

Run:

```bash
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: no TypeScript errors, ESLint warnings, or whitespace errors.

- [ ] **Step 3: Deploy only to the authorized development deployment**

Inspect `.env.local` and run the existing one-shot Convex development deployment only when it identifies `dev:bold-sandpiper-236`. Never append `--prod`.

Run: `npx convex dev --once`

Expected: generated functions deploy successfully to `bold-sandpiper-236`.

- [ ] **Step 4: Build and inspect the running app**

Run `npm run build`. If the already-running development server has not picked up the changes, stop only the Next.js process, verify port 3000 is free, and restart with `npm run dev`; do not clear caches. Use the in-app browser to inspect `/research`, `/updates`, `/tong-class/publications`, and `/tong-class/news`.

Expected: real publication/news records render, tabs show unique counts, mixed publications occur in both audience lists but once in All, and the Tong Class pages retain their previous controls.

- [ ] **Step 5: Commit any verified integration fixes**

```bash
git add convex/lib/contentAudience.ts convex/instituteContent.ts src/types/institute.ts src/lib/content-audience.ts src/components/content/audience-tabs.tsx src/components/content/publication-archive.tsx src/components/content/news-timeline.tsx src/app/research/page.tsx src/app/updates/page.tsx src/app/tong-class/publications/page.tsx src/app/tong-class/news/page.tsx scripts/test-aia-content-audiences.mjs scripts/test-aia-live-content-pages.mjs scripts/test-institute-content-relations.mjs
git commit -m "fix(content): complete shared audience archive integration"
```

Do not stage unrelated pre-existing working-tree changes.
