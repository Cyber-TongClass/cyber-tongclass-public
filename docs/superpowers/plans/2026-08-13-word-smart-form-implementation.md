# Word Smart Form Import and Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn uploaded `.docx` and legacy `.doc` forms into reviewed OA forms, preserve immutable template versions, and export submissions back into Word, Excel, and PDF without changing unsupported document content.

**Architecture:** Keep Convex as the authorization and metadata source of truth, R2/Convex storage as immutable binary storage, and Node.js route handlers as the bounded document-processing boundary. A deterministic OOXML detector produces review suggestions; the AIA annotation workbench confirms them into a manifest; compilation adds stable SDTs to a working copy; export fills only confirmed anchors. Legacy `.doc` and PDF conversion use a capability-gated LibreOffice adapter and never run inside Convex.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Convex, R2/Convex storage, Tailwind/shadcn AIA tokens, Node `zlib`/`crypto`/`child_process`, existing `simple-zip` and generalized `simple-xlsx`, LibreOffice CLI when configured, Node test runner and source-contract scripts.

---

## Coordination and ownership

- This plan owns `oaDocumentTemplates`, OA template upload/analysis/compilation/export functions, document server libraries, the annotation workbench, and OA submission export UI.
- The teacher-recognition module may reuse OA submissions and attachments but must not edit document-template tables or document routes. Complete shared `convex/schema.ts` additions in one serialized schema pass before feature workers edit separate Convex modules.
- The publication and external-news modules do not depend on this plan. Shared `src/lib/api.ts` edits must be made in separate named sections and rebased carefully rather than replacing the file.
- Do not modify `package.json` scripts. Do not run Convex deployment commands, `--prod`, or any Silverfish command. Local codegen/build is allowed only after confirming the environment is not a production deployment.
- All template-version creation is idempotent by `(formId, sourceSha256, compilerVersion)`. Conversion and batch-export jobs use request fingerprints and bounded concurrency.

## Task 1: Add document-domain types, fixtures, and validation contracts

**Files:**

- Create: `src/lib/oa-document-templates.ts`
- Create: `scripts/fixtures/oa-word/README.md`
- Create: `scripts/fixtures/oa-word/manifests/table-cell.json`
- Create: `scripts/fixtures/oa-word/manifests/underlines-and-checkboxes.json`
- Create: `scripts/test-oa-word-template-domain.mjs`
- Modify: `src/lib/oa-forms.ts`
- Modify: `src/types/index.ts`

- [ ] Write failing domain tests for source types, suggestion confidence, immutable version statuses, stable field IDs, anchor validation, unresolved counts, allowed answer/output mappings, and filename/MIME/size limits.

```ts
assert.equal(normalizeWordSourceType("application/msword", "表格.doc"), "doc")
assert.equal(normalizeWordSourceType(DOCX_MIME, "表格.docx"), "docx")
assert.deepEqual(countTemplateReviewStates(suggestions), {
  confirmed: 1,
  unresolved: 2,
  ignored: 1,
  conflicts: 1,
})
assert.throws(() => validateTemplateManifest({ ...manifest, anchors: [duplicate, duplicate] }))
```

- [ ] Run `node --test scripts/test-oa-word-template-domain.mjs`; expect failure because `src/lib/oa-document-templates.ts` does not exist.
- [ ] Implement explicit serializable types: `OADocumentSourceType`, `OADocumentRegionKind`, `OADocumentSuggestion`, `OADocumentAnchor`, `OADocumentTemplateManifest`, `OADocumentTemplateWarning`, `OADocumentTemplateCapabilities`, and `OADocumentTemplateVersionSummary`.
- [ ] Add pure normalizers and validators with hard limits: 25 MiB source, 5,000 ZIP entries, 200 MiB extracted bytes, 10 MiB per XML part, 100:1 compression ratio, 500 detected regions, 100 selected submissions, and unique `fieldId`/anchor natural keys.
- [ ] Extend `OAFormField` with optional `maxLength` and `documentOutput` metadata, and extend `OASubmissionLike.formSnapshot` with optional `documentTemplateVersionId`; keep all additions optional for legacy records.
- [ ] Run `node --test scripts/test-oa-word-template-domain.mjs scripts/test-oa-forms.mjs`; expect all tests to pass.
- [ ] Commit: `git add src/lib/oa-document-templates.ts src/lib/oa-forms.ts src/types/index.ts scripts/fixtures/oa-word scripts/test-oa-word-template-domain.mjs && git commit -m "feat: define OA Word template domain"`.

