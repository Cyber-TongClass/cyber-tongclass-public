# Word Smart Form Import and Export Design

**Date:** 2026-08-13  
**Status:** Approved  
**Base:** `newnew`  

## Goal

Accept existing Word forms without requiring authors to insert placeholders, identify likely answer regions, let administrators confirm them directly on the document, generate an OA collection form, and export collected answers back into the original Word layout as Word, Excel, and PDF deliverables.

## Supported inputs

- `.docx`: parse directly as OOXML.
- `.doc`: preserve the original binary file and convert it in an isolated LibreOffice environment to a canonical internal `.docx` working copy.
- The system records conversion warnings and renders a review copy before the template can be published.
- For a `.doc` source, exports provide the filled `.doc`, a safety `.docx`, and PDF when the converter is available.

## Chosen approach

Use deterministic document-structure analysis plus a visual annotation workbench. Placeholders and native Word content controls remain supported as advanced fallbacks, not the normal authoring path.

Detection considers:

- Empty table cells next to labels.
- Underlined or leader-style blank runs.
- `label: blank` paragraph patterns.
- Checkbox/radio groups and their adjacent labels.
- Instruction text containing type or length hints.
- Repeated table headers and empty prototype rows.
- Existing SDTs, bookmarks, and recognized legacy placeholders.

No inferred field is published automatically. High-confidence suggestions start selected; low-confidence and conflicting suggestions require explicit confirmation.

## Annotation workbench

- Center canvas renders the actual document page with AIA-styled chrome.
- Detected answer regions use translucent highlights:
  - Green: high confidence.
  - Yellow: requires confirmation.
  - Red: conflict or conversion/layout risk.
- Hovering a highlight emphasizes its edge and the matching side annotation.
- Clicking opens the field editor for label, type, options, required state, length, and output behavior.
- Administrators can add a question by selecting a paragraph, run, or table cell; adjust a region; move it; or delete it.
- Page navigation shows detected and unresolved counts.
- The side panel explains the structural evidence for each suggestion.
- Visuals reuse existing AIA paper/ink/red/rule/serif/mono/square-control conventions.

## Compilation and versioning

- Confirmation creates an immutable template manifest that maps OA field IDs to specific document parts and structural anchors.
- Confirmed scalar regions are compiled into stable SDTs in the internal `.docx` copy.
- Original source, converted working copy, compiled template, hashes, warnings, and manifest are stored as an immutable template version.
- `oaForms` references the active template version.
- Each submission snapshot records the template version used at submit time.
- Replacing a template creates a new version and never changes historical exports.

## Form generation

- The manifest creates an OA form draft with inferred labels, types, options, required state, and maximum lengths.
- Administrators can edit the generated fields in the existing OA form builder.
- Publication is blocked until every unresolved document region is confirmed, ignored, or deleted.
- Submission validation enforces confirmed length limits; values are never silently truncated or shrunk.

## Word-first creation from the form editor

- The new-form editor keeps the ordinary manual builder, but places “从 Word 自动生成表单” above it so Word import is available before title, audience, or workflow configuration.
- Selecting a valid `.docx` or `.doc` creates a server-authorized draft whose temporary title comes from the source filename.
- The temporary draft contains one internal placeholder field only because persisted OA forms require at least one field. That placeholder is removed when reviewed Word fields are compiled.
- Until the owner changes the audience, the draft target scope contains only the creating account. It remains a draft and is never published automatically.
- The selected file is uploaded and analyzed immediately after draft creation, then the browser opens the existing document annotation workbench for the newly created template version.
- After the owner resolves document annotations and generates the form fields, the flow returns to the normal form editor to configure title, audience, approval workflow, and any additional manual fields.
- Publication continues to use the existing complete form and workflow validation; Word import does not bypass those checks.

## Filling and export

- Modify only XML parts containing confirmed anchors; preserve untouched parts byte-for-byte where possible.
- Use XML APIs, not string concatenation; convert line breaks to Word line breaks.
- Files are represented by authorized display names unless an explicit image-embedding field is configured later.
- A confirmed summary-row prototype clones the complete Word table row so borders, widths, merges, and paragraph styles remain intact.
- Without a confirmed repeat row, batch Word export produces one filled document per submission in a ZIP.
- Exports:
  - Single filled Word.
  - Selected submissions as Word ZIP.
  - CSV.
  - Excel summary using the existing XLSX builder generalized without breaking current callers.
  - One aggregated summary Word when a repeat row is confirmed.
  - PDF generated from the filled Word so there is one layout source.

## PDF and legacy DOC conversion

- Use a controlled LibreOffice/fontconfig conversion environment with the template fonts registered.
- If conversion capability or required fonts are unavailable, disable PDF/legacy-DOC output with a specific capability message. Never generate a knowingly low-fidelity substitute.
- Long content may legitimately change pagination; it must not clip or corrupt tables.
- Conversion reports expose missing fonts, page-orientation differences, and other material layout changes before publication.

## Data model

Add a versioned document-template record containing form ID, version, source and compiled storage references, source type, filename, MIME, size, SHA-256, syntax/compiler version, status, manifest, warnings, creator, and timestamps.

Add active-template references to forms and immutable template-version references to submission snapshots.

Use a dedicated storage purpose for form templates, separate from applicant attachments.

## Authorization and security

- Template upload and editing follow existing teacher/super-admin/form-owner rules.
- Single export is available to the submitting user and authorized managers; batch export requires form-owner, configured manager, or super-admin rights.
- Validate extension, MIME, ZIP signature, content types, and internal relationships.
- Reject encrypted archives, macros, OLE, external packages, unsafe external relationships, DTD/XXE, path traversal, duplicate entries, CRC failures, and ZIP bombs.
- Bound source size, extracted size, XML part size, entry count, compression ratio, batch size, and conversion concurrency.
- Export routes never trust browser-supplied answers, template URLs, or field definitions.
- Operational logs exclude answers, emails, proof files, and signed URLs.

## Verification

- Detection fixtures for tables, underlines, labels, checkboxes, instructions, repeat rows, existing SDTs, and ambiguous regions.
- Annotation interaction tests: hover linkage, select, edit, add, resize/move, delete, unresolved counts, keyboard operation, and screen-reader labels.
- `.doc` conversion tests with source preservation, warning reports, and both output formats.
- Fill tests for text, number, date, choice, multi-choice, multiline, empty value, XML escaping, and file display name.
- Repeat-row tests with merged cells and 0, 1, 3, and 100 rows.
- Versioning and mixed-version batch export tests.
- ZIP/OOXML attack matrix and cross-form authorization tests.
- Render original and short-value filled documents, inspect every page, compare section geometry and table grids, and verify untouched OOXML part hashes.
- Finish with lint, build, Word/LibreOffice smoke tests, and an integrated AIA visual/accessibility review.

## Out of scope

- Guaranteeing identical pagination for arbitrarily long answers.
- Automatically publishing uncertain inferred fields.
- Arbitrary embedded-file execution or macro preservation.
- Replacing Word with coordinate-based PDF form filling.
- Any production or silverfish deployment.
