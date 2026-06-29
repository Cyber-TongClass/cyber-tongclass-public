# Reimbursement Table Configuration Design

## Summary

The intranet reimbursement materials experience will replace selected downloadable spreadsheet-style resources with HTML table pages. Admins will manage those tables in the existing admin backend, and students will open “查看表单” to read the latest published table in the browser.

## Scope

This feature covers the academic exchange reimbursement materials currently shown in the intranet materials page and the academic exchange reimbursement page. It preserves downloadable policy files such as PDFs and DOCX files, but converts table-like reimbursement standards, especially “各国住宿伙食公杂费开支标准”, into a dynamic web table. The feature includes Convex persistence, admin management UI, student-facing list cards, and a student-facing table detail page.

## Data Model

Add a Convex table named `reimbursementMaterialTables`. Each record stores `slug`, `title`, `description`, `category`, `columns`, `rows`, `isPublished`, `createdBy`, `createdAt`, and `updatedAt`. Columns are ordered objects with `id`, `label`, and optional `width`. Rows are ordered objects with `id` and a `cells` array. Cell values are strings to keep the first version simple and compatible with existing spreadsheet-like content.

The `slug` provides stable student URLs such as `/intranet/reimbursements/tables/living-expense-standards`. The public query returns only published records. Admin queries and mutations require a Tong Class session token belonging to an `admin` or `super_admin` user.

## Student Experience

In the academic exchange reimbursement page, table resources render as elevated “查看表单” cards instead of download anchors. The card links to a table detail page with a title, description, last updated time, search input, and responsive table. The table supports client-side search across all visible cells and horizontal scrolling on small screens. Existing file downloads remain available for non-table policy materials.

The intranet materials page uses the same table metadata so students see consistent actions: file materials show “下载文件”, and table materials show “查看表单”. If the table query is still loading, the page shows a loading row or neutral loading state rather than a broken link. If a table is unpublished or missing, the detail page shows a clear empty/error state with a link back to materials.

## Admin Experience

Add `/admin/reimbursements/tables` to the admin backend and sidebar. Admins see a list of configured tables and an editor on the same page. The editor allows changing title, slug, description, category, published status, columns, and rows. Admins can add/remove columns, add/remove rows, edit cell values inline, and save changes. The UI uses existing shadcn-style primitives and a restrained product interface: familiar form controls, clear table grid, modest accent color, and no decorative motion.

The first version optimizes for straightforward structured editing rather than spreadsheet parity. It does not implement cell formulas, Excel import/export, column type validation, row drag-and-drop, or audit logs.

## Backend Behavior

The Convex module exposes public list/get queries for published material tables and admin list/upsert/remove mutations behind session-token role checks. Upsert is idempotent by slug: if a record with the slug exists, it is patched; otherwise a new record is inserted. This satisfies the repository rule that batch-style data mutation must avoid blind duplicate inserts.

Provide a seed mutation for the default “各国住宿伙食公杂费开支标准” table. The seed mutation also checks by slug before inserting and is manually triggerable only; it is not connected to build, dev, start, or package lifecycle scripts.

## Client API

`src/lib/api.ts` gains wrapper hooks for public and admin reimbursement material table operations. Components use these hooks rather than calling raw generated Convex APIs directly. Shared TypeScript types for table records, columns, rows, and editable form state live outside component files to avoid duplicated shape definitions.

## Verification

Because this repository has no test suite, implementation verification will use focused standalone scripts for pure table helpers, `npm run lint`, and `npx convex codegen`. A full `npm run build` may be run if the local Convex configuration is available and safe. No command will use `--prod`, `--force`, or `--legacy-peer-deps`.
