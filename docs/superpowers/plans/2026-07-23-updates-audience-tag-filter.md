# Updates Audience Tag Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified `/updates` page backed by the existing news and events collections, with editable audience and custom tags plus multi-select filters.

**Architecture:** Add optional `audiences` and `tags` arrays to both existing Convex documents and mutation arguments. Keep shared normalization, merge, and filter behavior in a dependency-free frontend utility with Node tests; use it from the new page and a reusable admin tag editor. A manually invoked, idempotent Convex migration fills the three-audience default only where `audiences` is absent or empty.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Convex, Node built-in test runner, TypeScript transpilation for test loading.

---

## File structure

- Create: `src/lib/updates.ts` — audience constants, tag normalization, unified item construction and filter predicates.
- Create: `src/components/content-tags-editor.tsx` — reusable admin UI for audience checkboxes and free-form tag chips.
- Create: `src/app/updates/page.tsx` — unified public updates feed and client-side filters.
- Create: `convex/updateMigrations.ts` — manually invoked, idempotent batch migration.
- Create: `scripts/migrate-default-update-audiences.mjs` — explicit operator command wrapper; never called by npm lifecycle scripts.
- Create: `scripts/test-updates.mjs` — Node tests for the utility behavior.
- Modify: `convex/schema.ts`, `convex/news.ts`, `convex/events.ts` — declare and persist the new fields.
- Modify: `src/types/index.ts`, `src/app/admin/news/[id]/page.tsx`, `src/app/admin/events/[id]/page.tsx` — expose types and edit controls.
- Modify: `src/components/layout/navbar.tsx`, `src/app/sitemap.tsx` — make `/updates` discoverable.

### Task 1: Define and test shared update filtering

**Files:**
- Create: `scripts/test-updates.mjs`
- Create: `src/lib/updates.ts`

- [ ] **Step 1: Write a failing Node test for tag normalization and update filters.**

```js
test("filters a merged feed by any selected audience and category", () => {
  const items = [
    { id: "news-1", audiences: ["undergraduate"], tags: ["讲座"] },
    { id: "event-1", audiences: ["graduate", "teacher"], tags: ["会议"] },
  ]

  assert.deepEqual(
    filterUpdates(items, { audiences: ["undergraduate", "teacher"], tags: ["会议"] }).map((item) => item.id),
    ["event-1"],
  )
})
```

Also cover trimmed/deduplicated custom tags, no selected audience, no selected custom tag, legacy entries with absent `audiences` and empty `tags`, and reverse chronological merged news/event ordering.

- [ ] **Step 2: Run the test to verify it fails because the utility does not yet exist.**

Run: `node --test scripts/test-updates.mjs`

Expected: failure resolving `src/lib/updates.ts` or missing exports.

- [ ] **Step 3: Implement the minimal dependency-free utility.**

```ts
export const AUDIENCE_OPTIONS = [
  { value: "undergraduate", label: "本科生" },
  { value: "graduate", label: "研究生" },
  { value: "teacher", label: "老师" },
] as const

export function normalizeTags(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function matchesUpdateFilters(item, filters) {
  const audienceMatches = !filters.audiences.length || item.audiences.some((value) => filters.audiences.includes(value))
  const tagMatches = !filters.tags.length || item.tags.some((value) => filters.tags.includes(value))
  return audienceMatches && tagMatches
}
```

Define exported `Audience`, `UpdateFeedItem`, `mergeUpdates`, `filterUpdates`, and `getAvailableTags` types/functions around this behavior. Treat missing arrays as `[]`; sort by descending timestamp with a stable id fallback.

- [ ] **Step 4: Run the focused test to verify it passes.**

Run: `node --test scripts/test-updates.mjs`

Expected: all update utility subtests pass.

- [ ] **Step 5: Commit the utility and tests.**

```bash
git add src/lib/updates.ts scripts/test-updates.mjs
git commit -m "feat: add updates filter utilities"
```

### Task 2: Persist audience and custom tags in the shared database

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/news.ts`
- Modify: `convex/events.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Extend the failing utility test with a typed legacy document case.**

