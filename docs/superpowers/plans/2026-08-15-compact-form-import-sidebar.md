# Compact Form Import Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Word and Excel new-form imports into a compact responsive side rail without changing their data flows.

**Architecture:** `ManageFormEditor` owns the responsive two-column composition. The existing import components receive an optional compact presentation prop so their business logic remains shared and their expanded result states remain functional.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Node source-contract tests.

---

### Task 1: Lock the responsive layout contract

**Files:**
- Modify: `scripts/test-oa-word-first-import-source.mjs`
- Modify: `scripts/test-oa-spreadsheet-ui-source.mjs`

- [x] Add assertions for a wide-screen main/sidebar grid, compact import props, responsive stacking, and the wider new-form container.
- [x] Run `node --test scripts/test-oa-word-first-import-source.mjs scripts/test-oa-spreadsheet-ui-source.mjs` and confirm the new assertions fail because the compact layout is absent.

### Task 2: Implement compact import presentations

**Files:**
- Modify: `src/components/oa-documents/oa-document-import.tsx`
- Modify: `src/components/oa-documents/oa-document-new-form-import.tsx`
- Modify: `src/components/oa-spreadsheets/oa-spreadsheet-new-form-import.tsx`

- [x] Add an optional `compact` prop to both import entry points.
- [x] In compact Word mode, render reduced padding and typography, keep the upload control at least 44px high, and omit only the MIME diagnostic line.
- [x] In compact Excel mode, stack the heading and upload control and keep analyzed content overflow-safe without removing any creation choice.

### Task 3: Compose and verify the side rail

**Files:**
- Modify: `src/app/forms/manage/form-editor.tsx`
- Modify: `src/app/forms/manage/new/page.tsx`

- [x] Wrap new-form editor sections and quick imports in a responsive grid, with the compact imports first on narrow screens and in the right sticky rail on wide screens.
- [x] Pass compact mode to both import components and remove the full-width file-first block and separator.
- [x] Widen only the new-form page container.
- [x] Run the two focused tests and confirm they pass.
- [x] Run ESLint, `npx tsc --noEmit --incremental false`, the Impeccable detector, and desktop/mobile browser inspection.