## Task 2: Add immutable template storage and server-side authorization

**Files:**

- Modify: `convex/schema.ts`
- Modify: `convex/lib/r2.ts`
- Create: `convex/oaDocumentTemplates.ts`
- Modify: `convex/oaForms.ts`
- Create: `scripts/test-oa-word-template-backend-source.mjs`
- Modify: `scripts/test-r2-storage.mjs`

- [ ] Write failing source-contract tests that require a dedicated `oa-form-template` R2 purpose; an immutable version table indexed by form/version and natural key; owner/manager/super-admin checks; versioned source, working, compiled, preview, and warning metadata; and submission snapshot linkage.
- [ ] Run `node --test scripts/test-oa-word-template-backend-source.mjs scripts/test-r2-storage.mjs`; expect missing schema/functions failures.
- [ ] Add `oaDocumentTemplateVersions` with these fields: `formId`, `version`, `naturalKey`, `sourceType`, `sourceFileName`, `sourceMimeType`, `sourceSize`, `sourceSha256`, `sourceStorageId`, optional `workingStorageId`, `compiledStorageId`, `previewStorageId`, `compilerVersion`, `syntaxVersion`, `status`, `manifest`, `warnings`, `capabilities`, `createdBy`, `createdAt`, `updatedAt`. Add `activeDocumentTemplateVersionId` to `oaForms` and `documentTemplateVersionId` to `oaFormSubmissions`; all new references on legacy tables are optional.
- [ ] Add `oa-form-template` and `oa-form-template-derived` to `R2Purpose`, with ownership matching the form owner rather than a browser-supplied identity.
- [ ] Implement session-aware functions in `convex/oaDocumentTemplates.ts`:

```ts
export const generateSourceUploadUrl = mutation(/* authorized form manager */)
export const createOrGetVersion = mutation(/* idempotent naturalKey lookup */)
export const getManageVersion = query(/* owner, manager, super-admin */)
export const saveAnalysis = mutation(/* pending -> reviewed; immutable source */)
export const activateCompiledVersion = mutation(/* atomic active pointer update */)
export const getProcessingAccess = query(/* narrow route-handler DTO */)
export const getExportAccess = query(/* submitter single / manager batch */)
```

- [ ] Reject cross-form storage IDs, changed source hashes, duplicate version numbers, invalid status transitions, and activation while unresolved/conflicting suggestions remain.
- [ ] In `convex/oaForms.ts`, snapshot the active template version during submission and use that snapshot for every later export. Do not fall forward to the form's latest version.
- [ ] Make template deletion soft/archival only when referenced by a submission; remove unreferenced derived objects through a separately authorized cleanup function.
- [ ] Run the two source-contract tests; expect pass.
- [ ] Run `npx convex codegen` only against the local configured deployment; expect generated types to succeed and never pass `--prod`.
- [ ] Commit: `git add convex/schema.ts convex/lib/r2.ts convex/oaDocumentTemplates.ts convex/oaForms.ts scripts/test-oa-word-template-backend-source.mjs scripts/test-r2-storage.mjs && git commit -m "feat: store immutable OA document templates"`.

## Task 3: Build a bounded OOXML package reader and security gate

**Files:**

- Create: `src/lib/server/ooxml-package.ts`
- Create: `src/lib/server/ooxml-security.ts`
- Create: `scripts/test-ooxml-package.mjs`
- Create: `scripts/fixtures/oa-word/security/README.md`

- [ ] Write failing byte-level tests for stored and deflated ZIP entries, CRC verification, duplicate names, `../` traversal, absolute paths, encrypted flags, invalid central-directory offsets, entry count, extracted size, compression ratio, macros/OLE/external packages, unsafe external relationships, and DTD/entity declarations.
- [ ] Run `node --test scripts/test-ooxml-package.mjs`; expect module-not-found failure.
- [ ] Implement a read-only ZIP central-directory parser using Node `zlib.inflateRawSync`; verify local headers and CRC before returning an entry map. Reuse `buildSimpleZip` for generated packages rather than introducing a second writer.
- [ ] Validate `[Content_Types].xml`, `_rels/.rels`, Word content types, relationship targets, and required `word/document.xml`. Permit only internal Word parts and explicitly safe hyperlinks/images; reject macros and embedded/OLE payloads.
- [ ] Expose a narrow API:

