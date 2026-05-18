# TechDay Native TongClass Convex Integration Design

## Decision

TechDay will be integrated natively into the TongClass website under `/techday/*` and `/admin/techday/*`. The FastAPI backend, SQL database, local uploads, and standalone Vite shell will be retired. TechDay data and workflows will move to Convex, with files stored in Convex storage or a compatible object store surfaced through Convex/Next permission checks.

The implementation must preserve the full TechDay platform scope: public works display, paper/detail pages, TechDay news, author registration and submission management, volunteer registration and reimbursements, reviewer invite registration, awards/recommendations, exhibit/admin review, settings, CSV export/import utilities, and migration from the old server data.

## Non-Negotiable Constraints

- Do not modify `package.json` scripts.
- Do not delete `.next`, `.convex/`, `node_modules/.cache`, existing TechDay draft files, or user work.
- Do not blindly insert migrated records. Every migration write must be idempotent using stable legacy identifiers.
- Do not expose TechDay external users to TongClass `/intranet`.
- Do not let frontend-provided identity, user IDs, role strings, or `mainUserId` authorize sensitive mutations.
- Do not reproduce the old raw SQL database console as arbitrary table mutation in production UI. Replace it with scoped admin tools and standalone migration scripts.

## Architecture

### Routes

Public and participant-facing routes live under `/techday`:

- `/techday`: public works/exhibit list with track, year, direction, vote sorting when enabled, and award badges.
- `/techday/papers/[id]`: public or owner/admin detail page with abstract, metadata, poster access, vote data, and gated vote logs.
- `/techday/news`, `/techday/news/[slug]`: TechDay Markdown news list/detail.
- `/techday/news/manage`, `/techday/news/editor/new`, `/techday/news/editor/[slug]`: TechDay news management for admins and news publishers.
- `/techday/login`: TechDay-only login for external users.
- `/techday/register/author`, `/techday/register/volunteer`, `/techday/register/reviewer`: event-scoped registration flows.
- `/techday/author/profile`, `/techday/author/submissions/new`, `/techday/author/submissions/[id]/edit`: author workspace.
- `/techday/volunteer/profile`, `/techday/reimbursements`: volunteer and reimbursement workflows.
- `/techday/awards`: reviewer/admin award workflow.

Admin-only routes live under `/admin/techday`:

- `/admin/techday/settings`: organizations, directions, role templates, users, reviewer invites, awards, and display settings.
- `/admin/techday/exhibits`: submission review, update, delete, renumbering, and CSV export.
- `/admin/techday/database`: if retained, a super-admin-only scoped data maintenance view, not arbitrary schema/table mutation.

The `/intranet` page will include a fourth block linking to `/techday`, but `/techday` itself is not inside `/intranet/layout.tsx` so external authors and volunteers can access TechDay without becoming TongClass members.

### Convex Modules

The current `convex/techday.ts` prototype will be split into focused modules:

- `techdayAuth.ts`: external login/session, registration, current TechDay principal, password/access-code changes.
- `techdayDirectories.ts`: organizations, directions, role templates, public lists, admin CRUD.
- `techdaySubmissions.ts`: public list/detail, author CRUD, admin review, renumbering, vote update and logs, export rows.
- `techdayReimbursements.ts`: owner/admin reimbursement CRUD, review workflow, export rows.
- `techdayAwards.ts`: awards CRUD, reviewer recommendations, admin award assignment, tag computation.
- `techdayPosts.ts`: TechDay Markdown posts, visibility, publish/manage/editor flows.
- `techdayFiles.ts`: upload URL generation, poster/attachment finalization, permission-checked file URL resolution.
- `techdayAdmin.ts`: user/participant assignment, reviewer invites, settings, scoped data maintenance and migration helpers.

All UI access to these functions should be wrapped in `src/lib/api.ts` helpers where practical. Components should not call raw Convex APIs directly except in small transitional code that is immediately replaced.

## Data Model

TechDay data stays separate from main TongClass data, with optional links to `users` for internal members.

Core tables:

- `techDayUsers`: event-scoped identities. Fields include `email`, `name`, `school`, `college`, `grade`, `studentId`, `role`, `mainUserId`, `organizationId`, `roleTemplateId`, `volunteerTracks`, `assignedTracks`, `availabilitySlots`, `voteCounterOptIn`, `reviewerDirectionId`, `reviewerInviteId`, `canPublishNews`, `status`, `legacyId`, timestamps.
- `techDayCredentials`: password/access-code hashes for external TechDay users only.
- `techDaySessions`: hashed session tokens for external users, expiry, revocation metadata.
- `techDayOrganizations`: organization name and responsibility.
- `techDayRoleTemplates`: role template name and `canEditVoteData`.
- `techDayDirections`: research/exhibit directions.
- `techDaySettings`: singleton display settings for votes, sorting, visible awards, and configured vote-editor template.
- `techDaySubmissions`: title, abstract, contact, venue, track, review status, publication status, archive consent, direction, author, authors text, year, votes, sequence number, paper URL, poster storage metadata, award text, legacy file fields.
- `techDaySubmissionVoteLogs`: submission, actor, field, old value, new value, timestamp.
- `techDayReimbursements`: applicant, project, organization, content, quantity, amount, invoice company, status, admin note, attachment storage metadata, legacy file fields.
- `techDayReviewerInvites`: invite code, preset direction, used state, reviewer metadata.
- `techDayAwards`: award name, description, color.
- `techDaySubmissionAwards`: many-to-many submission to awards.
- `techDayReviewRecommendations`: reviewer recommendations with reason and confidence.
- `techDayPosts`: slug, title, date, category, summary, tags, visibility, author, published flag, Markdown content.
- `techDayMigrationMap`: stable source table/source ID to Convex ID mapping for idempotent imports.

