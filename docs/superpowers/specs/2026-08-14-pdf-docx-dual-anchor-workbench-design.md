# PDF–DOCX Dual-Anchor Workbench Design

**Date:** 2026-08-14  
**Status:** Approved  
**Extends:** `2026-08-13-word-smart-form-design.md`

## Goal

Replace the current structural-list preview with a page-faithful annotation workbench. An administrator sees pages rendered from the uploaded Word document, reviews highlighted fillable regions, and can add, edit, move, resize, or delete fields. Every saved field must remain bound to a concrete writable location in the DOCX so submitted answers can be exported into the correct place in the original layout.

The PDF representation is for display and interaction only. DOCX export never uses PDF coordinates as a write target.

## Scope and success criteria

- Convert the immutable source or canonical working DOCX into PDF, then render each PDF page as the workbench background.
- Show translucent field highlights at their real page positions. Hover thickens the border; selection exposes Edit and Delete actions.
- Support drawing a new region, moving it, and resizing it with pointer and keyboard interaction.
- Persist two anchors for every confirmed field: a visual PDF anchor and a structural DOCX anchor.
- Refuse to save or compile a field that is not uniquely bound to a supported DOCX write target.
- Fill table fields into their cells, mark choice controls at their options, and insert narrative answers after the corresponding instruction paragraph while inheriting the document style.
- Export a filled `.docx`; converting that result back to PDF must demonstrate that the answer was written at the intended document location.

Publishing, deploying, or externally hosting the workbench is out of scope. The existing local application route remains the integration surface.

## Chosen architecture

Use a dual-anchor manifest and a server-generated preview bundle.

### Visual anchor

The visual anchor controls only presentation and interaction:

```ts
interface OADocumentVisualAnchor {
  page: number
  x: number
  y: number
  width: number
  height: number
  pageWidth: number
  pageHeight: number
  coordinateSpace: "normalized-pdf"
}
```

`x`, `y`, `width`, and `height` are normalized to `[0, 1]`, measured from the top-left of the unrotated PDF page. `pageWidth` and `pageHeight` record the source PDF point dimensions for validation and diagnostics. Zoom and responsive layout therefore do not alter stored coordinates.

### Structural anchor

The structural anchor remains the only export target:

```ts
interface OADocumentStructuralAnchor {
  partName: string
  path: string
  contextHash: string
  writeTarget: "table-cell" | "inline-run" | "paragraph-after" | "choice" | "repeat-row"
  styleSourcePath?: string
}
```

`partName`, `path`, and `contextHash` continue to identify and validate an OOXML node. `writeTarget` makes the insertion behavior explicit. `styleSourcePath` is recorded for inserted narrative content so the compiler can copy paragraph and run properties deterministically.

The confirmed `OADocumentAnchor` owns both structures. Suggestions may carry a visual anchor and a list of server-issued binding candidates while unresolved. A confirmed field has exactly one structural binding. Manifest syntax advances to version 2; version-1 manifests remain readable but require reanalysis before using the visual workbench.

## Preview bundle

Analysis produces one derived preview bundle using the existing `previewStorageId`:

```text
preview.zip
├── document.pdf
├── pages/page-001.png
├── pages/page-002.png
└── layout.json
```

The PNG pages are rendered from `document.pdf`, not independently from DOCX, so every overlay refers to the same layout that the user sees. `layout.json` contains page sizes, text boxes, table/grid geometry, writable-node candidates, conversion diagnostics, and hashes tying the bundle to the source and analyzer version.

The application exposes authenticated, no-store endpoints for preview metadata and individual page images. These routes authorize the form owner before resolving the stored bundle and never disclose storage identifiers or signed object URLs to the browser. The existing processing-access query needs a minimal projection of an authorized preview download URL; no schema or lifecycle-hook change is required.

## Analysis and PDF–OOXML mapping

