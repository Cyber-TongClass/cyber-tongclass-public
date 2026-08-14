# Optional Follow-up Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each `fill_form` workflow node either block until the assignee submits the target form or grant access and continue immediately.

**Architecture:** Persist an optional compatibility-safe node flag and snapshot it into idempotent access grants. Required nodes block the source workflow; a successful target submission resolves matching grants and resumes each source workflow after server-side version and node checks.

**Tech Stack:** TypeScript, Convex schema/mutations, React, Node source/domain tests.

---

### Task 1: Contract and editor

**Files:**
- Modify: `src/lib/oa-forms.ts`
- Modify: `src/types/index.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/oaForms.ts`
- Modify: `src/components/oa/oa-workflow-editor.tsx`
- Modify: `src/components/oa/oa-workflow-simulation.tsx`
- Test: `scripts/test-aia-unified-workflow-contract-source.mjs`
- Test: `scripts/test-aia-unified-workflow-editor-source.mjs`

- [ ] Add failing assertions for `completionRequired`, the two editor choices, and compatibility normalization.
- [ ] Run the two tests and verify the new assertions fail.
- [ ] Add the optional contract field, default new nodes to `true`, preserve absent legacy values as `false`, and render the editor/simulation labels.
- [ ] Run the two tests and verify they pass.

### Task 2: Required-node runtime

**Files:**
- Modify: `convex/lib/oaWorkflow.ts`
- Modify: `convex/oaForms.ts`
- Modify: `convex/schema.ts`
- Test: `scripts/test-aia-oa-workflow-v2-source.mjs`

- [ ] Add failing assertions that required fill nodes return a blocked state and target submission invokes an idempotent grant completion helper.
- [ ] Run the workflow test and verify it fails for the missing behavior.
- [ ] Snapshot the flag into grants, block required nodes, and implement server-side grant completion with source node/version checks before continuing at `nodeIndex + 1`.
- [ ] Run the workflow tests and verify they pass.

### Task 3: History and regression

**Files:**
- Modify: `convex/oaForms.ts`
- Modify: `src/app/services/oa/submissions/[id]/page.tsx`
- Test: `scripts/test-aia-oa-full-workflow-history-source.mjs`

- [ ] Add failing assertions for “等待填写” versus “仅开放权限” history semantics.
- [ ] Implement the safe history projection and applicant-facing labels.
- [ ] Run all AIA/OA workflow tests, ESLint, TypeScript, and `git diff --check`.
