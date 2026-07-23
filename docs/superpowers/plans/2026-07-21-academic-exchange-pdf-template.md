# Academic Exchange PDF Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every academic-exchange support application with the supplied polished one-page form template while preserving data, attached papers, and all existing download routes.

**Architecture:** The server-side PDF builder loads an A4 blank template from `public/templates/`, overlays bounded application text with the existing embedded Chinese font, appends continuation pages only for expense overflow, and then copies any supplied paper-PDF pages. The route API remains unchanged because all consumers already call the one builder.

**Tech Stack:** Next.js Node runtime, `pdf-lib`, `fontkit`, Source Han Sans SC, Node.js assertions, esbuild, Poppler.

---

### Task 1: Define the executable export contract

**Files:**
- Create: `scripts/test-academic-exchange-pdf-template.mjs`
- Test: `scripts/test-academic-exchange-pdf-template.mjs`

- [ ] **Step 1: Write the failing test**

```js
assert.ok(fs.existsSync(templatePath), "The new PDF template must be deployed with the application")
const outboundPdf = await generator.buildAcademicExchangePdf(outboundApplication)
assert.equal((await PDFDocument.load(outboundPdf)).getPageCount(), 2)
assert.match(extractText(outboundPdf), /出境访学无需关联论文/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-academic-exchange-pdf-template.mjs`

Expected: failure because the template asset and template-based renderer do not exist.

### Task 2: Add the approved blank template

**Files:**
- Create: `public/templates/academic-exchange-application-form-template.pdf`
- Test: `scripts/test-academic-exchange-pdf-template.mjs`

- [ ] **Step 1: Copy the user-supplied one-page PDF without modification**

Place it at `public/templates/academic-exchange-application-form-template.pdf` so Docker copies it into the runtime image with all existing public assets.

- [ ] **Step 2: Run the test**

Run: `node scripts/test-academic-exchange-pdf-template.mjs`

Expected: failure advances to the renderer expectation, confirming the asset test is meaningful.

### Task 3: Replace the builder's first-page layout

**Files:**
- Modify: `src/lib/server/academic-exchange-pdf.ts`
- Test: `scripts/test-academic-exchange-pdf-template.mjs`

- [ ] **Step 1: Load the template and preserve the existing font/error behavior**

```ts
const templateBytes = await readFile(templatePath)
const pdfDoc = await PDFDocument.load(templateBytes)
pdfDoc.registerFontkit(fontkit)
const page = pdfDoc.getPage(0)
```

- [ ] **Step 2: Add bounded text helpers and the fixed field map**

Draw wrapped, font-fitted values only inside the blank cell bounds. Put a deterministic display identifier under the title; use `出境访学无需关联论文` and `附件材料：无` for no-paper applications.

- [ ] **Step 3: Preserve all expense items and append attached papers**

Render up to six expense rows on the template, create a `费用明细（续）` page only for remaining items, then append any provided paper-PDF pages exactly as the current builder does.

- [ ] **Step 4: Run the focused test**

Run: `node scripts/test-academic-exchange-pdf-template.mjs`

Expected: exit code 0; the test confirms outbound, paper-backed, overflow, and attachment flows.

### Task 4: Verify final appearance and regressions

**Files:**
- Verify: `src/lib/server/academic-exchange-pdf.ts`
- Verify: `public/templates/academic-exchange-application-form-template.pdf`
- Verify: `scripts/test-academic-exchange-pdf-template.mjs`
- Verify: `scripts/test-academic-exchange-pdf-source.mjs`

- [ ] **Step 1: Render a representative generated PDF to PNG**

Run: `pdftoppm -png tmp/pdfs/outbound-sample.pdf tmp/pdfs/outbound-sample`

Expected: the first page matches the supplied template's title, table geometry, hierarchy, and A4 margins with values inside their intended blank cells.

- [ ] **Step 2: Run the focused regression checks**

Run: `node scripts/test-academic-exchange-pdf-template.mjs && node --test scripts/test-academic-exchange-pdf-source.mjs`

Expected: all tests pass with no attempted network fetches.
