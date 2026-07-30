# Tong Class Publications Old Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the complete `main`-branch Tong Class publication archive UI under `/tong-class/publications` without changing `/research` or the shared publication data.

**Architecture:** Add a Tong Class-specific client component that accepts the existing `PublicationArchiveItem` data contract and owns the legacy filters, sorting, year grouping, and blue card styling. The Tong Class page will use this component, while `/research` remains on the institute `PublicationArchive`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Node.js source-contract tests, ESLint.

---

### Task 1: Add the failing style-separation contract

**Files:**
- Create: `scripts/test-tong-class-publications-style-source.mjs`
- Inspect: `src/app/tong-class/publications/page.tsx`
- Inspect: `src/app/research/page.tsx`

- [ ] **Step 1: Write the failing source-contract test**

```js
import assert from "node:assert/strict"
import fs from "node:fs"

const tongPage = fs.readFileSync("src/app/tong-class/publications/page.tsx", "utf8")
const researchPage = fs.readFileSync("src/app/research/page.tsx", "utf8")
const tongArchivePath = "src/components/content/tong-class-publication-archive.tsx"

assert.match(tongPage, /TongClassPublicationArchive/)
assert.doesNotMatch(tongPage, /<PublicationArchive/)
assert.match(researchPage, /<PublicationArchive/)
assert.equal(fs.existsSync(tongArchivePath), true)

const tongArchive = fs.readFileSync(tongArchivePath, "utf8")
assert.match(tongArchive, /bg-primary/)
assert.match(tongArchive, /groupedByYear/)
assert.match(tongArchive, /publicationKind/)
assert.doesNotMatch(tongArchive, /--aia-red/)

console.log("Tong Class publication archive style contract passed")
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node scripts/test-tong-class-publications-style-source.mjs
```

Expected: FAIL because `TongClassPublicationArchive` and its source file do not exist and the Tong Class page still renders `PublicationArchive`.

- [ ] **Step 3: Commit the regression contract**

```bash
git add scripts/test-tong-class-publications-style-source.mjs
git commit -m "test: define Tong Class publication style contract"
```

### Task 2: Implement the Tong Class-specific archive

**Files:**
- Create: `src/components/content/tong-class-publication-archive.tsx`
- Reference: `src/app/publications/page.tsx` from `main`
- Reuse types from: `src/components/content/publication-archive.tsx`

- [ ] **Step 1: Create the dedicated component boundary**

Create a client component with this public interface:

```tsx
"use client"

import type { PublicationArchiveItem } from "@/components/content/publication-archive"

type TongClassPublicationArchiveProps = {
  items: PublicationArchiveItem[] | undefined
  detailHref: (item: PublicationArchiveItem) => string
}

export function TongClassPublicationArchive({
  items,
  detailHref,
}: TongClassPublicationArchiveProps) {
  // Legacy Tong Class filtering and rendering lives here.
}
```

- [ ] **Step 2: Port the complete legacy filtering behavior**

Add state and derived collections matching the `main` archive:

```tsx
const [searchQuery, setSearchQuery] = React.useState("")
const [selectedCategory, setSelectedCategory] = React.useState("all")
const [publicationKind, setPublicationKind] =
  React.useState<"published" | "preprint">("published")
const [sortBy, setSortBy] = React.useState<"year" | "title">("year")
const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc")

const publications = React.useMemo(() => items ?? [], [items])
const filteredPublications = React.useMemo(() => {
  let result = [...publications]
  result = result.filter((publication) =>
    publicationKind === "preprint"
      ? publication.venue.trim().toLowerCase() === "arxiv preprint"
      : publication.venue.trim().toLowerCase() !== "arxiv preprint"
  )
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    result = result.filter(
      (publication) =>
        publication.title.toLowerCase().includes(query) ||
        publication.authors.some((author) =>
          getPublicationAuthorName(author).toLowerCase().includes(query)
        )
    )
  }
  if (selectedCategory !== "all") {
    result = result.filter(
      (publication) => (publication.category.trim() || "未分类") === selectedCategory
    )
  }
  result.sort((left, right) => {
    if (sortBy === "year") {
      return sortOrder === "desc" ? right.year - left.year : left.year - right.year
    }
    return sortOrder === "desc"
      ? right.title.localeCompare(left.title)
      : left.title.localeCompare(right.title)
  })
  return result
}, [publicationKind, publications, searchQuery, selectedCategory, sortBy, sortOrder])

const groupedByYear = React.useMemo(() => {
  const groups: Record<number, PublicationArchiveItem[]> = {}
  filteredPublications.forEach((publication) => {
    ;(groups[publication.year] ??= []).push(publication)
  })
  return Object.entries(groups).sort(([left], [right]) =>
    sortOrder === "desc" ? Number(right) - Number(left) : Number(left) - Number(right)
  )
}, [filteredPublications, sortOrder])
```

