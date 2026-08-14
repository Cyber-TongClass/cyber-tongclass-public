# Word Template Completeness and Export QA Implementation Plan

**Goal:** Add web-only field hints, recognize all supplied-template questions, and prove DOCX export uses `√` with correct typography and layout.

**Method:** Execute each task locally with test-driven development. Preserve the unrelated dirty files and do not deploy.

## Task 1: Web-only placeholder

- Add failing tests for document suggestion/manifest placeholder validation, review-edit persistence/clearing, client conversion, and field-editor wiring.
- Add optional bounded `placeholder` to the document domain and canonical review flow.
- Add a “提示文字” field to the document inspector.
- Assert detectors emit no placeholder from DOCX instruction text and compiler/filler output is unaffected.

## Task 2: Complete fixture detection

- Add reduced OOXML/PDF fixtures for instructional answer cells, grouped multi-paragraph choices, exact narrative sections, contextual contact labels, and related-materials file output.
- Index and match all logical writable targets without sample-filename special cases.
- Collapse a checkbox table cell into one multi-select suggestion and include every visible marker.
- Bind narrative answers after the instruction paragraph and reject prompt-text false positives.
- Extend the real smoke to require 25 applicant fields plus one repeat-row structure and report missing/extra targets.

## Task 3: Choice and style-safe export

- Add failing fill tests requiring selected `√` and unselected `□` while preserving marker run properties and option text.
- Update the filler and keep compiler validation fail-closed.
- Fill representative values across table-cell, text, textarea, file, choice, and repeated/duplicate positions.

## Task 4: Real operation and visual QA

- Run the complete supplied DOCX through analysis, review, compilation, filling, DOCX reopen, and PDF conversion.
- Render clean and filled DOCX/PDF outputs page by page.
- Inspect every page for missed fields, wrong locations, font substitutions, clipping, overlap, broken borders, changed option text, and page-geometry drift.
- Exercise the local workbench where the configured backend permits it; otherwise exercise the same authenticated route/domain/controller pipeline locally and record the environment gate without weakening security.

## Task 5: Final verification

- Run all focused Word/document tests, TypeScript, ESLint, diff checks, and the real-fixture smoke.
- Review the feature diff for security and regressions.
- Commit only owned feature files; leave unrelated dirty files untouched.
- Deliver the coverage count, selected choices, typography/layout findings, artifact paths, and any genuine remaining environment limitation.
