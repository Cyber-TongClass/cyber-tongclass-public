# PDF–DOCX Dual-Anchor Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the structural Word preview with a PDF-rendered annotation canvas whose editable regions are each bound to one validated DOCX write target.

**Architecture:** Analysis converts the canonical DOCX to PDF, renders page images, extracts PDF geometry, builds an OOXML writable-node index, and stores a bounded preview ZIP. The browser edits normalized PDF rectangles, while authenticated server routes resolve server-issued candidate IDs into structural anchors; compilation writes only through those structural anchors.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Convex access wrappers, OOXML/XML utilities, LibreOffice, Poppler (`pdfinfo`, `pdftotext`, `pdftoppm`), Node test runner, esbuild test harnesses, Tailwind.

---

## File map and parallel order

| Task | Files owned | Responsibility |
|---|---|---|
| 1 | `src/lib/oa-document-templates.ts`, new `src/lib/oa-document-geometry.ts` | Version-2 manifest, dual anchors, geometry |
| 2 | new `src/lib/server/oa-preview-tools.ts`, `oa-preview-bundle.ts`; Office capability/conversion files | Safe PDF conversion/rendering/bundle IO |
| 3 | new `oa-word-layout-index.ts`, `oa-pdf-layout.ts`, `oa-layout-matcher.ts`; detector | OOXML candidates and PDF mapping |
| 4 | compiler/fill files | Style-preserving DOCX write targets |
| 5 | canvas and new overlay component | Page and rectangle interaction |
| 6 | analyze/preview/review routes, access wrapper, one Convex query | Authenticated server flow |
| 7 | workbench/panel/editor/controller/client manifest | Binding-aware UI integration |
| 8 | local smoke script | Six-page fixture round trip |
| 9 | feature files only | Integrated verification |

Wave 1 is Task 1. After it lands, Tasks 2–5 run in parallel with exclusive ownership. Task 6 waits for Tasks 2–3; Task 7 waits for Tasks 1 and 5; Task 8 waits for Tasks 4 and 6; Task 9 is final.

Do not modify `package.json` scripts or install dependencies. Preserve the unrelated dirty files already listed by `git status`. The only planned Convex edit is returning a server-authorized preview URL from `getProcessingAccess`; there is no schema change.

### Task 1: Dual-anchor domain and geometry primitives

**Files:**
- Modify: `src/lib/oa-document-templates.ts`
- Create: `src/lib/oa-document-geometry.ts`
- Modify: `scripts/test-oa-word-template-domain.mjs`
- Create: `scripts/test-oa-document-geometry.mjs`

- [ ] **Step 1: Write failing version-2 domain tests**

Add a version-2 manifest containing this representative data and assert invalid page numbers, out-of-range rectangles, missing candidate IDs, and confirmed fields without structural anchors are rejected. Keep one version-1 fixture that still validates for legacy export.

```js
const visual = {
  page: 4, x: 0.12, y: 0.34, width: 0.76, height: 0.18,
  pageWidth: 595.28, pageHeight: 841.89,
  rotation: 0, coordinateSpace: "normalized-pdf",
}
const structural = {
  partName: "word/document.xml", path: "/document/body[1]/p[7]",
  contextHash: "sha256:abc", writeTarget: "paragraph-after",
  styleSourcePath: "/document/body[1]/p[7]",
}
```

- [ ] **Step 2: Run the tests and confirm failure**

```bash
node --test scripts/test-oa-word-template-domain.mjs scripts/test-oa-document-geometry.mjs
```

Expected: failure because the version-2 types and geometry script do not exist.

- [ ] **Step 3: Add exact version-2 contracts**