Use `getPublicationAuthorName` for author search and normalize an empty category to `未分类`.

- [ ] **Step 3: Port the complete legacy Tong Class presentation**

Render the old sticky white filter bar with one `Input`, four shadcn `Select` controls, the conditional reset `Button`, and the result count. Render the archive in a pale blue section with year columns and white paper cards using these exact outer structures:

```tsx
return (
  <>
    <section className="sticky top-16 z-40 border-b border-slate-200 bg-white">
      <div className="container-custom py-4">
        <div className="flex flex-col gap-4 md:flex-row">{filterControls}</div>
        <div className="mt-4 text-sm text-slate-600">{resultCountLabel}</div>
      </div>
    </section>
    <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {archiveContent}
      </div>
    </section>
  </>
)
```

In the implementation, `filterControls`, `resultCountLabel`, and `archiveContent` above are the corresponding inline JSX rather than new variables. `archiveContent` is either the `FileText` empty state or `groupedByYear.map`, whose row class is `grid grid-cols-[72px_1fr] gap-6 md:grid-cols-[96px_1fr] md:gap-10`; each paper card class is `group border-l-[3px] border-transparent bg-white p-5 shadow-sm transition-all duration-200 hover:border-primary hover:bg-slate-50`. Reuse `PublicationAuthorsList`, `getSafeExternalUrl`, `Search`, `FileText`, `ExternalLink`, `Input`, `Button`, and the existing shadcn select primitives. Do not reference any `--aia-*` tokens.

- [ ] **Step 4: Keep safe link and empty/loading behavior**

Only render an external anchor when `getSafeExternalUrl(publication.url)` returns a URL. Treat `undefined` items as an empty collection, show `未找到相关成果`, and preserve the old reset defaults: published, all categories, empty search.

### Task 3: Switch only the Tong Class route

**Files:**
- Modify: `src/app/tong-class/publications/page.tsx`
- Do not modify: `src/app/research/page.tsx`

- [ ] **Step 1: Replace the Tong Class archive import and render**

Use:

```tsx
import {
  TongClassPublicationArchive,
} from "@/components/content/tong-class-publication-archive"
import type {
  PublicationArchiveItem,
} from "@/components/content/publication-archive"
```

Replace the content render with:

```tsx
<TongClassPublicationArchive
  items={publications}
  detailHref={(item) => `/tong-class/publications/${item.id}`}
/>
```

Keep `usePublications({ limit: 100 })`, the existing item mapping, and the current Tong Class hero unchanged.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
node scripts/test-tong-class-publications-style-source.mjs
```

Expected: PASS with `Tong Class publication archive style contract passed`.

- [ ] **Step 3: Commit the implementation**

```bash
git add src/components/content/tong-class-publication-archive.tsx \
  src/app/tong-class/publications/page.tsx
git commit -m "fix: restore Tong Class publication archive style"
```

### Task 4: Verify no research regression

**Files:**
- Verify: `src/app/research/page.tsx`
- Verify: `src/components/content/publication-archive.tsx`

- [ ] **Step 1: Run focused publication and route contracts**

Run:

```bash
node scripts/test-tong-class-publications-style-source.mjs
node scripts/test-aia-shared-publications.mjs
node scripts/test-tong-class-route-source.mjs
```

Expected: all three commands exit with status 0.

- [ ] **Step 2: Run the primary quality gate**

Run:

```bash
npm run lint
```

Expected: ESLint exits with status 0 and no warnings.

- [ ] **Step 3: Inspect the final scoped diff**

Run:

```bash
git status --short
git diff HEAD~2 -- \
  scripts/test-tong-class-publications-style-source.mjs \
  src/components/content/tong-class-publication-archive.tsx \
  src/app/tong-class/publications/page.tsx \
  src/app/research/page.tsx
```

Expected: only the regression test, dedicated Tong Class component, and Tong Class page change. `/research` remains unchanged. Preserve unrelated untracked files such as `public/fonts/aia/`.
