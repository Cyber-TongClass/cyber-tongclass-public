# Document Overlay Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a polished Word-region action toolbar only after explicit canvas selection and dismiss it from blank space.

**Architecture:** The workbench separates navigation activation from canvas selection. Canvas owns blank-space gesture routing, while each overlay owns explicit selection and the single-line toolbar presentation.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide icons, Node source-contract tests.

---

### Task 1: Lock the interaction contract

**Files:**
- Modify: `scripts/test-oa-document-workbench-source.mjs`

- [x] Assert that the workbench has `selectedRegionId` distinct from `activeRegionId`, canvas exposes select/deselect callbacks, and blank pointer events call deselect.
- [x] Assert that the toolbar uses `w-max`, `whitespace-nowrap`, non-shrinking action buttons, and remains conditional on `selected`.
- [x] Run `node --test scripts/test-oa-document-workbench-source.mjs` and confirm failure on the missing state and styles.

### Task 2: Implement explicit selection and dismissal

**Files:**
- Modify: `src/components/oa-documents/oa-document-workbench.tsx`
- Modify: `src/components/oa-documents/oa-document-canvas.tsx`
- Modify: `src/components/oa-documents/oa-document-overlay.tsx`

- [x] Add `selectedRegionId` in the workbench and clear it on page changes, Escape, draw, and delete.
- [x] Pass `active`, `selected`, `onSelect`, and `onDeselect` through canvas/overlay without changing review data.
- [x] Deselect from blank paper or canvas padding while preserving draw and overlay drag behavior.
- [x] Replace the toolbar styles with a stable one-line AIA surface above the rectangle.

### Task 3: Verify and ship

**Files:**
- Modify: `docs/superpowers/plans/2026-08-15-document-overlay-selection.md`

- [x] Run focused tests, full ESLint, TypeScript, and the Impeccable detector.
- [x] Use the real workbench in the browser to verify hover/click/blank-click behavior and visual alignment.
- [x] Mark this plan complete, commit only owned files, and push `codex/newnew-ai-platform-features`.