```js
test("keeps a legacy record visible without fabricating tags", () => {
  const [item] = mergeUpdates([{ _id: "legacy-news", title: "旧新闻", publishedAt: 1, category: "通知", content: "", isPublished: true }], [])
  assert.deepEqual({ id: item.id, audiences: item.audiences, tags: item.tags }, {
    id: "legacy-news",
    audiences: [],
    tags: [],
  })
})
```

The expected outcome is an empty field-safe unified item.

- [ ] **Step 2: Run the test to verify it fails until the utility supports optional fields.**

Run: `node --test scripts/test-updates.mjs`

Expected: failure from an undefined optional array access or mismatched expected item.

- [ ] **Step 3: Add optional fields and mutation persistence.**

In `convex/schema.ts`, add the same optional arrays to both `news` and `events`:

```ts
audiences: v.optional(v.array(v.union(
  v.literal("undergraduate"),
  v.literal("graduate"),
  v.literal("teacher"),
))),
tags: v.optional(v.array(v.string())),
```

In each create/update mutation, accept optional `audiences` and `tags`, normalize tags by trimming, removing blank values and deduplicating, and write fields only when they are passed. Add `audiences?: Audience[]` and `tags?: string[]` to the `News` and `Event` interfaces. Preserve all existing fields and query behavior.

- [ ] **Step 4: Run the focused test and Convex code generation.**

Run: `node --test scripts/test-updates.mjs && npx convex codegen`

Expected: utility tests pass and generated API/data model types update without errors. Do not use `--prod`.

- [ ] **Step 5: Commit the schema and mutation work.**

```bash
git add convex/schema.ts convex/news.ts convex/events.ts convex/_generated src/types/index.ts
git commit -m "feat: persist news and event tags"
```

### Task 3: Provide an idempotent manual migration

**Files:**
- Create: `convex/updateMigrations.ts`
- Create: `scripts/migrate-default-update-audiences.mjs`
- Modify: `scripts/test-updates.mjs`

- [ ] **Step 1: Add a failing source-level test for migration guard conditions.**

```js
const migrationSource = readFileSync("convex/updateMigrations.ts", "utf8")
assert.match(migrationSource, /if \(!document\.audiences\?\.length\)/)
assert.match(migrationSource, /\["undergraduate", "graduate", "teacher"\]/)
assert.match(migrationSource, /tags/)
```

This locks in the required behavior: only records with no range are patched, and tags are never patched by the migration.

- [ ] **Step 2: Run the test to verify the migration module is absent.**

Run: `node --test scripts/test-updates.mjs`

Expected: failure opening `convex/updateMigrations.ts`.

- [ ] **Step 3: Add a bounded, repeatable Convex migration and a manual wrapper.**

`backfillDefaultAudiences` must collect no more than 100 documents per table invocation, patch only records lacking a non-empty `audiences` array, and return `{ newsUpdated, eventsUpdated, remaining }`. It must never change `tags`. `scripts/migrate-default-update-audiences.mjs` must call the function in a loop, print each batch result, and require an explicit `CONFIRM_UPDATE_AUDIENCE_MIGRATION=1` environment variable before performing the first call. Do not add it to `package.json`.

- [ ] **Step 4: Run focused tests and generate Convex types.**

Run: `node --test scripts/test-updates.mjs && npx convex codegen`

Expected: all tests pass and code generation succeeds against the configured non-production deployment.

- [ ] **Step 5: Commit the migration tooling.**

```bash
git add convex/updateMigrations.ts scripts/migrate-default-update-audiences.mjs scripts/test-updates.mjs convex/_generated
git commit -m "feat: add update audience migration"
```

### Task 4: Make tags editable in both admin forms

**Files:**
- Create: `src/components/content-tags-editor.tsx`
- Modify: `src/app/admin/news/[id]/page.tsx`
- Modify: `src/app/admin/events/[id]/page.tsx`
- Modify: `scripts/test-updates.mjs`

- [ ] **Step 1: Add source assertions describing the shared editor API.**

```js
for (const required of ["audiences", "tags", "本科生", "研究生", "老师", "添加分类"]) {
  assert.ok(readFileSync("src/components/content-tags-editor.tsx", "utf8").includes(required))
}
```

