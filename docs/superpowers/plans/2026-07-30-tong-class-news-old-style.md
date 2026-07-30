# Tong Class News Old Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the complete blue legacy Tong Class news archive without changing AIA updates.

**Architecture:** A dedicated `TongClassNewsTimeline` receives the existing `NewsTimelineItem` contract and owns Tong Class filtering, grouping, and rendering. `/updates` remains on the institute `NewsTimeline`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Node.js source-contract tests, ESLint.

---

### Task 1: Define the separation contract

**Files:**
- Create: `scripts/test-tong-class-news-style-source.mjs`

- [ ] Assert that the Tong Class page renders `TongClassNewsTimeline`, `/updates` still renders `NewsTimeline`, the dedicated component contains `bg-primary`, `groupedNews`, and `sortedMonths`, and it contains no AIA color token.
- [ ] Run `node scripts/test-tong-class-news-style-source.mjs` and confirm it fails before implementation.

### Task 2: Add the dedicated Tong Class timeline

**Files:**
- Create: `src/components/content/tong-class-news-timeline.tsx`

- [ ] Accept `items: NewsTimelineItem[] | undefined` and `detailHref`.
- [ ] Implement case-insensitive title search, category selection, newest-first sorting, safe year-month grouping, loading state, empty state, and filter reset.
- [ ] Render the `main` legacy classes: white sticky filter bar, `bg-slate-100` archive, `text-primary` month heading, `bg-primary` category badge, white cards, and `hover:border-primary`.
- [ ] Use `getSafeExternalUrl` before rendering external navigation and preserve optional cover images.

### Task 3: Switch only Tong Class

**Files:**
- Modify: `src/app/tong-class/news/page.tsx`
- Do not modify: `src/app/updates/page.tsx`

- [ ] Replace the Tong Class `NewsTimeline` render with `TongClassNewsTimeline`; keep the existing hero, data query, mapping, and `/tong-class/news/[id]` links.
- [ ] Run the new source-contract test and confirm it passes.

### Task 4: Verify and commit

- [ ] Run:

```bash
node scripts/test-tong-class-news-style-source.mjs
node scripts/test-aia-shared-news.mjs
node scripts/test-tong-class-route-source.mjs
npm run lint
npx tsc --noEmit
```

- [ ] Confirm `/tong-class/news` is blue and `/updates` retains the AIA treatment in the local browser.
- [ ] Stage only the news design, plan, test, component, and Tong Class page; preserve unrelated font changes.
