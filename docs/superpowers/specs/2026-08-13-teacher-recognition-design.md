# Teacher Recognition and Professional Service Design

**Date:** 2026-08-13  
**Status:** Approved  
**Base:** `newnew`  

## Goal

Let teachers submit awards, honors, academic service, and professional titles when they receive them; route submissions to configured reviewer groups; and expose approved records in annual statistics and teacher profiles.

## Chosen approach

Build a dedicated teacher-facing product surface on top of the existing OA form, attachment, task, notification, and review infrastructure. Do not recreate an approval engine.

The feature uses a protected system form kind for stable structured fields. Generic OA snapshots and approval events remain the audit source, while the dedicated pages provide domain-specific filtering and presentation.

## Eligibility and permissions

- Only users with `identityType=teacher` can create, edit, or submit a teacher-recognition application. The server enforces this rule.
- The permissions workspace gains a `教师奖励` category.
- This category configures reviewer user groups only. It does not expose create/manage checkboxes for applicants because teacher identity is the sole application rule.
- Reviewer-group membership is resolved and snapshotted when a submission starts.
- Any one eligible reviewer may approve, request changes, or reject. Once one reviewer acts, sibling tasks close.
- Proof materials are visible only to the submitting teacher, assigned reviewers, and super administrators.

## Structured fields

- Reporting year.
- Category.
- Recognition, service, or title name.
- Conference, journal, society, institution, or awarding organization.
- Start date and optional end date.
- Optional explanation.
- Required proof material attachment.

Default configurable categories:

- Journal or conference reviewer.
- Area chair.
- Program committee.
- Editorial board.
- Academic-society role.
- Award or honor.
- Other.

Administrators may add, rename, reorder, or retire categories without a code change. Retiring a category does not alter historical submissions.

## Workflow

1. Teacher saves a draft.
2. Teacher submits with proof material.
3. Reviewer group receives immutable tasks and notifications.
4. Any reviewer approves, requests changes with a required comment, or rejects with a required reason.
5. A requested-changes submission returns to the teacher and creates a fresh workflow version after resubmission.
6. Only approved records enter annual statistics and public teacher profile output.

## Pages and presentation

- Teacher page: `我的荣誉与专业服务`, with draft and history views.
- Reviewer page: AIA-styled queue reusing the OA approval list and attachment controls.
- Technology-group/admin page: filters by year, teacher, category, and status, plus Excel export.
- Teacher profile: compact `荣誉与专业服务` timeline showing year, recognition/title, and organization. Proof files and private comments never appear publicly.
- All surfaces reuse AIA paper, ink, red accent, fine-rule, serif heading, mono metadata, square controls, and existing status-badge conventions.

## Data integrity

- Submission and review actions use idempotency keys.
- Form and category snapshots keep historical records stable after configuration changes.
- Attachment storage uses a dedicated purpose and server-side ownership/MIME/size checks.
- Excel exports read server-authorized rows rather than trusting browser-supplied answers.

## Verification

- Teacher-only authorization tests on every mutation and page query.
- Reviewer group routing, membership changes, any-one completion, resubmission, and duplicate-action tests.
- Attachment ownership and cross-submission access tests.
- Annual-statistics and public-profile tests proving that only approved records appear.
- Category retirement and historical snapshot tests.
- Excel export filters and escaping tests.
- Finish with lint, build, and integrated AIA visual/accessibility review.

## Out of scope

- Student awards.
- Automatic award discovery from the public news site.
- Public proof-material downloads.
- Any production or silverfish deployment.

