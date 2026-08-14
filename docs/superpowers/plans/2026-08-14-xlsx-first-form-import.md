# XLSX First Form Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a bounded `.xlsx` workbook into an OA draft as either one repeatable table question or one question per header, then export submissions as ordered spreadsheet rows.

**Architecture:** A pure client/server-neutral domain module validates XLSX metadata and converts sanitized headers into OA fields. A Node-only bounded OOXML reader analyzes workbook relationships, shared strings, visible sheets, and header rows behind an authenticated Next.js route. The existing OA form renderer/upsert flow stores the generated draft, while the existing batch exporter gains deterministic flattening for one table field.

**Tech Stack:** Next.js App Router, React, TypeScript, Convex HTTP session lookup, bounded OOXML ZIP/XML parsing, Node test runner, esbuild test bundles, existing OA form/table components.

---

### Task 1: Spreadsheet import domain

**Files:**
- Create: `src/lib/oa-spreadsheet-import.ts`
- Create: `scripts/test-oa-spreadsheet-import.mjs`

- [ ] **Step 1: Write failing domain tests**

Cover safe `.xlsx` filename/MIME/signature validation, deterministic column IDs, duplicate-header rejection, type inference, creator-only drafts, and both import modes. The test API is:

```js
assert.equal(importer.normalizeSpreadsheetSource(XLSX_MIME, "form.xlsx", Buffer.from("504b0304", "hex")), "xlsx")
assert.deepEqual(importer.inferSpreadsheetColumnType("拟创刊时间"), "date")
assert.deepEqual(importer.inferSpreadsheetColumnType("联系电话"), "text")

const columns = importer.normalizeSpreadsheetHeaders(["序号", "拟创办期刊名称", "主编"])
const scalar = importer.createSpreadsheetImportDraftPayload("新创刊意向征集表.xlsx", "creator_1", "nonce_1", "Sheet1", columns, "fields")
assert.deepEqual(scalar.fields.map(({ label, type }) => [label, type]), [["序号", "number"], ["拟创办期刊名称", "text"], ["主编", "text"]])

const table = importer.createSpreadsheetImportDraftPayload("新创刊意向征集表.xlsx", "creator_1", "nonce_1", "Sheet1", columns, "table")
assert.equal(table.fields.length, 1)
assert.equal(table.fields[0].type, "table")
assert.deepEqual(table.fields[0].columns.map(({ label }) => label), ["序号", "拟创办期刊名称", "主编"])
assert.deepEqual(table.targetScope, { userIds: ["creator_1"] })
```

- [ ] **Step 2: Run the domain test and verify RED**

Run: `node --test scripts/test-oa-spreadsheet-import.mjs`

Expected: FAIL because `src/lib/oa-spreadsheet-import.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure domain module**

Export these stable contracts:

```ts
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
export const OA_SPREADSHEET_LIMITS = { maxSourceBytes: 10 * 1024 * 1024, maxSheets: 50, maxRows: 50, maxColumns: 256, maxHeaderChars: 200 }
export type OASpreadsheetImportMode = "table" | "fields"
export type OASpreadsheetColumn = { id: string; columnIndex: number; label: string; type: "text" | "number" | "date" }
export type OASpreadsheetSheet = { name: string; headerRow: number; columns: OASpreadsheetColumn[] }

export function normalizeSpreadsheetSource(mimeType: string, fileName: string, bytes: Uint8Array): "xlsx"
export function assertSpreadsheetSourceSize(size: number): void
export function inferSpreadsheetColumnType(label: string): OASpreadsheetColumn["type"]
export function normalizeSpreadsheetHeaders(labels: string[]): OASpreadsheetColumn[]
export function createSpreadsheetImportDraftPayload(
  fileName: string,
  creatorId: string,
  nonce: string,
  sheetName: string,
  columns: OASpreadsheetColumn[],
  mode: OASpreadsheetImportMode,
): OAFormUpsertPayload
```

Use `xlsx_<one-based-column>_<slug>` field IDs, preserve header order, mark generated fields optional, set the title from the filename, set `status: "draft"`, and set `targetScope: { userIds: [creatorId] }`.

- [ ] **Step 4: Run the domain test and verify GREEN**

Run: `node --test scripts/test-oa-spreadsheet-import.mjs`

Expected: all domain tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/oa-spreadsheet-import.ts scripts/test-oa-spreadsheet-import.mjs
git commit -m "feat: model XLSX form imports"
```

### Task 2: Bounded XLSX header reader

**Files:**
- Create: `src/lib/server/oa-xlsx-reader.ts`
- Modify: `scripts/test-oa-spreadsheet-import.mjs`

- [ ] **Step 1: Add failing reader tests with real OOXML packages**