1. Validate the upload and retain the source unchanged.
2. For `.doc`, create the existing canonical DOCX working copy. For `.docx`, use the validated source as the working copy.
3. Convert the working DOCX to PDF in the controlled LibreOffice and fontconfig environment.
4. Render PDF pages and extract PDF text boxes and vector/table geometry with configured Poppler tools.
5. Build an ordered OOXML layout index containing paragraphs, runs, table coordinates, labels, choices, styles, structural paths, and context hashes.
6. Match PDF objects to OOXML nodes using normalized text, document order, table row/cell order, and nearby labels. Matching is deterministic and scored; coordinates alone never identify an OOXML target.
7. Convert detected Word form regions into visual overlays and binding candidates.
8. Package the PDF, page images, and layout index; persist the version-2 manifest and preview bundle atomically.

### Binding rules

- **Blank table cells:** Match the PDF table grid and OOXML table/row/cell order. The write target replaces the cell body while retaining cell properties.
- **Label and underline blanks:** Match the adjacent label text, paragraph order, and blank run. The write target is an inline run or a paragraph append point.
- **Checkbox/radio groups:** Match option text and order; the write target marks the selected option rather than inserting free text.
- **Long narrative areas:** Match the instruction paragraph by normalized text and order. The visual region spans the intended blank area after that instruction. The structural target is `paragraph-after`, with paragraph and run style inherited from the instruction or its first compatible empty paragraph.
- **Repeated rows:** Match the complete table row and preserve the existing row-clone behavior.

The sample document’s page-4 sections, including “基本概况” and “主要做法”, use `paragraph-after`. The answer is inserted immediately after the corresponding instruction paragraph and uses the same font family, size, paragraph spacing, indentation, and line-height unless the original blank paragraph supplies more specific formatting.

## Manual annotation and rebinding

The preview layout index includes writable zones beyond automatically detected questions. When the administrator draws, moves, or resizes a rectangle, the client performs an immediate hit test for feedback, then the server resolves the rectangle against the immutable layout index.

- One valid candidate: bind it and allow save.
- Multiple valid candidates: show their nearby label and target type; the administrator must choose one.
- No valid candidate: show “未绑定 Word 位置” and disable field save and template compilation.

The browser submits the visual rectangle and a server-issued candidate ID. It does not submit an arbitrary OOXML part or path. The server reloads the candidate from the stored preview bundle, verifies the source/analyzer hashes, and writes the canonical structural locator into the persisted manifest.

Moving or resizing a confirmed overlay triggers rebinding when it leaves the tolerance area of its current writable zone. Deleting a field marks its suggestion deleted and removes its confirmed field and anchor. Undo is limited to the current unsaved editing session.

## Workbench interaction

The center column displays one page at a time on a neutral pasteboard with stable aspect ratio. It supports page navigation and zoom without changing stored coordinates.

- Highlights use the existing confidence colors and translucent fill.
- Hover increases border width without changing layout.
- Click selects the field and opens a compact floating Edit/Delete toolbar.
- The side inspector edits label, answer type, options, required state, maximum length, and output behavior. It always displays binding status and a human-readable Word target such as “表 1 / 第 2 行 / 第 3 列”.
- “框选新增” enters draw mode. Escape cancels; arrow keys move the selected overlay; modified arrow keys resize it.
- Drag and resize handles preserve a minimum accessible target size and clamp the region to its page.
- The annotation list and canvas remain bidirectionally synchronized.
- Deleted and ignored suggestions do not intercept pointer input on the page.

## Compilation and filling

Compilation continues to load the persisted manifest on the server and verify every context hash before editing OOXML.

- `table-cell`: replace child content but retain `w:tcPr`, then insert the field SDT.
- `inline-run`: replace or append at the confirmed run location.
- `paragraph-after`: create a sibling paragraph after the instruction, copy compatible `w:pPr` and `w:rPr`, and place a block SDT inside it. Do not append the answer to the instruction sentence itself.
- `choice`: tag the recognized option runs and fill them with the selected mark while preserving option text.
- `repeat-row`: retain the existing complete-row clone behavior.