```ts
export type OADocumentWriteTarget = "table-cell" | "inline-run" | "paragraph-after" | "choice" | "repeat-row"
export type OADocumentPageRotation = 0 | 90 | 180 | 270

export interface OADocumentVisualAnchor {
  page: number
  x: number; y: number; width: number; height: number
  pageWidth: number; pageHeight: number
  rotation: OADocumentPageRotation
  coordinateSpace: "normalized-pdf"
}

export interface OADocumentBindingCandidate extends OADocumentStructuralLocator {
  id: string
  label: string
  description: string
  writeTarget: OADocumentWriteTarget
  styleSourcePath?: string
  visual: OADocumentVisualAnchor
}
```

Suggestions gain optional `visual` and `bindingCandidateIds`. Anchors gain version-2 `visual`, `bindingCandidateId`, and `structural`. `validateTemplateManifest` requires all three for syntax version 2, exactly one anchor for each confirmed field, unique candidate IDs, finite page geometry, and rectangles fully inside `[0,1]`.

- [ ] **Step 4: Implement pure geometry helpers**

```ts
export function clampVisualAnchor(anchor: OADocumentVisualAnchor): OADocumentVisualAnchor
export function clientRectToVisualAnchor(
  page: Pick<OADocumentVisualAnchor, "page" | "pageWidth" | "pageHeight" | "rotation">,
  rectangle: { left: number; top: number; width: number; height: number },
  renderedPage: { left: number; top: number; width: number; height: number },
): OADocumentVisualAnchor
export function visualIntersectionRatio(left: OADocumentVisualAnchor, right: OADocumentVisualAnchor): number
export function rankBindingCandidates(region: OADocumentVisualAnchor, candidates: OADocumentBindingCandidate[]): OADocumentBindingCandidate[]
```

Use top-left normalized coordinates, a minimum size of `0.005`, same-page filtering, descending overlap, then candidate ID as a deterministic tie-break.

- [ ] **Step 5: Test zoom/DPR independence, all rotations, clamping, overlap, and ties**