Unique constraints must be enforced inside mutations because Convex indexes are not relational uniqueness constraints. This applies to emails, student IDs, organization names, directions, role template names, award names, invite codes, submission-award pairs, and submission-reviewer recommendation pairs.

## Identity And Permissions

TongClass remains the authority for internal users. TechDay roles are event-scoped and must not be confused with TongClass roles.

Principals:

- `internal`: linked to a TongClass `users` row. Can use TechDay without a second login. May have TechDay roles through `techDayUsers`.
- `external`: linked only to `techDayUsers` and `techDaySessions`. Can access TechDay routes according to TechDay roles. Cannot access `/intranet`.
- `public`: no session. Can read public TechDay content only.

Roles:

- `author`: create and manage own submissions.
- `volunteer`: manage own volunteer profile and reimbursements.
- `reviewer`: review approved submissions in assigned direction and make recommendations.
- `admin`: manage all TechDay operations.
- `news_publisher`: manage own TechDay posts.
- `vote_editor`: edit configured vote fields when allowed by settings.

Every Convex mutation that writes sensitive data must resolve the actor server-side. Frontend code must not pass `mainUserId`, `actorId`, or trusted role strings as authorization facts.

## File Storage

Local paths from the FastAPI deployment will be replaced by storage IDs plus metadata.

Poster PDFs:

- Authors upload through a generated upload URL.
- A finalize mutation validates owner, target submission, content type, filename, and storage ID before attaching it.
- Public approved submissions can obtain poster URLs. Pending/rejected posters require owner/admin access.

Reimbursement attachments:

- Volunteers upload through generated upload URLs.
- A finalize mutation validates owner/admin access.
- Attachment URLs are returned only to the owner or TechDay admin.

Legacy migration keeps `legacyPosterPath` and `legacyFilePath` until file backfill completes.

## UI Design

TechDay will use the existing TongClass layout, Tailwind tokens, and shadcn/ui primitives. The standalone Vite header and raw blue-heavy styling will not be carried over.

Reusable components:

- `TechDayShell`
- `TechDayAccessGuard`
- `TechDayStatusBadge`
- `TechDayAwardBadge`
- `TechDayTrackTabs`
- `TechDayYearDirectionFilters`
- `TechDayFileUpload`
- `TechDayFileDownloadButton`
- `TechDaySubmissionForm`
- `TechDayAdminTableToolbar`

Use existing primitives: `Button`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`, `ConfirmDialog`, `Input`, `Textarea`, `Select`, `Label`, `MarkdownRenderer`, and `MarkdownSplitEditor`.

## Migration Strategy

Migration is a manually triggered, standalone process. It must not run from `dev`, `build`, `start`, or lifecycle hooks.

Steps:

1. Export source SQL data and file manifests from the old TechDay server.
2. Import reference data first: organizations, directions, role templates, settings, awards.
3. Import TechDay users as event users. Link to TongClass `users` only when there is a verified internal match.
4. Import submissions, vote logs, award links, recommendations, reimbursements, reviewer invites, and posts using legacy IDs and migration maps.
5. Upload files to storage with checksums and attach storage IDs to migrated rows.
6. Validate record counts, orphan checks, uniqueness checks, and file checksum parity.

Password migration will not copy plaintext. External users should either reset passwords/access codes or be migrated with legacy hash support behind a dedicated verifier that rehashes on first successful login. The safer default is forced reset/access-code issuance.

## Security Controls

- Convex functions enforce authorization, not route guards alone.
- External sessions are scoped to TechDay and stored hashed with expiry/revocation.
- Registration for reviewers requires valid invite codes.
- Volunteer/admin access is role-gated.
- News editing requires admin or `canPublishNews`.
- Vote editing requires admin or configured vote-editor role/template.
- Reimbursement attachments remain private.
- CSV imports are scoped to explicit TechDay entities and idempotent; no arbitrary destructive table import in normal UI.
- Dangerous maintenance operations, if any, are super-admin-only and audited.

## Verification

Required checks:

- `npm run lint`
- `npm run build`
- Manual browser verification of `/intranet`, `/techday`, representative public detail, external registration/login, author submission, reimbursement, awards, and admin settings.
- Permission checks for public, internal member, external author, external volunteer, reviewer, TechDay admin, and TongClass admin/super_admin.
- Migration dry-run checks for duplicate legacy IDs, duplicate emails/student IDs, missing files, orphaned submissions, orphaned award records, and record count parity.

## Implementation Order

1. Schema and type foundation.
2. Auth/session and permission helpers.
3. Reference data/admin settings.
4. Submissions and file storage.
5. Reimbursements.
6. Awards/reviewer workflow.
7. Posts/news workflow.
8. Frontend route migration and UI alignment.
9. Migration scripts and data import/export tools.
10. Verification and cleanup of the earlier TechDay prototype.