Filling continues to address compiled SDTs by field ID. User answers, line breaks, and XML-special characters are escaped through XML APIs. The immutable source is never overwritten; each export is produced from the compiled copy associated with the submission’s template version.

## Capability and error handling

- Preview analysis requires configured LibreOffice, fonts, and the approved Poppler executables. Missing capabilities return a specific error and do not fall back to a fabricated structural preview.
- Font substitution, conversion failure, page-count mismatch, or materially changed page geometry blocks confirmation until the administrator re-runs analysis in a valid environment.
- An ambiguous rectangle stays unresolved; compilation is blocked.
- A source hash, preview-bundle hash, analyzer version, page size, structural path, or context-hash mismatch invalidates the affected binding and requires reanalysis.
- Page and bundle endpoints enforce the same form-owner or super-admin authorization as template management, validate page bounds, use no-store headers, and bound decompression and image sizes.
- Temporary conversion directories are unique per job and removed after success or failure. Conversion concurrency and timeouts remain bounded.

## Component boundaries

- **Preview generator:** DOCX-to-PDF conversion, page rendering, PDF layout extraction, and bundle creation.
- **OOXML layout indexer:** produces writable structural candidates without presentation concerns.
- **Layout matcher:** maps PDF geometry to OOXML candidates and reports confidence/ambiguity.
- **Preview repository/API:** retrieves authenticated bundle metadata and page images.
- **Canvas:** renders page images and overlays; owns pointer and keyboard geometry interactions.
- **Binding inspector:** resolves candidate selection and field properties.
- **Manifest editor:** applies atomic field/suggestion/anchor updates and validation.
- **Compiler/filler:** transforms only confirmed structural targets and exports DOCX.

Each boundary has serializable inputs and outputs so mapping and compilation can be tested without rendering React, and canvas geometry can be tested without opening Word files.

## Verification

Use the supplied six-page “人工智能+” case-report DOCX as the main integration fixture, with sensitive content kept local and excluded from source control.

- Unit-test normalized coordinate conversion, page rotation handling, hit testing, clamping, overlap scoring, and candidate ambiguity.
- Unit-test PDF text normalization and OOXML paragraph/table/choice matching.
- Verify every confirmed field has one valid visual anchor and one valid structural anchor.
- Exercise hover, click, Edit/Delete, draw, drag, resize, zoom, page navigation, keyboard movement, keyboard resize, and screen-reader names.
- Confirm table-cell fields fill the intended cells and choices mark the intended options.
- Confirm page-4 narrative answers are inserted after “基本概况”, “主要做法”, and related instructions with inherited formatting.
- Compile and fill the fixture, reopen its OOXML to verify SDT paths and styles, convert the filled DOCX back to PDF, and compare page geometry and annotated locations.
- Verify untouched OOXML parts retain their hashes where possible.
- Test missing LibreOffice, missing Poppler, missing fonts, conversion timeout, corrupt bundle, source/hash drift, ambiguous manual regions, unauthorized page access, oversized page requests, and malformed candidate IDs.
- Run the repository lint and build gates plus focused server and component tests. The repository currently has no global test script, so focused tests use its existing Node test conventions directly.

## Rollout and compatibility

The workbench consumes version-2 manifests only. Existing version-1 templates continue exporting through the current structural compiler but show a “重新分析以启用文档画布” prompt when opened for editing. Reanalysis creates a new immutable template version; it does not mutate historical submissions or active compiled versions.

## Out of scope

- Writing answers into PDF coordinates or exporting a filled PDF as the source of truth.
- Arbitrary free-position fields that have no writable Word target.
- Perfectly preserving pagination for unbounded answer lengths.
- OCR for scanned/image-only Word documents in this iteration.
- Collaborative multi-user editing of one annotation session.
- Publishing or deploying the application.