```ts
const pkg = readOoxmlPackage(bytes, limits)
assertSafeDocxPackage(pkg)
const documentXml = pkg.readText("word/document.xml")
const rebuilt = pkg.replaceEntries(changedParts)
```

- [ ] Run `node --test scripts/test-ooxml-package.mjs`; expect all attack-matrix cases to pass.
- [ ] Commit: `git add src/lib/server/ooxml-package.ts src/lib/server/ooxml-security.ts scripts/test-ooxml-package.mjs scripts/fixtures/oa-word/security && git commit -m "feat: validate bounded OOXML packages"`.

## Task 4: Detect form regions deterministically

**Files:**

- Create: `src/lib/server/oa-word-detection.ts`
- Create: `src/lib/server/oa-word-xml.ts`
- Create: `scripts/test-oa-word-detection.mjs`
- Add fixtures under: `scripts/fixtures/oa-word/docx/`

- [ ] Add small synthetic `.docx` fixtures covering empty table cells beside labels, underlined runs, `label: blank`, checkbox/radio groups, instruction length/type hints, repeated table headers, existing SDTs/bookmarks, merged cells, headers/footers, and an ambiguous overlap.
- [ ] Write failing tests that assert stable structural locators and evidence, not page coordinates. Every suggestion must identify `partName`, paragraph/table path, text context hash, region kind, inferred field type, confidence, and conflict IDs.
- [ ] Run `node --test scripts/test-oa-word-detection.mjs`; expect missing detector failure.
- [ ] Implement namespace-tolerant WordprocessingML traversal and conservative heuristics. Derive deterministic IDs from the structural locator plus normalized label, and sort by document part/order so repeated analysis returns byte-identical JSON.
- [ ] Mark high-confidence suggestions as `confirmed` only in the initial review draft; mark ambiguity as `unresolved` or `conflict`. Never create published OA fields directly in this function.
- [ ] Detect repeat-row candidates but require explicit administrator confirmation before aggregate Word export is enabled.
- [ ] Run the detector test twice over every fixture and compare the serialized manifests; expect pass and identical output.
- [ ] Commit: `git add src/lib/server/oa-word-detection.ts src/lib/server/oa-word-xml.ts scripts/test-oa-word-detection.mjs scripts/fixtures/oa-word/docx && git commit -m "feat: detect Word form answer regions"`.

## Task 5: Add capability-gated `.doc` conversion and previews

**Files:**

- Create: `src/lib/server/office-conversion.ts`
- Create: `src/lib/server/office-capabilities.ts`
- Create: `scripts/test-office-capabilities.mjs`
- Create: `scripts/smoke-oa-office-conversion.mjs`

- [ ] Write failing tests for missing LibreOffice, timeout, non-zero exit, unexpected output filename, missing fonts, source preservation, isolated temporary directories, output-size bounds, and capability messages in Chinese.
- [ ] Run `node --test scripts/test-office-capabilities.mjs`; expect missing adapter failure.
- [ ] Implement `detectOfficeCapabilities()` using explicit `LIBREOFFICE_PATH`/`OA_TEMPLATE_FONT_DIR` configuration with a safe executable allowlist and font inventory. Do not search or execute browser-supplied paths.
- [ ] Implement conversion with `spawn`, an argument array, a fresh `mkdtemp` directory, a 60-second timeout, bounded stdout/stderr, and guaranteed cleanup. Conversion accepts only a server-fetched authorized source buffer.
- [ ] For `.doc`, preserve the original storage object and emit a canonical `.docx` working copy plus warnings. For PDF, convert only the already-filled `.docx`. Disable outputs when capabilities or required fonts are absent.
- [ ] Run `node --test scripts/test-office-capabilities.mjs`; expect pass. Run `node scripts/smoke-oa-office-conversion.mjs --capabilities-only`; expect either an explicit available report or a non-error unavailable report.
- [ ] Commit: `git add src/lib/server/office-conversion.ts src/lib/server/office-capabilities.ts scripts/test-office-capabilities.mjs scripts/smoke-oa-office-conversion.mjs && git commit -m "feat: gate legacy Word and PDF conversion"`.

