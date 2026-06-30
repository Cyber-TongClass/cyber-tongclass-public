# Academic Exchange PDF Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let academic-exchange reimbursement applications attach a paper PDF either by external direct PDF URL or by uploading a PDF, reusing the existing reimbursement upload pattern without splitting the reimbursement platform.

**Architecture:** Add upload metadata to academic-exchange applications and expose authenticated Convex upload/query functions through `src/lib/api.ts`. The application form lets users choose URL or upload; PDF export resolves uploaded PDFs first and falls back to URLs for existing records. Shared client utilities/components keep the TechDay and academic-exchange reimbursement UIs aligned where they overlap.

**Tech Stack:** Next.js App Router, React client components, Convex storage/functions, pdf-lib, built-in Node test runner for targeted helper tests, TypeScript.

---

### File map

- Modify `/Users/photonyan/Desktop/cyber-tongclass-public/convex/schema.ts` to add optional uploaded-paper PDF metadata to `academicExchangeSupportApplications`.
- Modify `/Users/photonyan/Desktop/cyber-tongclass-public/convex/academicExchange.ts` to add upload URL generation, uploaded-paper URL lookup, and create-time validation/storage of upload metadata.
- Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/api.ts` to expose academic-exchange upload hooks; components still call hooks, not raw Convex.
- Create `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/academic-exchange-pdf-source.ts` for shared PDF source labels and upload metadata validation.
- Create `/Users/photonyan/Desktop/cyber-tongclass-public/src/components/reimbursements/reimbursement-expense-items.tsx` for shared expense item entry.
- Create `/Users/photonyan/Desktop/cyber-tongclass-public/src/components/reimbursements/reimbursement-file-upload-field.tsx` for shared file input validation/display.
- Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/intranet/reimbursements/academic-exchange/new/page.tsx` to use shared components and submit uploaded PDF metadata.
- Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/intranet/reimbursements/academic-exchange/[id]/page.tsx` and reviewer detail/list views to display uploaded PDF source names.
- Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/server/academic-exchange-pdf.ts` to accept uploaded PDF bytes and append them before falling back to URL fetch.
- Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/api/intranet/academic-exchange/[id]/pdf/route.ts`, `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/api/reviewer/academic-exchange/[id]/pdf/route.ts`, and `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/api/reviewer/academic-exchange/export/route.ts` to resolve uploaded Convex storage URLs before PDF generation.
- Test with `/Users/photonyan/Desktop/cyber-tongclass-public/scripts/test-academic-exchange-pdf-source.mjs`.

### Task 1: Shared PDF source helper with TDD

- [ ] Create `/Users/photonyan/Desktop/cyber-tongclass-public/scripts/test-academic-exchange-pdf-source.mjs` first. It imports `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/academic-exchange-pdf-source.ts` via TypeScript transpilation and asserts: PDF metadata accepts `.pdf` with `application/pdf`; rejects non-PDF extensions; rejects files over 30 MB; source label prefers uploaded filename over URL.
- [ ] Run `node --test scripts/test-academic-exchange-pdf-source.mjs`. Expected before implementation: FAIL because `src/lib/academic-exchange-pdf-source.ts` is missing.
- [ ] Create `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/academic-exchange-pdf-source.ts` with `MAX_ACADEMIC_EXCHANGE_PAPER_PDF_BYTES`, `validateAcademicExchangePaperPdfUpload`, `hasUploadedAcademicExchangePaperPdf`, `hasAcademicExchangePaperPdfAttachment`, and `getAcademicExchangePaperPdfLabel`.
- [ ] Run `node --test scripts/test-academic-exchange-pdf-source.mjs`. Expected after implementation: PASS.

### Task 2: Convex data model and API wrappers

- [ ] Modify `/Users/photonyan/Desktop/cyber-tongclass-public/convex/schema.ts` so `academicExchangeSupportApplications` has optional `paperPdfSource`, `paperPdfStorageId`, `paperPdfFileName`, `paperPdfMimeType`, and `paperPdfSize`.
- [ ] Modify `/Users/photonyan/Desktop/cyber-tongclass-public/convex/academicExchange.ts` to add `generateUploadUrl` authenticated by TongClass session, add `getPaperPdfUrl` authorized for the owner or reviewer, and extend `createApplication` to accept and validate uploaded PDF metadata.
- [ ] Validation in `createApplication`: non-出境访学 applications must have either a valid `paperPdfUrl` or a valid upload metadata set. Uploaded metadata must use `.pdf`, MIME `application/pdf` or `application/octet-stream`, positive size, and size <= 30 MB. Store `paperPdfSource: "upload"` when an upload is present, otherwise `"url"` for URL-backed records.
- [ ] Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/api.ts` to add `generateAcademicExchangeUploadUrlRef`, `getAcademicExchangePaperPdfUrlRef`, `useGenerateAcademicExchangeUploadUrl`, and `useAcademicExchangePaperPdfUrl`.
- [ ] Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/types/index.ts` to add the new optional fields to `AcademicExchangeSupportApplication`.

### Task 3: Shared reimbursement UI pieces and new form behavior

- [ ] Create `/Users/photonyan/Desktop/cyber-tongclass-public/src/components/reimbursements/reimbursement-expense-items.tsx` by moving the expense row UI and total calculation pattern out of the academic-exchange page. It accepts rows, update/remove/add callbacks, and the formatted total as props.
- [ ] Create `/Users/photonyan/Desktop/cyber-tongclass-public/src/components/reimbursements/reimbursement-file-upload-field.tsx` for reusable file input display and validation messaging. It accepts PDF/images for TechDay usage and PDF-only options for academic exchange.
- [ ] Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/app/intranet/reimbursements/academic-exchange/new/page.tsx`: add `paperPdfSource` state, upload file state, radio/select controls for URL vs upload, shared expense component, PDF-only file field, and create-time upload to Convex storage before calling `createApplication`.
- [ ] Preserve existing behavior for `出境访学`: paper section stays hidden and submit does not require URL/upload.
- [ ] Keep the TechDay reimbursement page on the same platform; if practical, switch its file input to the shared `ReimbursementFileUploadField` without changing its Convex backend or routes.

### Task 4: PDF export resolves uploaded PDFs first

- [ ] Modify `/Users/photonyan/Desktop/cyber-tongclass-public/src/lib/server/academic-exchange-pdf.ts` so `buildAcademicExchangePdf(application, { paperPdfBytes })` uses uploaded bytes when present; if no uploaded bytes are provided it falls back to fetching `application.paperPdfUrl` for old URL-backed records.
- [ ] Update the generated form’s paper detail text to display the uploaded filename when the paper PDF came from upload.
- [ ] Add a route-local helper in the intranet and reviewer PDF/export routes to call `academicExchange:getPaperPdfUrl`, fetch the storage URL as PDF bytes, and pass those bytes into `buildAcademicExchangePdf`.
- [ ] Preserve reviewer audit logging behavior for single and batch downloads.

### Task 5: Detail/list display and verification

- [ ] Modify intranet/reviewer detail pages to show “论文 PDF 来源” as either uploaded filename or external link.
- [ ] Optionally show a storage-backed “查看上传 PDF” link via `useAcademicExchangePaperPdfUrl` on the intranet detail page.
- [ ] Run `node --test scripts/test-academic-exchange-pdf-source.mjs`; expected PASS.
- [ ] Run `npx tsc --noEmit --incremental false`; expected no TypeScript errors.
- [ ] Run `npm run lint`; expected currently blocked by the pre-existing ESLint 9 `.eslintrc.json` JSON import-attribute issue unless tooling is separately fixed.