Build fixtures with `buildSimpleZip` containing `[Content_Types].xml`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/sharedStrings.xml`, and worksheet parts. Cover:

```js
const analyzed = reader.analyzeXlsxHeaders(validWorkbook)
assert.deepEqual(analyzed.sheets, [{
  name: "Sheet1",
  headerRow: 1,
  columns: [
    { id: "xlsx_1_xu_hao", columnIndex: 1, label: "序号", type: "number" },
    { id: "xlsx_2_ni_chuang_ban_qi_kan_ming_cheng", columnIndex: 2, label: "拟创办期刊名称", type: "text" },
  ],
}])
```

Also assert that hidden and empty sheets are omitted; inline strings work without `sharedStrings.xml`; external relationships, macro-enabled content, duplicate headers, more than 256 columns, and more than 50 returned sheets fail closed.

- [ ] **Step 2: Run the reader tests and verify RED**

Run: `node --test scripts/test-oa-spreadsheet-import.mjs`

Expected: FAIL because `analyzeXlsxHeaders` is missing.

- [ ] **Step 3: Implement bounded OOXML parsing**

Use `readOoxmlPackage(bytes, limits)` and `@xmldom/xmldom` without filesystem extraction. Resolve worksheet targets only through internal workbook relationships. Decode cell references and shared/inline strings, reject formulas in candidate header cells, and scan only the configured first 50 rows and 256 columns. Return:

```ts
export function analyzeXlsxHeaders(bytes: Uint8Array | Buffer): { sheets: OASpreadsheetSheet[] }
```

Reject workbooks with no usable sheet, duplicate normalized headers, blank headers between the first and last detected header cell, external relationships, VBA content types, invalid XML, or out-of-budget XML.

- [ ] **Step 4: Run reader and regression tests**

Run: `node --test scripts/test-oa-spreadsheet-import.mjs scripts/test-oa-word-template-domain.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/server/oa-xlsx-reader.ts scripts/test-oa-spreadsheet-import.mjs
git commit -m "feat: analyze bounded XLSX headers"
```

### Task 3: Authenticated analyze route

**Files:**
- Create: `src/app/api/oa/spreadsheets/analyze/route.ts`
- Modify: `scripts/test-oa-spreadsheet-import.mjs`

- [ ] **Step 1: Add failing route contract tests**

Assert the route source includes bearer authentication, `auth:currentUserBySession`, teacher/super-admin authorization, streaming byte counting, `cache-control: private, no-store`, encoded filename decoding, XLSX MIME/signature validation, and the sanitized `{ ok, fileName, sheets }` response. Assert it never returns XML, relationship targets, tokens, filesystem paths, or workbook bytes.

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/test-oa-spreadsheet-import.mjs`

Expected: FAIL because the route is missing.

- [ ] **Step 3: Implement the route**

Use a local `readBoundedBytes(request, OA_SPREADSHEET_LIMITS.maxSourceBytes)` that checks both `Content-Length` and every stream chunk. Authenticate via:

```ts
const currentUserBySessionRef = makeFunctionReference<"query">("auth:currentUserBySession")
const user = await getConvexHttpClient().query(currentUserBySessionRef, { sessionToken }) as null | { role?: string; identityType?: string }
const allowed = user?.role === "super_admin" || user?.identityType === "teacher"
```

Return explicit 401, 403, 413, 422, and generic 500 JSON responses with private no-store headers. Decode `x-oa-file-name` with `decodeURIComponent`, normalize the source, analyze headers, and return sanitized data only.

- [ ] **Step 4: Run route and type checks**

Run: `node --test scripts/test-oa-spreadsheet-import.mjs && npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/app/api/oa/spreadsheets/analyze/route.ts scripts/test-oa-spreadsheet-import.mjs
git commit -m "feat: expose authenticated XLSX analysis"
```

### Task 4: XLSX-first import UI

**Files:**
- Create: `src/components/oa-spreadsheets/oa-spreadsheet-new-form-import.tsx`
- Modify: `src/app/forms/manage/form-editor.tsx`
- Create: `scripts/test-oa-spreadsheet-import-source.mjs`

- [ ] **Step 1: Write failing UI source-contract tests**

Assert that the component accepts only `.xlsx`, calls `/api/oa/spreadsheets/analyze` with the bearer token and raw file body, renders a sheet selector and ordered header preview, exposes buttons named `生成多行表格` and `每个表头生成一个问题`, calls `createSpreadsheetImportDraftPayload`, upserts the creator-only draft, and navigates to `/forms/manage/<id>`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/test-oa-spreadsheet-import-source.mjs`

Expected: FAIL because the component and editor integration are missing.

- [ ] **Step 3: Implement the client state machine**

Create states `idle | analyzing | reviewed | creating`. Reject invalid size/type before fetch. After analysis, default to the first returned sheet, preserve returned column order, and show inferred types. The two action buttons call:

```ts
const formId = String(await upsertForm(createSpreadsheetImportDraftPayload(
  file.name,
  creatorId,
  `${Date.now().toString(36)}-${crypto.randomUUID()}`,
  selectedSheet.name,
  selectedSheet.columns,
  mode,
)))
router.push(`/forms/manage/${formId}`)
```

Integrate the component below Word-first import with an `EXCEL FIRST` heading and explain both modes. Keep manual creation below both import paths.

- [ ] **Step 4: Run UI, form, and type checks**

Run: `node --test scripts/test-oa-spreadsheet-import-source.mjs scripts/test-oa-document-workbench-source.mjs && npx tsc --noEmit --incremental false`

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/components/oa-spreadsheets/oa-spreadsheet-new-form-import.tsx src/app/forms/manage/form-editor.tsx scripts/test-oa-spreadsheet-import-source.mjs
git commit -m "feat: create OA drafts from XLSX headers"
```