## Task 6: Expose upload, analysis, preview, and compilation routes

**Files:**

- Create: `src/app/api/oa/document-templates/analyze/route.ts`
- Create: `src/app/api/oa/document-templates/compile/route.ts`
- Create: `src/app/api/oa/document-templates/[versionId]/preview/route.ts`
- Create: `src/lib/server/oa-document-access.ts`
- Create: `src/lib/server/oa-word-compiler.ts`
- Modify: `src/lib/api.ts`
- Create: `scripts/test-oa-word-routes-source.mjs`
- Create: `scripts/test-oa-word-compiler.mjs`

- [ ] Write failing route-contract tests for session extraction, Convex authorization before object fetch, content-length limits, hash verification, allowlisted storage IDs, `runtime = "nodejs"`, no-store responses, generic public errors, and no answer/file URL logging.
- [ ] Write failing compiler tests for stable SDT tags, text/textarea/number/date/select/radio/checkbox anchors, line-break serialization, XML escaping, headers/footers, and untouched-part hash preservation.
- [ ] Run `node --test scripts/test-oa-word-routes-source.mjs scripts/test-oa-word-compiler.mjs`; expect failures.
- [ ] Implement route access through `getConvexHttpClient()` and narrow `oaDocumentTemplates:getProcessingAccess` results. Never accept field definitions, answers, or signed template URLs from the browser.
- [ ] Analysis route flow: authenticate; authorize form; fetch authorized storage object; verify hash/MIME/signature; convert `.doc` if necessary; validate OOXML; detect regions; create/store a preview representation; persist analysis warnings and capabilities.
- [ ] Compiler flow: validate the posted manifest against the stored analysis; assign field IDs; insert stable SDTs in only the referenced parts; store the compiled document; atomically activate the immutable version and generate an OA draft field list.
- [ ] Add `src/lib/api.ts` hooks for source upload target, version metadata, saving review state, and activation. Components continue to use these hooks for Convex calls.
- [ ] Run both tests; expect pass. Run existing `node --test scripts/test-aia-oa-api-source.mjs scripts/test-aia-oa-security-source.mjs`; expect no regression.
- [ ] Commit: `git add src/app/api/oa/document-templates src/lib/server/oa-document-access.ts src/lib/server/oa-word-compiler.ts src/lib/api.ts scripts/test-oa-word-routes-source.mjs scripts/test-oa-word-compiler.mjs && git commit -m "feat: analyze and compile OA Word templates"`.

## Task 7: Build the AIA annotation workbench

**Files:**

- Create: `src/components/oa-documents/oa-document-import.tsx`
- Create: `src/components/oa-documents/oa-document-workbench.tsx`
- Create: `src/components/oa-documents/oa-document-canvas.tsx`
- Create: `src/components/oa-documents/oa-document-annotation-panel.tsx`
- Create: `src/components/oa-documents/oa-document-field-editor.tsx`
- Create: `src/app/forms/manage/[id]/document-template/page.tsx`
- Modify: `src/app/forms/manage/form-editor.tsx`
- Modify: `src/components/oa-forms/oa-form-builder.tsx`
- Create: `scripts/test-oa-document-workbench-source.mjs`