Also assert that both admin pages import and render `ContentTagsEditor` and send `audiences` and `tags` to their create/update mutations.

- [ ] **Step 2: Run the test to verify it fails before the component exists.**

Run: `node --test scripts/test-updates.mjs`

Expected: failure opening `src/components/content-tags-editor.tsx`.

- [ ] **Step 3: Implement a controlled, accessible editor and wire both forms.**

```tsx
<ContentTagsEditor
  audiences={formData.audiences}
  tags={formData.tags}
  onAudiencesChange={(audiences) => setFormData((value) => ({ ...value, audiences }))}
  onTagsChange={(tags) => setFormData((value) => ({ ...value, tags }))}
/>
```

The component must render semantic checkboxes labelled 本科生、研究生、老师; add a trimmed tag when Enter is pressed or “添加分类” is clicked; render each active tag with a remove button; ignore duplicate or blank input. Initialize both creation forms with all three audience values. On edit, read optional stored fields and use all three only when `audiences` is absent or empty, so legacy content remains all-visible when resaved.

- [ ] **Step 4: Run focused tests and ESLint.**

Run: `node --test scripts/test-updates.mjs && npm run lint`

Expected: all tests pass and ESLint reports zero warnings/errors.

- [ ] **Step 5: Commit the admin UI.**

```bash
git add src/components/content-tags-editor.tsx src/app/admin/news/[id]/page.tsx src/app/admin/events/[id]/page.tsx scripts/test-updates.mjs
git commit -m "feat: edit content audiences and tags"
```

### Task 5: Build and expose the unified updates page

**Files:**
- Create: `src/app/updates/page.tsx`
- Modify: `src/components/layout/navbar.tsx`
- Modify: `src/app/sitemap.tsx`
- Modify: `scripts/test-updates.mjs`

- [ ] **Step 1: Add a failing source-level page test.**

```js
const updatesSource = readFileSync("src/app/updates/page.tsx", "utf8")
for (const marker of ["useNews", "useEvents", "mergeUpdates", "filterUpdates", "全部", "本科生", "研究生", "老师"]) {
  assert.ok(updatesSource.includes(marker), `Expected updates page marker: ${marker}`)
}
```

Also verify the navbar points its 动态 item at `/updates` and the sitemap contains `${baseUrl}/updates`.

- [ ] **Step 2: Run the test to verify it fails because the page is missing.**

Run: `node --test scripts/test-updates.mjs`

Expected: failure opening `src/app/updates/page.tsx`.

- [ ] **Step 3: Implement the responsive feed and filters.**

Use `useNews()` and `useEvents()` from `@/lib/api`, merge only the returned published news with events through `mergeUpdates`, and maintain two `string[]` selections. Render an “全部” button that clears audience selection, the three audience toggle buttons, and a dynamically generated custom-tag chip group. Use `filterUpdates` for the combined AND/OR behavior. Each card shows 新闻 or 活动, date/time metadata, audience label chips, custom tag chips, and links to `/news/:id` or `/events/:id`; retain a loading state and no-results state. Keep the page client-side because it consumes Convex React hooks.

Update the existing navbar “动态” href to `/updates` and add the route to the sitemap while retaining `/news` and `/events` entries.

- [ ] **Step 4: Run focused tests, lint, and the production build.**

Run: `node --test scripts/test-updates.mjs && npm run lint && npm run build`

Expected: all tests pass, ESLint has zero warnings/errors, and the build exits 0. The build may run Convex code generation but must not use `--prod`.

- [ ] **Step 5: Manually verify the UI and migration safeguards.**

Run the local Convex and Next.js development commands in separate terminals, then verify: create/edit a news item with two audiences and two tags; create/edit an event with one audience and one tag; verify `/updates` OR behavior within each filter group and AND behavior across groups; run the migration only with `CONFIRM_UPDATE_AUDIENCE_MIGRATION=1` and confirm a second invocation reports zero updates. Do not execute the migration against production without explicit user authorization.

- [ ] **Step 6: Commit the public route and final verification updates.**

```bash
git add src/app/updates/page.tsx src/components/layout/navbar.tsx src/app/sitemap.tsx scripts/test-updates.mjs
git commit -m "feat: add unified updates feed"
```