Bundle the TS module with the existing local esbuild binary in `scripts/test-oa-document-geometry.mjs`, then run the command from Step 2. Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/oa-document-templates.ts src/lib/oa-document-geometry.ts scripts/test-oa-word-template-domain.mjs scripts/test-oa-document-geometry.mjs
git commit -m "feat: define PDF DOCX dual anchors"
```

### Task 2: Safe PDF preview runtime and bounded bundle

**Files:**
- Create: `src/lib/server/oa-preview-tools.ts`
- Create: `src/lib/server/oa-preview-bundle.ts`
- Modify: `src/lib/server/office-capabilities.ts`
- Modify: `src/lib/server/office-conversion.ts`
- Create: `scripts/test-oa-preview-bundle.mjs`
- Modify: `scripts/smoke-oa-office-conversion.mjs`

- [ ] **Step 1: Write failing bundle and executable tests**

Round-trip `document.pdf`, `pages/page-001.png`, and `layout.json`. Reject missing files, more than 100 pages, non-PNG page data, source-hash drift, 100 MiB bundles, 20 MiB pages, 5 MiB layout JSON, and unsafe ZIP names. Reject relative executable paths and basenames outside `pdfinfo`, `pdftotext`, `pdftoppm`, and `pdffonts`.

- [ ] **Step 2: Run and observe failure**

```bash
node --test scripts/test-oa-preview-bundle.mjs scripts/smoke-oa-office-conversion.mjs
```

- [ ] **Step 3: Implement safe Poppler wrappers**

```ts
export interface OAPreviewToolCapabilities {
  pdfInfoPath: string | null
  pdfTextPath: string | null
  pdfToPpmPath: string | null
  pdfFontsPath: string | null
  unavailableReasons: string[]
}
export async function detectPreviewToolCapabilities(env: NodeJS.ProcessEnv = process.env): Promise<OAPreviewToolCapabilities>
export async function inspectPdf(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<OAPdfPageInfo[]>
export async function extractPdfBboxXml(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<string>
export async function renderPdfPages(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<Buffer[]>
export async function inspectPdfFonts(bytes: Uint8Array, caps: OAPreviewToolCapabilities): Promise<OAPdfFontInfo[]>
```

Every spawn uses argument arrays, a unique temp directory, bounded stdout/stderr, 60-second timeout, page/pixel limits, and cleanup in `finally`.

- [ ] **Step 4: Isolate concurrent LibreOffice profiles**

Add this per-job argument before conversion and preserve existing flags:

```ts
`-env:UserInstallation=${pathToFileURL(path.join(workDirectory, "profile")).href}`
```

- [ ] **Step 5: Implement the preview ZIP**

```ts
export interface OAPreviewLayout {
  syntaxVersion: 1
  sourceSha256: string
  analyzerVersion: string
  pages: OAPdfPageInfo[]
  textBoxes: OAPdfTextBox[]
  candidates: OADocumentBindingCandidate[]
}
export function buildOAPreviewBundle(input: { pdf: Buffer; pages: Buffer[]; layout: OAPreviewLayout }): Buffer
export function readOAPreviewBundle(bytes: Uint8Array, expectedSourceSha256: string): { pdf: Buffer; pages: Buffer[]; layout: OAPreviewLayout }
```

Use `buildSimpleZip` and the existing validated ZIP reader. Validate PDF/PNG magic bytes and every bound before returning data.

- [ ] **Step 6: Run tests and commit**

```bash
node --test scripts/test-oa-preview-bundle.mjs scripts/smoke-oa-office-conversion.mjs
git add src/lib/server/oa-preview-tools.ts src/lib/server/oa-preview-bundle.ts src/lib/server/office-capabilities.ts src/lib/server/office-conversion.ts scripts/test-oa-preview-bundle.mjs scripts/smoke-oa-office-conversion.mjs
git commit -m "feat: generate bounded PDF preview bundles"
```

### Task 3: OOXML writable-node index and deterministic PDF mapping

**Files:**
- Create: `src/lib/server/oa-word-layout-index.ts`
- Create: `src/lib/server/oa-pdf-layout.ts`
- Create: `src/lib/server/oa-layout-matcher.ts`
- Modify: `src/lib/server/oa-word-detection.ts`
- Create: `scripts/test-oa-layout-matcher.mjs`

- [ ] **Step 1: Write failing mapping fixtures**

Use in-memory OOXML plus bbox XML for: blank table cell, underlined run, choice group, and an instruction followed by an empty paragraph. Assert exact page, normalized rectangle, path, context hash, stable candidate ID, and `writeTarget`. Duplicate one label across pages and require document order to prevent cross-page binding.

- [ ] **Step 2: Run and observe failure**

```bash
node --test scripts/test-oa-layout-matcher.mjs
```

- [ ] **Step 3: Index writable Word nodes**

```ts
export interface OAWordWritableNode extends OADocumentStructuralLocator {
  id: string
  order: number
  kind: OADocumentRegionKind
  writeTarget: OADocumentWriteTarget
  label: string
  normalizedText: string
  table?: { table: number; row: number; cell: number }
  styleSourcePath?: string
}
export function indexWordWritableNodes(pkg: OoxmlPackage): OAWordWritableNode[]
```

Index body/header/footer paragraphs, runs, table cells, choices, and repeat rows. Add `paragraph-after` candidates for “基本概况”, “主要做法”, “创新成效”, “应用情况”, “推广价值”, and bounded length instructions.

- [ ] **Step 4: Parse bounded Poppler bbox XML**

`parsePdfBboxXml` rejects DTD/entity input, excessive bytes/elements, NaN, and out-of-page boxes. Normalize NFKC text and convert point coordinates to top-left normalized rectangles while preserving page/line/word order.

- [ ] **Step 5: Match deterministically**

```ts
export function matchWordNodesToPdf(
  nodes: OAWordWritableNode[],
  pdf: { pages: OAPdfPageInfo[]; textBoxes: OAPdfTextBox[] },
): { candidates: OADocumentBindingCandidate[]; warnings: OADocumentTemplateWarning[] }
```

Score exact normalized text, ordered containment, table row/cell order, and nearby-label geometry. A unique result needs score `>= 0.72` and a `>= 0.12` lead. For hard blank targets, create a temporary mapping DOCX with short unique markers, convert it with the same LibreOffice/font configuration, locate each marker once, require identical page count/sizes, and display only the clean unmarked PDF. If marker geometry drifts, leave the node unresolved rather than guessing.

- [ ] **Step 6: Attach candidate data to detector suggestions**

Allow `detectWordFormRegions` to receive optional candidates. Copy `visual` and candidate IDs to matching suggestions. Auto-confirm only when exactly one candidate is valid; otherwise emit unresolved/conflict warnings.

- [ ] **Step 7: Test and commit**

```bash
node --test scripts/test-oa-layout-matcher.mjs scripts/test-oa-word-detection.mjs
git add src/lib/server/oa-word-layout-index.ts src/lib/server/oa-pdf-layout.ts src/lib/server/oa-layout-matcher.ts src/lib/server/oa-word-detection.ts scripts/test-oa-layout-matcher.mjs scripts/test-oa-word-detection.mjs
git commit -m "feat: map PDF regions to Word write targets"
```

### Task 4: Styled DOCX write targets

**Files:**
- Modify: `src/lib/server/oa-word-compiler.ts`
- Modify: `src/lib/server/oa-word-fill.ts`
- Modify: `scripts/test-oa-word-compiler.mjs`
- Modify: `scripts/test-oa-word-fill.mjs`

- [ ] **Step 1: Add failing narrative and choice tests**

Compile an instruction paragraph with `w:pPr`/`w:rPr` and assert `paragraph-after` inserts a new sibling paragraph immediately after it, retains the instruction, clones style, and tags the SDT. Add option-level choice targets and assert only the selected option receives a mark.

- [ ] **Step 2: Run and observe failure**

```bash
node --test scripts/test-oa-word-compiler.mjs scripts/test-oa-word-fill.mjs
```

- [ ] **Step 3: Implement five explicit write targets**

Handle `table-cell`, `inline-run`, `paragraph-after`, `choice`, and `repeat-row`. For `paragraph-after`, deep-clone only compatible `w:pPr` and the first `w:rPr`, create a sibling `w:p`, insert a block SDT within it, and never append answer text to the instruction sentence.

- [ ] **Step 4: Preserve legacy behavior and multiline filling**

Map legacy modes as follows and keep version-1 tests green:

```text
replace + table_cell -> table-cell
append -> inline-run
mark_choice -> choice
repeat_row -> repeat-row
```

Assert `第一段\n第二段` becomes Word line breaks inside the inserted paragraph without losing style.

- [ ] **Step 5: Test and commit**

```bash
node --test scripts/test-oa-word-compiler.mjs scripts/test-oa-word-fill.mjs
git add src/lib/server/oa-word-compiler.ts src/lib/server/oa-word-fill.ts scripts/test-oa-word-compiler.mjs scripts/test-oa-word-fill.mjs
git commit -m "feat: preserve styles for narrative Word answers"
```

### Task 5: Interactive PDF-page canvas

**Files:**
- Create: `src/components/oa-documents/oa-document-overlay.tsx`
- Rewrite: `src/components/oa-documents/oa-document-canvas.tsx`
- Modify: `scripts/test-oa-document-workbench-source.mjs`

- [ ] **Step 1: Write failing source-contract checks**

Require an authenticated page-image prop, normalized absolute overlays, pointer capture for draw/drag/resize, selected “编辑/删除” actions, keyboard arrows, and absence of “结构化预览 · 非原始 Word HTML”.

- [ ] **Step 2: Run and observe failure**

```bash
node --test scripts/test-oa-document-workbench-source.mjs
```

- [ ] **Step 3: Implement one accessible overlay**

Render percentage geometry with an outer transparent hit target and inner border so hover thickening does not move layout. Eight handles update through `clampVisualAnchor`. Arrow keys move by `0.002`; Shift+Arrow resizes by `0.002`; every edit stays on-page.

- [ ] **Step 4: Replace the simulated canvas**

```ts
interface OADocumentCanvasProps {
  page: number
  pageCount: number
  previewPageUrl: string
  suggestions: OADocumentSuggestion[]
  activeRegionId?: string
  mode: "select" | "draw"
  onActivate(id: string): void
  onDraw(visual: OADocumentVisualAnchor): void
  onChange(id: string, visual: OADocumentVisualAnchor): void
  onDelete(id: string): void
  onEdit(id: string): void
}
```

Use the PNG intrinsic dimensions for aspect ratio. Draw mode creates a clamped rectangle. Filter by page and exclude ignored/deleted regions from pointer interaction. Make the image non-draggable with meaningful alt text.

- [ ] **Step 5: Test and commit**

```bash
node --test scripts/test-oa-document-workbench-source.mjs
git add src/components/oa-documents/oa-document-overlay.tsx src/components/oa-documents/oa-document-canvas.tsx scripts/test-oa-document-workbench-source.mjs
git commit -m "feat: add interactive PDF annotation canvas"
```

### Task 6: Analyze, preview, and server-resolved review APIs

**Files:**
- Modify: `convex/oaDocumentTemplates.ts`
- Modify: `src/lib/server/oa-document-access.ts`
- Modify: `src/app/api/oa/document-templates/analyze/route.ts`
- Modify: `src/app/api/oa/document-templates/[versionId]/preview/route.ts`
- Create: `src/app/api/oa/document-templates/[versionId]/preview/pages/[page]/route.ts`
- Create: `src/app/api/oa/document-templates/[versionId]/review/route.ts`
- Modify: `scripts/test-oa-word-routes-source.mjs`
- Modify: `scripts/test-oa-word-template-backend-source.mjs`

- [ ] **Step 1: Write failing route/security contracts**

Require preview ZIP generation; bearer auth on metadata/page/review; PNG no-store responses; review requests that contain rectangles/candidate IDs but never OOXML paths; compile continuing to load the persisted manifest.

- [ ] **Step 2: Run and observe failure**

```bash
node --test scripts/test-oa-word-routes-source.mjs scripts/test-oa-word-template-backend-source.mjs
```

- [ ] **Step 3: Expose preview bytes server-to-server**

In `getProcessingAccess`, resolve existing `previewStorageId` using the same R2/Convex helper as source and return `previewUrl`. Add `previewUrl: string | null` to `ProcessingAccess`. Do not return storage IDs or signed URLs from browser-facing routes. This is the only Convex file change and requires no schema change.

- [ ] **Step 4: Build the complete analysis pipeline**

```ts
const pdf = await convertFilledDocxToPdf(workingBytes, workingFileName, { capabilities: officeCapabilities })
const tools = await detectPreviewToolCapabilities()
const pages = await inspectPdf(pdf.bytes, tools)
const textBoxes = parsePdfBboxXml(await extractPdfBboxXml(pdf.bytes, tools), pages)
const matched = matchWordNodesToPdf(indexWordWritableNodes(pkg), { pages, textBoxes })
const suggestions = detectWordFormRegions(pkg, matched.candidates)
```

Render PNG pages, inspect embedded fonts, build/upload `preview.zip`, set syntax version 2, and persist once. Missing tools/fonts or material font substitution returns a specific 409 and does not save fake preview data.

- [ ] **Step 5: Serve authenticated metadata and pages**

Metadata returns page sizes/count and sanitized suggestion geometry. The page route accepts a positive 1-based page, verifies source hash/bundle bounds, and returns the PNG with `image/png`, `private, no-store`, `nosniff`, and content length.

- [ ] **Step 6: Resolve review edits on the server**

Accept only:

```ts
interface ReviewEdit {
  suggestionId: string
  reviewState: OADocumentSuggestionReviewState
  label: string
  inferredAnswerType: OADocumentAnswerType
  required?: boolean
  maxLength?: number
  options?: string[]
  visual?: OADocumentVisualAnchor
  bindingCandidateId?: string
}
```

Reload the preview bundle, resolve candidate IDs from `layout.candidates`, require same-page positive overlap, rebuild canonical structural anchors, validate the manifest, and persist it. A confirmed edit without one valid candidate returns 409 `BINDING_REQUIRED`.

- [ ] **Step 7: Test and commit**

```bash
node --test scripts/test-oa-word-routes-source.mjs scripts/test-oa-word-template-backend-source.mjs scripts/test-oa-preview-bundle.mjs scripts/test-oa-layout-matcher.mjs
git add convex/oaDocumentTemplates.ts src/lib/server/oa-document-access.ts src/app/api/oa/document-templates/analyze/route.ts 'src/app/api/oa/document-templates/[versionId]/preview/route.ts' 'src/app/api/oa/document-templates/[versionId]/preview/pages/[page]/route.ts' 'src/app/api/oa/document-templates/[versionId]/review/route.ts' scripts/test-oa-word-routes-source.mjs scripts/test-oa-word-template-backend-source.mjs
git commit -m "feat: serve and validate Word PDF annotations"
```

### Task 7: Binding-aware workbench integration

**Files:**
- Modify: `src/components/oa-documents/oa-document-workbench.tsx`
- Modify: `src/components/oa-documents/oa-document-annotation-panel.tsx`
- Modify: `src/components/oa-documents/oa-document-field-editor.tsx`
- Modify: `src/app/forms/manage/[id]/document-template/page.tsx`
- Modify: `src/lib/oa-document-template-client.ts`
- Modify: `scripts/test-oa-document-workbench-source.mjs`
- Modify: `scripts/test-oa-word-integration-source.mjs`

- [ ] **Step 1: Write failing integration checks**

Require bounded pages, select/draw modes, candidate selection, “已绑定 Word 可写位置”/“未绑定 Word 位置”, missing-binding compile blocking, and save through `/review` rather than the browser Convex mutation.

- [ ] **Step 2: Run and observe failure**

```bash
node --test scripts/test-oa-document-workbench-source.mjs scripts/test-oa-word-integration-source.mjs
```

- [ ] **Step 3: Remove synthetic manual Word paths**

Delete `/manual/...` locators. Drawing creates an unresolved visual-only suggestion. It becomes confirmed only after the server returns and the user selects a real candidate.

- [ ] **Step 4: Load authenticated page blobs**

Pass `versionId` into the workbench. Fetch metadata with bearer auth. Fetch page images as `Blob`, create an object URL, revoke it on page change/unmount, and keep page within `1..pageCount`. Never place tokens in URLs.

- [ ] **Step 5: Add binding state to inspector and controller**

Show candidate descriptions and human-readable Word targets. Hover/click sync panel and overlay. Moving outside a candidate clears its binding and makes it unresolved. Delete removes its field/anchor. Separate unresolved and conflict counts so the UI does not double-report conflicts.

- [ ] **Step 6: Save canonical edits and compile only resolved results**

POST review edits to the authenticated route, then adopt its returned manifest. Update `buildReviewedDocumentManifest` to require both version-2 anchors while preserving version-1 export compatibility. Protect against a stale save response overwriting a newer local revision.

- [ ] **Step 7: Test and commit**

```bash
node --test scripts/test-oa-document-workbench-source.mjs scripts/test-oa-word-integration-source.mjs scripts/test-oa-word-first-import-source.mjs
git add src/components/oa-documents/oa-document-workbench.tsx src/components/oa-documents/oa-document-annotation-panel.tsx src/components/oa-documents/oa-document-field-editor.tsx 'src/app/forms/manage/[id]/document-template/page.tsx' src/lib/oa-document-template-client.ts scripts/test-oa-document-workbench-source.mjs scripts/test-oa-word-integration-source.mjs
git commit -m "feat: connect dual-anchor annotation workbench"
```

### Task 8: Six-page DOCX smoke loop

**Files:**
- Create: `scripts/smoke-oa-pdf-docx-workbench.mjs`

- [ ] **Step 1: Build a local-only smoke harness**

Accept an explicit input DOCX path and output directory. Never embed or copy the user fixture into the repo. Bundle/import preview, mapping, compiler, and filler modules with esbuild; generate layout/pages; find “基本概况” and “主要做法”; compile/fill answers; write only derived files to the explicit output directory.

- [ ] **Step 2: Assert end-to-end invariants**

Require six pages, at least one table-cell binding, unique narrative bindings, no confirmed field missing either anchor, every expected SDT in exported OOXML, and instruction text preceding the inserted narrative SDT. Convert the filled DOCX back to PDF and render comparison PNGs.

- [ ] **Step 3: Run the supplied fixture**

```bash
node scripts/smoke-oa-pdf-docx-workbench.mjs \
  '/Users/photonyan/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_syvavq140iw211_3d37/msg/file/2026-08/附件-“人工智能+”典型案例报送书（含汇总表）.docx' \
  /tmp/oa-pdf-docx-smoke
```

Expected: six pages, both named narrative bindings, a filled DOCX, and comparison PDF/PNGs. Missing fonts must produce the existing explicit capability error rather than weakening fidelity checks.

- [ ] **Step 4: Inspect page 2 and page 4 locally**

Verify overlays match visible cells/blank areas and filled page-4 answers follow their instructions with matching typography.

- [ ] **Step 5: Commit only the harness**

```bash
git add scripts/smoke-oa-pdf-docx-workbench.mjs
git commit -m "test: add PDF DOCX workbench smoke coverage"
```

Do not add the source DOCX, generated PDFs/PNGs, or filled DOCX.

### Task 9: Integrated verification and local browser QA

**Files:**
- Modify only feature files implicated by verification failures

- [ ] **Step 1: Run all focused checks**

```bash
node --test scripts/test-oa-word-template-domain.mjs scripts/test-oa-document-geometry.mjs scripts/test-oa-preview-bundle.mjs scripts/test-oa-layout-matcher.mjs scripts/test-oa-word-detection.mjs scripts/test-oa-word-compiler.mjs scripts/test-oa-word-fill.mjs scripts/test-oa-word-routes-source.mjs scripts/test-oa-word-template-backend-source.mjs scripts/test-oa-document-workbench-source.mjs scripts/test-oa-word-integration-source.mjs scripts/test-oa-word-first-import-source.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Run static gates**

```bash
npx tsc --noEmit --incremental false
npm run lint
```

Expected: zero TypeScript and ESLint errors.

- [ ] **Step 3: Use existing local services or start them safely**

Reuse healthy Next/Convex processes. Otherwise start `npx convex dev` and `npm run dev` in separate terminals. Do not clean caches and do not use production flags.

- [ ] **Step 4: Browser-test the local workbench**

Upload the supplied DOCX and verify six pages, hover border, Edit/Delete, draw/drag/resize, zoom/page navigation, unbound compile blocking, page-4 paragraph-after bindings, and exported DOCX placement. Do not deploy or publish.

- [ ] **Step 5: Check scope and commit feature fixes only**

```bash
git status --short
git diff --check
```

Exclude the pre-existing changes in `convex/test/externalNewsFetch.test.ts`, `convex/test/externalNewsIngest.test.ts`, `convex/test/externalNewsRouting.test.ts`, and `src/types/institute.ts`. Completion requires focused checks, typecheck, lint, fixture smoke, browser interaction, and exported DOCX inspection; missing-font limitations must be reported explicitly.