- [ ] Write failing source/interaction contract tests for upload acceptance (`.docx,.doc`), AIA tokens, green/yellow/red states, page navigation, unresolved counts, bidirectional hover/focus linkage, click editor, add/edit/move/delete/ignore/confirm, keyboard reachability, screen-reader labels, save retry, and publish blocking.
- [ ] Run `node --test scripts/test-oa-document-workbench-source.mjs`; expect missing components failure.
- [ ] Implement a three-column responsive workbench: page rail, paper canvas, annotation panel. Reuse `aia-serif`, `aia-mono`, `aia-border-rule`, `aia-bg-paper`, `aia-tag`, square controls, existing buttons/dialogs, and the current form editor shell; do not introduce a separate visual language.
- [ ] Render a sanitized structural preview rather than browser Word HTML. Each region gets a shared `data-region-id`; pointer hover, keyboard focus, and annotation selection update one `activeRegionId` state.
- [ ] Field editor exposes label, type, options, required, maximum length, output behavior, repeat-row confirmation, and structural evidence. Moving a region selects another eligible structural node, never an arbitrary pixel rectangle.
- [ ] Add an “从 Word 导入” entry to the existing manage form page. After compilation, merge inferred fields into the OA builder through its existing update path and show which fields remain bound to Word anchors.
- [ ] Block publish/activation while conflicts or unresolved suggestions exist; offer explicit Confirm, Ignore, and Delete decisions with an undoable client draft until Save.
- [ ] Run the workbench test and existing OA builder/UI source tests; expect pass.
- [ ] Commit: `git add src/components/oa-documents src/app/forms/manage/[id]/document-template/page.tsx src/app/forms/manage/form-editor.tsx src/components/oa-forms/oa-form-builder.tsx scripts/test-oa-document-workbench-source.mjs && git commit -m "feat: add AIA Word annotation workbench"`.

## Task 8: Fill immutable Word templates safely

**Files:**

- Create: `src/lib/server/oa-word-fill.ts`
- Create: `src/lib/server/oa-word-export-data.ts`
- Create: `scripts/test-oa-word-fill.mjs`

- [ ] Write failing tests for scalar text, multiline breaks, numbers, dates, select labels, multi-choice marks, empty values, file display names, XML escaping, excessive-length rejection, deleted/missing fields, and malicious answer objects.
- [ ] Add repeat-row cases with merged cells and 0, 1, 3, and 100 submissions. Verify the entire prototype row is cloned so borders, widths, merges, and paragraph styles remain.
- [ ] Add a mixed-version batch case proving each submission uses `submission.documentTemplateVersionId`, not the form's active version.
- [ ] Run `node --test scripts/test-oa-word-fill.mjs`; expect missing filler failure.
- [ ] Implement answer normalization from the trusted submission snapshot. Fill SDTs through XML nodes, represent uploaded files only by authorized display name, and reject values beyond confirmed limits rather than truncating or shrinking text.
- [ ] Preserve unchanged OOXML entries byte-for-byte and assert their SHA-256 values in tests. For a template without a confirmed repeat row, return one document per submission; never invent an aggregate layout.
- [ ] Run the fill test; expect pass.
- [ ] Commit: `git add src/lib/server/oa-word-fill.ts src/lib/server/oa-word-export-data.ts scripts/test-oa-word-fill.mjs && git commit -m "feat: fill versioned OA Word templates"`.

## Task 9: Add authorized Word, Excel, ZIP, and PDF exports

**Files:**

- Create: `src/app/api/oa/forms/[formId]/exports/route.ts`
- Create: `src/app/api/oa/submissions/[submissionId]/document/route.ts`
- Create: `src/lib/server/oa-form-export.ts`
- Modify: `src/lib/server/simple-xlsx.ts`
- Modify: `src/components/oa-forms/oa-form-submissions-table.tsx`
- Modify: `src/app/forms/manage/form-editor.tsx`
- Create: `scripts/test-oa-document-export-route-source.mjs`
- Create: `scripts/test-simple-xlsx.mjs`

- [ ] Write failing authorization tests: a submitter can export only their own single submission; form owner/configured manager/super-admin can batch export; unrelated teachers and forged IDs are denied; selected IDs must all belong to the authorized form; batch size is capped at 100.
- [ ] Write failing output tests for single `.docx`, legacy `.doc` plus safety `.docx`, Word ZIP, CSV, generalized XLSX, confirmed repeat-row aggregate Word, and PDF derived from the filled Word. Assert content types, RFC 5987 filenames, `cache-control: no-store`, and capability errors.
- [ ] Generalize `buildSimpleXlsx(rows, metadata?)` so sheet name, title, and creator are configurable while existing academic-exchange callers retain their exact defaults.
- [ ] Implement server-side export DTO construction from Convex-authorized form, template version, and submission snapshots. Do not accept browser answers, fields, template URLs, or filenames.
- [ ] Reuse `buildSimpleZip` and the generalized XLSX builder. Convert to PDF/legacy `.doc` only after fill and only when `detectOfficeCapabilities()` reports all required fonts.
- [ ] Replace the submissions table's lone CSV button with an AIA-styled export menu: CSV, Excel, original-format Word, Word ZIP/aggregate Word when eligible, and PDF. Disabled entries state the exact missing-template/converter/font reason.
- [ ] Add the same single-document action to the submitter's submission detail page without exposing batch endpoints.
- [ ] Run `node --test scripts/test-oa-document-export-route-source.mjs scripts/test-simple-xlsx.mjs scripts/test-aia-oa-security-source.mjs`; expect pass.
- [ ] Commit: `git add src/app/api/oa/forms src/app/api/oa/submissions src/lib/server/oa-form-export.ts src/lib/server/simple-xlsx.ts src/components/oa-forms/oa-form-submissions-table.tsx src/app/forms/manage/form-editor.tsx scripts/test-oa-document-export-route-source.mjs scripts/test-simple-xlsx.mjs && git commit -m "feat: export OA submissions in original formats"`.

