# XLSX First Form Import Design

## Goal

Allow a teacher or super administrator to upload an `.xlsx` workbook, inspect automatically detected headers, and create either:

1. one repeatable multi-row table question; or
2. one ordinary form question per detected header.

Exports must preserve header order. Ordinary mode produces one Excel row per submission. Multi-row mode produces one Excel row per entered table row and repeats submission provenance columns.

## Approved Decisions

- XLSX import is added beside the existing Word-first import on the new-form page.
- The source workbook is analyzed but not persisted or overwritten.
- Only non-empty worksheets are offered. The first row containing at least two non-empty text cells is the detected header row.
- The user chooses a worksheet when more than one non-empty worksheet exists.
- The user reviews detected columns and chooses either multi-row or one-question-per-header mode before the draft is created.
- Imported forms remain creator-only drafts until the existing visibility, workflow, save, and publish steps are completed.
- Multi-row exports flatten every entered row and add `申请编号`, `申请人`, `学号`, and `提交时间` provenance columns.
- Ordinary exports use the existing one-submission-per-row export with the same provenance columns.
- No code or deployment is pushed to `silverfish`; local development remains connected to `bold-sandpiper-236`.

## Considered Approaches

### A. Bounded server-side OOXML parsing — selected

The browser streams the workbook once to an authenticated Next.js route. The server validates the ZIP/XLSX signature and content types, reads workbook relationships, shared strings, visible worksheets, and bounded header rows, then returns a sanitized header model. This reuses the existing bounded OOXML ZIP reader and keeps malformed or oversized workbooks away from client state.

### B. Browser-only parsing

This would avoid an API route, but it requires shipping another workbook parser to every browser and makes security and resource limits harder to enforce consistently. It is rejected.

### C. LibreOffice conversion to CSV

This would reuse the Office runtime but loses multi-sheet structure, merged-header information, and deterministic error boundaries. It is rejected.

## Architecture

### Spreadsheet domain model

`src/lib/oa-spreadsheet-import.ts` owns safe filename/MIME/signature validation, recognized sheet/column types, deterministic field IDs, header type inference, and draft creation. It has no server dependencies and is covered by direct unit tests.

Supported inferred types are `text`, `number`, and `date`. Phone, identifier, serial, and code-like headers stay text unless the header is an exact sequence/count label. Users may change types later in the existing form editor.

### Bounded XLSX reader

`src/lib/server/oa-xlsx-reader.ts` reads `.xlsx` as bounded OOXML through `readOoxmlPackage`. It validates the spreadsheet content type and internal workbook relationships, rejects external relationships and macros, parses shared and inline strings, respects sheet visibility, and inspects only bounded rows/cells.

Limits:

- source file: 10 MiB;
- ZIP limits inherited from the hardened OOXML reader;
- worksheets returned: 50;
- inspected rows per worksheet: 50;
- columns per header: 256;
- header text: 200 characters per cell;
- duplicate or blank headers are rejected until the administrator fixes the source workbook.

The first row with at least two non-empty cells is the header row. Completely empty worksheets are omitted. This sample resolves to `Sheet1!A1:H1` with eight headers; `Sheet2` and `Sheet3` are ignored.

### Analyze API

`POST /api/oa/spreadsheets/analyze` accepts the raw XLSX body with a bearer session token, encoded filename header, and spreadsheet MIME type. It reads the request body with a real streaming byte limit. The route verifies that the session belongs to a teacher or super administrator, invokes the bounded reader, and returns only sheet names, header row numbers, column indices, labels, inferred types, and safe IDs.

Errors are classified as 401 authentication, 403 role, 413 size, 422 invalid workbook/header, and 500 unexpected failure. Responses are private and `no-store`; raw XML, workbook bytes, paths, tokens, and relationship targets are never returned.

### Import UI

`OASpreadsheetNewFormImport` sits next to Word-first import. Its states are:

1. select `.xlsx`;
2. analyzing;
3. review detected worksheet and ordered headers;
4. choose `多行表格` or `每个表头一个问题`;
5. create creator-only draft and navigate to the existing form editor.

Multi-row mode creates one `table` field whose columns follow the selected header order. Ordinary mode creates one field per header. All generated fields are optional initially, because source spreadsheets do not express reliable requiredness. Administrators can edit labels, field types, placeholders, help text, and requiredness before publishing.

### Export behavior

The existing batch export remains the single download surface.

- Ordinary mode: provenance columns plus one column per imported question; one submission per output row.
- Multi-row mode: provenance and any scalar fields are repeated for each table row; table columns are expanded into their own ordered Excel columns.
- An empty multi-row answer produces no artificial data row.
- Spreadsheet cells are formula-injection safe using the existing XLSX writer behavior.

This export behavior is generalized for any form containing exactly one table field, not coupled to a specific uploaded filename.

## Data Flow

```text
XLSX file
  -> authenticated bounded analyze route
  -> sanitized sheets + ordered headers
  -> user selects sheet and mode
  -> existing OA form upsert creates a private draft
  -> administrator edits scope/workflow/fields and publishes
  -> users submit scalar answers or table rows
  -> existing batch Excel export emits one row per scalar submission or entered table row
```

## Testing

Tests are written before production code and must demonstrate red failures.

- XLSX domain tests: signature/MIME checks, deterministic IDs, type inference, both draft modes, duplicate headers.
- Reader tests: shared strings, inline strings, hidden and empty sheets, relationship safety, row/column/size limits, the supplied workbook.
- Route source contract: bearer authentication, streaming limit, private response, sanitized payload.
- Import UI source contract: `.xlsx` acceptance, worksheet review, both mode actions, existing draft upsert and navigation.
- Export tests: scalar one-row output, multi-row flattening across multiple submissions, provenance repetition, empty rows, formula-safe values.
- Full TypeScript, focused ESLint, `git diff --check`, and a real import/export smoke run using `新创刊意向征集表.xlsx`.

## Acceptance Criteria

- The supplied workbook detects exactly the eight ordered headers on `Sheet1` and ignores the two empty worksheets.
- Multi-row mode renders one editable table with eight columns and supports adding/removing rows.
- Ordinary mode renders eight independently editable questions in header order.
- A scalar submission exports as one row beneath the matching ordered headers and provenance columns.
- Two submissions containing two multi-row entries each export four data rows with correct provenance.
- No malformed workbook can exceed configured request, ZIP, XML, sheet, row, column, or text limits.
- Existing Word import, Word export, manual form creation, and generic form exports continue to pass their regression tests.
