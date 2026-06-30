# OA Form Builder Design

## Summary

Build a generic OA form publishing system for Tong Class intranet. Administrators can assemble reusable form components, publish a form to a stable page, members can submit responses with file attachments, and administrators can review submissions. Phase B delivers the core publish/submit/review loop. Phase C extends the same records with result-list style associations so a scholarship or award questionnaire can later show per-submitter results such as pass/fail, level, amount, or custom text.

## Scope

Phase B includes a reusable form model, admin form builder, intranet published-form list, member submission page, member submission history/detail, file upload fields, structured fill-in fields, table/repeating fields for reimbursement rows, backend validation, status review, admin note, CSV export, and attachment viewing. It intentionally does not replace the existing hard-coded academic-exchange page in the first pass; instead, it adds a new generic OA entry while preserving current reimbursement behavior.

Phase C adds configurable result fields and batch result association on top of the Phase B submission model. Administrators can define result columns for a form, edit result values per submission, batch import/export result rows keyed by student id or submission id, and publish result visibility so a submitter can see their own outcome.

## Data model

Convex gains `oaForms` and `oaFormSubmissions`. An OA form stores a stable `slug`, title, description, category, visibility, publish window, schema version, ordered field definitions, review/result configuration, created/updated metadata, and published state. A field definition includes id, type, label, help text, required flag, placeholder/options, upload constraints, and table column definitions when applicable. Submissions store `formId`, `formSlug`, `submitterId`, submitter snapshots, normalized answers, attachment metadata, review status, admin note, reviewer metadata, result values, and timestamps.

Files are stored in Convex storage. The browser uploads to a generated upload URL first, then submits storage ids and metadata as part of the answer payload. Backend validation checks field ids, required answers, field-specific shapes, file count/size/type limits, and table row shapes.

## User experience

The intranet adds an “OA 填报 / 问卷申请” entry and a list page showing currently published forms. A form detail page renders the configured fields, supports text, long text, number, date, select, radio, checkbox, file upload, and repeating table fields, and shows submission history for the current user. After submission, users can view their record status: pending, approved, rejected, or needs_changes. When result visibility is enabled in Phase C, the detail page also shows configured result fields for the user’s own submission.

## Admin experience

The admin backend adds “OA 表单” to the sidebar. The form list supports create, duplicate, edit, publish/unpublish, and open submissions. The builder is intentionally structured rather than free-form drag-and-drop: admins edit metadata and ordered field cards, add fields from a component palette, configure each field, and preview the member form before publishing. The submissions page supports search, status filtering, CSV export, detail viewing, status updates, admin notes, and attachment links. Phase C adds result-column configuration and a batch result editor/import area.

## Client API

All client code uses wrapper hooks in `src/lib/api.ts`, not raw generated Convex calls from components. Shared pure helpers live in `src/lib/oa-forms.ts` and shared rendering/editor components live under `src/components/oa-forms/`.

## Verification

Because the repository has no formal test script, pure schema and validation helpers will be covered by a standalone Node test script run with `node --test`. Full verification uses `npx convex codegen`, `npx tsc --noEmit --incremental false`, and `npm run lint` where local tooling allows. A subagent will independently review/test Phase B before Phase C begins.

## Reimbursement subtype refinement

The OA platform separates generic forms from reimbursement workflows while sharing the same base machinery. `oaForms` acts as the base form definition table and each form has a `kind`: `form` for generic surveys/applications and `reimbursement` for reimbursement templates. Generic forms and reimbursement forms have separate user-facing and admin-facing entry points, so students do not see reimbursements mixed into ordinary questionnaires.

Reimbursement forms reuse base fields, uploads, submissions, review status, admin notes, result values, CSV export, and attachment permissions. They add a stronger convention layer: default templates include applicant/project fields, a repeating expense table, invoice title, and receipt upload. Reviewers can use the existing `needs_changes` status to request supplemental uploads and notes, and future reimbursement-only states such as paid/disbursed can be added without changing the base form renderer.

The frontend uses composition rather than class inheritance: `OAFormRenderer`, `OAFormBuilder`, and `OAFormSubmissionsTable` are base components, while reimbursement entry pages and defaults wrap them with reimbursement-specific labels, navigation, and default fields. This keeps ordinary forms and reimbursements visually and operationally distinct while avoiding duplicated upload/review/table logic.