### Task 5: Flatten multi-row answers into Excel rows

**Files:**
- Modify: `src/lib/server/oa-form-export.ts`
- Create: `scripts/test-oa-spreadsheet-export.mjs`

- [ ] **Step 1: Write failing export tests**

Create two authorized submissions with one table field and two table rows each. Assert:

```js
const table = exports.buildAuthorizedTable(accesses)
assert.deepEqual(table.header, ["申请编号", "申请人", "学号", "提交时间", "序号", "拟创办期刊名称", "主编"])
assert.equal(table.rows.length, 4)
assert.deepEqual(table.rows.map((row) => row.slice(-3)), [
  ["1", "期刊甲", "张老师"],
  ["2", "期刊乙", "李老师"],
  ["1", "期刊丙", "王老师"],
  ["2", "期刊丁", "赵老师"],
])
```

Also assert scalar-only forms remain one submission per row, scalar fields repeat beside every flattened table row, empty table answers create zero data rows, and formula-like values receive the existing safe XLSX treatment.

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/test-oa-spreadsheet-export.mjs`

Expected: FAIL because table answers are currently serialized as an empty cell instead of flattened.

- [ ] **Step 3: Implement deterministic single-table flattening**

Extend `AuthorizedExportAccess.submission.formSnapshot.fields` to include `columns`. In `buildAuthorizedTable`, collect ordered fields from the immutable form snapshots. When exactly one field is `type: "table"` with columns, emit provenance, scalar-field, and table-column headers; then emit one output row for each valid answer-row object. Keep the current path unchanged for zero or multiple table fields.

- [ ] **Step 4: Run export regressions**

Run: `node --test scripts/test-oa-spreadsheet-export.mjs scripts/test-oa-word-fill.mjs scripts/test-oa-word-template-domain.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/lib/server/oa-form-export.ts scripts/test-oa-spreadsheet-export.mjs
git commit -m "feat: flatten OA table answers in Excel exports"
```

### Task 6: Real fixture audit and final verification

**Files:**
- Create: `scripts/audit-oa-xlsx-import.mjs`

- [ ] **Step 1: Write the real-fixture audit assertions**

The script accepts an input workbook and output directory, analyzes the source, creates both draft modes, generates representative scalar and multi-row export artifacts, re-reads the exported OOXML headers/rows, and asserts:

```js
assert.deepEqual(sheet.columns.map(({ label }) => label), ["序号", "拟创办期刊名称", "主编", "拟创刊时间", "期刊所属学科", "合作单位", "联系人", "电话"])
assert.equal(analysis.sheets.length, 1)
assert.equal(fieldDraft.fields.length, 8)
assert.equal(tableDraft.fields[0].columns.length, 8)
assert.equal(flattened.rows.length, 4)
```

- [ ] **Step 2: Run the supplied workbook audit**

Run:

```bash
node scripts/audit-oa-xlsx-import.mjs '/Users/photonyan/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_syvavq140iw211_3d37/temp/drag/新创刊意向征集表.xlsx' /tmp/oa-xlsx-final-audit
```

Expected: `ok: true`, one usable sheet, eight ordered headers, both draft modes valid, and four flattened sample rows.

- [ ] **Step 3: Run all focused quality gates**

```bash
node --test scripts/test-oa-spreadsheet-import.mjs scripts/test-oa-spreadsheet-import-source.mjs scripts/test-oa-spreadsheet-export.mjs scripts/test-oa-word-template-domain.mjs scripts/test-oa-word-fill.mjs scripts/test-oa-document-workbench-source.mjs
npx eslint src/lib/oa-spreadsheet-import.ts src/lib/server/oa-xlsx-reader.ts src/app/api/oa/spreadsheets/analyze/route.ts src/components/oa-spreadsheets/oa-spreadsheet-new-form-import.tsx src/app/forms/manage/form-editor.tsx src/lib/server/oa-form-export.ts scripts/test-oa-spreadsheet-import.mjs scripts/test-oa-spreadsheet-import-source.mjs scripts/test-oa-spreadsheet-export.mjs scripts/audit-oa-xlsx-import.mjs
npx tsc --noEmit --incremental false
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Verify local target and service**

Confirm `.env.local` contains `CONVEX_DEPLOYMENT=dev:bold-sandpiper-236` and `NEXT_PUBLIC_CONVEX_URL=https://bold-sandpiper-236.convex.cloud`. Confirm `http://localhost:3000/` responds with HTTP 200. No Convex source change or `--prod` deployment is required.

- [ ] **Step 5: Commit the audit harness and final integration**

```bash
git add scripts/audit-oa-xlsx-import.mjs
git commit -m "test: audit XLSX-first form imports"
```
