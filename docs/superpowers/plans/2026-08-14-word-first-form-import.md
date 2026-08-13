# Word-First Form Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher or super administrator import Word from the new-form editor before entering metadata, then continue in the existing annotation workbench with a private temporary draft.

**Architecture:** Add a pure client-domain helper that constructs the self-scoped draft and removes its internal placeholder after compilation. Add a focused import launcher that reuses canonical API hooks for draft creation, storage upload, version creation, and analysis. Pass the created template version through the workbench URL, then return to the existing editor after compilation.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex React hooks, Node source-contract tests.

---

### Task 1: Define and test the temporary Word-import draft contract

**Files:**
- Create: `src/lib/oa-word-import-flow.ts`
- Create: `scripts/test-oa-word-first-import-source.mjs`

- [ ] **Step 1: Write the failing source-contract and behavior tests**

Test that the helper exports a stable placeholder ID, derives a title without `.doc/.docx`, creates a draft with `status: "draft"`, one placeholder field, and `targetScope.userIds` containing only the creator, and removes only that placeholder during compilation.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-oa-word-first-import-source.mjs`

Expected: FAIL because `src/lib/oa-word-import-flow.ts` and the new import wiring do not exist.

- [ ] **Step 3: Implement the minimal pure helper**

Create `createWordImportDraftPayload(fileName, creatorId, nonce)` and `withoutWordImportPlaceholder(fields)`. Use a collision-resistant slug suffix supplied by the caller and keep the temporary scope limited to `{ userIds: [creatorId] }`.

- [ ] **Step 4: Run the focused test**

Run: `node --test scripts/test-oa-word-first-import-source.mjs`

Expected: helper assertions pass; UI wiring assertions remain failing until Task 2.

### Task 2: Create the draft, upload the Word file, and open the existing workbench

**Files:**
- Create: `src/components/oa-documents/oa-document-new-form-import.tsx`
- Modify: `src/app/forms/manage/form-editor.tsx`
- Modify: `src/app/forms/manage/new/page.tsx`
- Modify: `src/app/forms/manage/[id]/document-template/page.tsx`

- [ ] **Step 1: Extend the failing test with the required UI wiring**

Assert that the new-form editor renders the launcher, the launcher calls only canonical API hooks, creates the draft before requesting the form-bound upload URL, posts to the existing analyze route, and navigates with `?versionId=`. Assert that the workbench reads that query parameter.

- [ ] **Step 2: Run the test and confirm the missing wiring failure**

Run: `node --test scripts/test-oa-word-first-import-source.mjs`

Expected: FAIL on the missing launcher/import/query-parameter patterns.

- [ ] **Step 3: Implement the import launcher and editor placement**

Render the launcher above the manual `OAFormBuilder` only when `form === null`. On selection: validate and hash the file, create the self-scoped draft using `useManageUpsertOAForm`, upload using the existing form-bound upload hook, create/analyze its template version, and route to the existing workbench with the version ID.

- [ ] **Step 4: Initialize the workbench from the URL**

Read `versionId` with `useSearchParams`, use it as the initial version selection, and preserve the existing active-version fallback for ordinary edit flows.

- [ ] **Step 5: Run the focused tests**

Run: `node --test scripts/test-oa-word-first-import-source.mjs scripts/test-oa-word-integration-source.mjs scripts/test-oa-document-workbench-source.mjs`

Expected: all tests PASS.

### Task 3: Replace the internal placeholder and return to form configuration

**Files:**
- Modify: `src/app/forms/manage/[id]/document-template/page.tsx`
- Test: `scripts/test-oa-word-first-import-source.mjs`

- [ ] **Step 1: Add failing assertions for placeholder removal and editor return**

Assert that compilation calls `withoutWordImportPlaceholder(form.fields)` before `mergeDocumentManifestFields` and navigates to `/forms/manage/${form._id}` after successful activation.

- [ ] **Step 2: Run the test to confirm failure**

Run: `node --test scripts/test-oa-word-first-import-source.mjs`

Expected: FAIL until compilation cleanup and navigation are wired.

- [ ] **Step 3: Implement the minimal compilation transition**

Remove the internal placeholder before merging confirmed Word fields. After save and activation succeed, route to the ordinary editor where the owner sets audience and workflow.

- [ ] **Step 4: Run focused and repository verification**

Run:

```bash
node --test scripts/test-oa-word-first-import-source.mjs scripts/test-oa-word-integration-source.mjs scripts/test-oa-document-workbench-source.mjs scripts/test-oa-word-template-backend-source.mjs
npm run lint
npx tsc --noEmit
```

Expected: all tests pass, ESLint exits 0, and TypeScript exits 0.