## Task 10: End-to-end document and visual verification

**Files:**

- Create: `scripts/verify-oa-word-template.mjs`
- Create: `docs/operations/oa-word-conversion.md`
- Modify: `documents/api.md`

- [ ] Document local-only configuration, font registration, LibreOffice health checks, object-retention rules, batch/conversion limits, capability messages, and recovery. State explicitly that migrations/conversion checks are manual and no Silverfish/production deployment is performed.
- [ ] Run all focused tests:

```bash
node --test \
  scripts/test-oa-word-template-domain.mjs \
  scripts/test-oa-word-template-backend-source.mjs \
  scripts/test-ooxml-package.mjs \
  scripts/test-oa-word-detection.mjs \
  scripts/test-office-capabilities.mjs \
  scripts/test-oa-word-routes-source.mjs \
  scripts/test-oa-word-compiler.mjs \
  scripts/test-oa-document-workbench-source.mjs \
  scripts/test-oa-word-fill.mjs \
  scripts/test-oa-document-export-route-source.mjs \
  scripts/test-simple-xlsx.mjs
```

- [ ] Run OA regression tests: `node --test scripts/test-oa-forms.mjs scripts/test-aia-oa-api-source.mjs scripts/test-aia-oa-security-source.mjs scripts/test-aia-oa-form-builder-source.mjs scripts/test-aia-oa-ui-source.mjs`; expect all pass.
- [ ] Run `npm run lint`; expect zero warnings. Run `npm run build` only with the local Convex environment and expect success; never add `--prod`.
- [ ] Run `node scripts/verify-oa-word-template.mjs --input '/absolute/path/to/附件-“人工智能+”典型案例报送书（含汇总表）.docx' --output-dir /tmp/oa-word-verification`; expect a detection report, compiled/fill artifacts, untouched-part hashes, and no unresolved security errors.
- [ ] Render the original, compiled short-value fill, long-value fill, and PDF through LibreOffice when available. Inspect all six pages, section orientation, table grids, typography warnings, hover/focus linkage, mobile layout, dark mode, keyboard flow, and screen-reader labels. Record missing-font limitations rather than accepting a low-fidelity PDF.
- [ ] Run `git diff --check` and `rg -n "TODO|TBD|FIXME|HACK|IMPLEMENT_ME" convex src scripts docs/operations documents/api.md`; expect no implementation placeholders in changed files.
- [ ] Commit: `git add scripts/verify-oa-word-template.mjs docs/operations/oa-word-conversion.md documents/api.md && git commit -m "docs: verify OA Word template workflow"`.

## Acceptance checklist

- [ ] `.docx` parses directly; `.doc` remains preserved and converts only through the isolated capability-gated adapter.
- [ ] No marker insertion is required; every inferred field is reviewable and uncertain/conflicting regions cannot publish silently.
- [ ] Hover/focus/click relationships and add/edit/move/delete/ignore/confirm actions work in an AIA-consistent annotation UI.
- [ ] Template versions and submission references are immutable; historical exports use the originally submitted version.
- [ ] Single and batch Word, CSV, generalized Excel, confirmed-row aggregate Word, and PDF exports obey authorization and capability gates.
- [ ] OOXML/ZIP attack cases, mixed-version exports, 100-row repeat output, full OA regression tests, lint, and local build pass.
- [ ] No production, Silverfish, or automatic migration/deployment command has run.
