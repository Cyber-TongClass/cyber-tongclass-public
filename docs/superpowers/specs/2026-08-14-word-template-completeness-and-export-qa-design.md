# Word Template Completeness and Export QA Design

**Date:** 2026-08-14
**Status:** Approved by continuation instruction
**Extends:** `2026-08-14-pdf-docx-dual-anchor-workbench-design.md`

## Goal

Finish the supplied Word-template workflow as a usable end-to-end feature: administrators can add a web-only input hint, the analyzer finds every applicant-facing writable location without treating document instructions as hints, and exported DOCX files use a check mark for selected choices while retaining the template's typography and layout.

## Manual input hint

Add an optional `placeholder` property to document suggestions and manifest fields. It is editable only in the field inspector and is copied into the generated OA form field so an empty text input shows muted guidance.

- DOCX analysis never populates `placeholder`, even when an answer cell contains instructional text.
- Placeholder text is browser-only metadata. Compilation and DOCX filling ignore it.
- The review endpoint accepts a bounded, validated placeholder and persists it through the canonical manifest rebuild.
- Clearing the editor removes the placeholder.

For the sample's “案例简介” cell, the sentence beginning “简述基本概况……” remains part of the source document and identifies the writable cell, but is not copied into the web placeholder. When an answer is exported, it replaces that instructional cell content at the confirmed structural target.

## Complete question model for the supplied fixture

The analyzer must expose 25 applicant-facing writable positions, plus the page-6 repeat-row aggregation structure:

| Page | Writable positions | Count |
|---|---|---:|
| 1 | 案例名称（封面）、申报单位 | 2 |
| 2 | 案例名称（信息表）、方向（one multi-select group containing every visible option） | 2 |
| 3 | 案例简介; reporting/lead-unit basic information (8); joint implementation unit information (7) | 16 |
| 4 | 基本概况、主要做法、应用成效、创新点 | 4 |
| 5 | 相关佐证材料 | 1 |
| 6 | 汇总表 repeat-row output, not an applicant question | +1 system structure |

Duplicate labels in different writable positions remain separate fields, because each needs its own DOCX structural anchor. Contextual table labels distinguish repeated “职务/联系方式” fields. The smoke fixture may assign the same answer to both case-name positions.

### Detection rules

- A label cell followed by a blank or bounded instructional answer cell becomes a table-cell field. The instruction may guide matching but never becomes `placeholder`.
- A table cell containing several checkbox paragraphs becomes one choice field. Every marker, including a single trailing “其他”, is an option in document order.
- Page-4 headings are matched exactly. Their answer target is after the corresponding instruction paragraph, not between the heading and instruction.
- “相关佐证材料” becomes a file field written after its instruction paragraph as authorized display names.
- Summary-table blank rows remain repeat-row output and do not inflate the applicant-question count.
- Ambiguous or unbound targets remain unresolved; the analyzer must not fabricate a structural anchor.

## Choice export

A selected option is filled with `√`; an unselected option is `□`. Only the original marker run is changed. The option text, run properties, paragraph properties, table layout, and surrounding content remain unchanged. Choice compilation validates visible option text and order before tagging the marker runs.

## Layout and typography acceptance

For the supplied six-page fixture:

- Compiled and filled DOCX reopen as valid OOXML.
- All 25 applicant positions have exactly one writable DOCX target and one visual anchor after review; the repeat row remains separately valid.
- Page-4 narrative answers occur after their instruction paragraphs and inherit compatible paragraph/run properties.
- Selected choice markers render as visible `√` at the original marker locations; no answer overlays labels, option text, borders, or adjacent cells.
- Unchanged option text and nearby runs retain their original `w:rPr`; narrative answer runs copy the intended source style.
- Rendering the output checks every page at 100% and records page count, page geometry, fonts, and visual screenshots.

## Verification layers

1. Domain/UI tests for placeholder persistence, clearing, rendering, bounds, and non-autodetection.
2. Detector/index/matcher/compiler tests for instructional cells, grouped choices, exact narratives, file fields, and contextual table labels.
3. Filler tests for `√`/`□`, option text preservation, and run-style preservation.
4. A real-fixture smoke that analyzes every position, builds a reviewed manifest, compiles and fills representative values for every field type, converts back to PDF, and emits a machine-readable coverage report.
5. Visual inspection of every clean and filled page image, with structural assertions for answer order, fonts, and non-overlap.

## Out of scope

- Automatically deriving web placeholders from Word content.
- Treating the page-6 aggregation table as an applicant questionnaire page.
- Guaranteeing unchanged pagination for arbitrarily long answers; QA uses bounded representative answers.
- Publishing or deploying the application.
