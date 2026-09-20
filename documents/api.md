# API Reference

This document describes the public and server APIs implemented by the TongClass project (Convex functions, Next.js server routes, and client hooks). It is intended as a developer reference for both frontend and backend integration.

Contents
- Overview
- Convex RPC (by module)
- Next.js HTTP endpoints (/api/*)
- Client helper hooks (src/lib/api.ts)
- Email verification / password reset flow
- Environment variables used by the APIs
- Notes and examples

---

## Overview

- Backend: Convex (serverless functions + database)
- Runtime server routes: Next.js App Router API routes (under `src/app/api/*`)
- Client usage: Convex React hooks and wrapper helpers in `src/lib/api.ts`

Two common invocation patterns:

- Client-to-Convex (browser): import the canonical typed wrappers from `src/lib/api.ts`. Those wrappers own the generated `api` and `convex/react` calls; pages and components should not call Convex directly.
- Server-side (Next API routes): use the Convex HTTP client helper (`getConvexHttpClient()` in `src/lib/server/convex-http`) to call `api.*` from server code.

---

## Convex RPC (summary by module)

All Convex functions are available via the generated `convex/_generated/api` utility. Below is a concise summary of the modules and their public functions (name, type, main args, behavior).

Note: type signatures in code are authoritative. This section summarizes common usage.

### Module: `users`
- `list` (query)
  - args: { skip?: number, limit?: number, organization?: 'pku'|'thu', cohort?: number }
  - returns: array of user objects (paginated slice)
- `getById` (query)
  - args: { id: Id }
  - returns: user object or null
- `getByEmail` (query)
  - args: { email: string }
  - returns: user object or null
- `getByStudentId` (query)
  - args: { studentId: string }
  - returns: user object or null
- `create` (mutation)
  - args: { email, username, englishName, organization, cohort, studentId, password?, ...profileFields }
  - behavior: validates uniqueness, inserts user, optionally creates salted password credential
  - returns: new user id
- `update` (mutation)
  - args: { id, email?, username?, password?, ... }
  - behavior: updates user, handles password update with salted hash
  - returns: id
- `markEmailVerified` (mutation)
  - args: { userId }
  - behavior: sets `isEmailVerified` = true
- `touchVerificationRequest` (mutation)
  - args: { userId }
  - behavior: writes `lastVerificationRequestedAt` timestamp
- `updatePasswordByUserId` (mutation)
  - args: { userId, newPassword }
  - behavior: set password (salt+hash)
- `updatePasswordWithCurrent` (mutation)
  - args: { userId, currentPassword, newPassword }
  - behavior: validates current password then updates
- `updateRole`, `updateProfileMarkdown`, `remove` (mutations) — admin/owner operations
- `simpleLogin` (mutation)
  - args: { email, password }
  - behavior: simplified local login for development; returns success + userId + role + sessionToken
- `count`, `search` (queries)

### Module: `auth`
- `isStudentIdAllowed` (query) — checks registration whitelist in `authConfig`
- `currentUser`, `currentUserBySession`, `getUserByEmail`, `currentUserRole`, `isAdmin`, `isSuperAdmin`, `signOut` — lightweight auth-related queries/mutations used by the app

### Module: `emailVerifications`
- `create` (mutation)
  - args: { tokenHash, codeHash?, purpose: 'email_verification'|'password_reset', userId?, sentTo, ip?, userAgent?, expiresAt }
  - behavior: inserts a verification row (token/code hashed before storing)
- `consume` (mutation)
  - args: { tokenHash?, codeHash?, sentTo?, purpose }
  - behavior: validates token/code, marks usedAt, returns { ok, userId?, sentTo?, purpose } or failure reason ('invalid'|'used'|'expired')
- `getRecentStats` (query)
  - args: { email, ip?, withinMs }
  - returns: counts and timestamps used for rate limiting/cooldown logic

### Module: `courseReviews`
- Queries: `listByCourse`, `listByCourseAll`, `listPending`, `listCourses`
- Mutations: `create`, `update`, `approve`, `reject`, `remove`, `updateCourseName`

### Module: `courses`
- Queries: `list`, `getById`, `getByName`, `count`, `search`
- Mutations: `create`, `update`, `updateReviewStats`, `remove`

### Module: `events`
- Queries: `list`, `getById`, `count`
- Mutations: `create`, `update`, `remove`

### Module: `news`
- Queries: `list` (published), `listAll` (admin), `getById`, `count`
- Mutations: `create`, `update`, `remove`

### Module: `publications`
- Queries: `list`, `listByUser`, `getById`, `count`, `search`
- Mutations: `create`, `update`, `remove`

### Utility modules
- `seed` (mutation): create seed data (development)
- `addCredentials` (mutation): helper to add initial credentials

### Module: `tongInitCourseResources`

- `listPublicManifest` (query)
  - returns: published resource metadata plus `managedKeys`, used to merge database entries with the legacy static fallback without resurrecting archived resources.
- `adminList` (query)
  - args: `{ sessionToken? }`; admin / super_admin only.
- `adminBeginUpload` (mutation)
  - args: resource identity, display metadata, file name, MIME and size.
  - behavior: validates the file allowlist, stores an expiring pending upload and returns an R2-only presigned PUT target. It fails closed when R2 is not configured.
- `adminFinalizeUpload` (action)
  - args: `{ sessionToken?, id, storageId }`.
  - behavior: performs an R2 HEAD request, verifies the stored size and MIME, then conditionally copies the staging object to a new immutable final key using the verified source ETag before committing a draft snapshot.
- `adminSaveDraftMetadata`, `adminPublish`, `adminSetArchived`, `adminDiscardDraft` (mutations)
  - behavior: edit draft metadata, atomically replace the published snapshot, archive/restore without deleting R2 objects, or discard an unpublished draft.
- `adminSeedLegacyResources` (mutation)
  - behavior: idempotently registers lec0–lec3 and the existing exercise archive as published static compatibility entries.
- `getDownloadTarget` (action)
  - behavior: resolves a published static path or creates a short-lived signed URL for a private R2 object. The public browser flow normally calls it through the stable Next.js download route.

### TechDay modules

TechDay is implemented as a Convex-native event platform under `convex/techday/*`. Client components should use the wrapper hooks in `src/lib/api.ts` and should not call generated Convex functions directly from pages.

- `techday/auth`
  - Queries: `me`, `getReviewerInvite`
  - Mutations: `syncInternalUser`, `registerAuthor`, `registerVolunteer`, `registerReviewer`, `login`, `logout`, `changePassword`
  - Behavior: internal TongClass users are synced through the main session token; external authors, volunteers, and reviewers use TechDay-scoped credentials and sessions only.
  - Public volunteer registration creates a pending account. An administrator must enable it before reimbursement workflows are available.
- `techday/submissions`
  - Queries: `listPublic`, `getPublic`, `listMine`, `listManage`, `exportRows`
  - Mutations: `createMine`, `updateMine`, `deleteMine`, `updateManage`, `deleteManage`, `renumberAll`, `updateVotes`
  - Behavior: authors manage only their own submissions; public responses expose only approved display fields. Private contact fields, storage ids, and non-archived paper/poster material require owner/admin access.
- `techday/files`
  - Mutations: `generateUploadUrl`, `finalizePosterUpload`, `finalizeReimbursementAttachment`
  - Queries: `getPosterUrl`, `getReimbursementAttachmentUrl`
  - Behavior: uploaded files are stored in Convex storage and attached to TechDay records after permission checks.
- `techday/reimbursements`
  - Queries: `listMine`, `listManage`, `exportRows`
  - Mutations: `createMine`, `updateMine`, `deleteMine`, `review`
- `techday/awards`
  - Queries: `listAwards`, `listAwardSubmissions`
  - Mutations: `createAward`, `updateAward`, `deleteAward`, `upsertRecommendation`, `deleteRecommendation`, `assignAwards`
- `techday/posts`
  - Queries: `listPublished`, `getBySlug`, `listManage`
  - Mutations: `create`, `update`, `remove`, `publish`
- `techday/directories`
  - Queries: `listOrganizations`, `listDirections`, `listRoleTemplates`, `getSettings`
  - Mutations: `createOrganization`, `updateOrganization`, `createDirection`, `updateDirection`, `deleteDirection`, `createRoleTemplate`, `updateRoleTemplate`, `deleteRoleTemplate`, `updateSettings`
- `techday/admin`
  - Queries: `listUsers`, `exportUsers`, `listReviewerInvites`
  - Mutations: `updateUser`, `deleteUser`, `createReviewerInvite`, `updateReviewerInvite`, `deleteReviewerInvite`, `createMigrationMap`

---

## Next.js HTTP endpoints (server routes)

The app exposes REST-like HTTP endpoints under `/api/*` for health checks, email verification, Reviewer sessions, and academic-exchange exports. These are server-only and call Convex through the server HTTP client when data access is required.

JSON endpoints accept and return JSON. PDF and batch-export endpoints return binary download responses on success and JSON errors on failure.

### GET /api/health
- Purpose: container and reverse-proxy health check.
- Response: `{ ok: true, service: "tongclass-website", timestamp }` with `cache-control: no-store`.

### GET /api/resources/tong-init-course/[id]/download

- Purpose: stable public download entry for one published introductory-course resource.
- Behavior: asks Convex for the current published snapshot, then returns a no-store `307` redirect to either the legacy static path or a click-time, short-lived R2 signed URL.
- Responses: `307` on success, `404` for missing/unpublished/archived ids, `503` when the storage target cannot be resolved.

### POST /api/request-verification
- Purpose: request an email-verification message.
- Current UI status: public registration is disabled, so this endpoint is retained for the existing verification implementation but is not linked from the active registration page.
- Request body:

  {
    "email": "user@domain",
    "purpose": "email_verification",
    "turnstileToken": "..." // optional, when required
  }

- Behavior:
  - Validates email and purpose
  - Checks recent sending stats (rate limit / cooldown)
  - Optionally verifies Turnstile token if site/ip/email requires extra verification
  - Generates a random token and 6-digit code, stores hashed values in `emailVerifications` with expiry
  - Sends email via mailer (Nodemailer) containing a link and code

- Responses (status 200):
  - { ok: true, message: "If the email exists, a verification message has been sent." }
  - If in cooldown: { ok: false, cooldownRemainingMs, message }
  - If requires Turnstile: { ok: false, requiresTurnstile: true, message }

### POST /api/verify-token
- Purpose: consume an email-verification token or code.
- Request body:

  {
    "purpose": "email_verification",
    "token": "<token-from-link>",    // optional
    "code": "123456",               // optional
    "email": "user@domain"          // required when verifying by code
  }

- Behavior:
  - Calls `emailVerifications.consume` with the hashed token/code.
  - Marks an existing user's email as verified and returns a signed email proof when needed by the legacy registration client.

- Responses:
  - success: { ok: true, message?, proof?, email? }
  - failure: { ok: false, message } (HTTP 400 for invalid/expired/used)

> Password-reset helpers and the `password_reset` Convex verification purpose still exist internally, but the current repository has no `/reset-password` page or `/api/reset-password` route. The active `/forgot-password` page directs members to an administrator. Do not document or expose the dormant reset flow as a supported endpoint until both pieces are implemented and reviewed.

### POST /api/complete-email-verification
- Purpose: attach email verification proof to a newly created user (used in registration flow)
- Request body:

  {
    "userId": "convex_user_id",
    "email": "user@domain",
    "proof": "<signed-email-proof>"
  }

- Behavior: verifies proof and marks `isEmailVerified` on the target user

- Responses: { ok: true } or { ok: false, message }

### Reviewer session and academic-exchange routes

Reviewer routes use a dedicated HttpOnly session cookie and do not accept the main-site or TechDay session as a substitute.

| Method | Route | Success response |
|---|---|---|
| `POST` | `/api/reviewer/login` | Creates the Reviewer cookie and returns account data as JSON |
| `POST` | `/api/reviewer/logout` | Clears the Reviewer cookie |
| `GET` | `/api/reviewer/me` | Current Reviewer account as JSON |
| `GET` | `/api/reviewer/academic-exchange` | Authorized application list as JSON |
| `GET` | `/api/reviewer/academic-exchange/[id]` | One authorized application as JSON |
| `POST` | `/api/reviewer/academic-exchange/[id]/pdf` | Generated application PDF |
| `POST` | `/api/reviewer/academic-exchange/export` | ZIP containing an XLSX summary and selected PDFs |

### Member academic-exchange export

- `POST /api/intranet/academic-exchange/[id]/pdf`
- Accepts the main-site `sessionToken` in the JSON body.
- Returns the authenticated member's generated application PDF, or a JSON error.

---

## Client helper hooks (src/lib/api.ts)

The project exposes convenience React hooks around Convex `api` calls. These wrap `useQuery` and `useMutation` and are the recommended way to access backend functions from the UI.

Key hooks (examples):

- Authentication
  - `useAuth()` from `src/lib/hooks/use-auth.ts` → resolves the current main-site user from the stored session and exposes login/logout helpers.
  - `useTongClassSessionToken()` → subscribes to the stored `tongclass_session_token` for API wrappers.
  - `useCurrentUser()` → returns `useQuery(api.auth.currentUser)`
  - `useSignIn()` → calls `api.users.simpleLogin` and returns `{ success, userId, email, role, sessionToken }`
  - `useSignUp()` remains for the legacy registration client; public registration is disabled.

- Users
  - `useUsers({ organization?, cohort?, skip?, limit? })` → `api.users.list`
  - `useUserById(id)` → `api.users.getById`
  - `useCreateUser()`, `useUpdateUser()`, `useDeleteUser()` → mutations
  - `useUpdatePasswordWithCurrent()` → `api.users.updatePasswordWithCurrent`

- News / Events / Publications / Courses / CourseReviews
  - Hooks mapped to the module functions: `useNews`, `useCreateNews`, `useEvents`, `usePublications`, `useCourses`, `useCourseReviews`, etc.

- ToNG introductory-course resources
  - `useTongInitCourseResources()` reads the public manifest.
  - `useAdminTongInitCourseResources()` and the begin/finalize/save/publish/archive/discard/seed hooks automatically attach the main-site session token and are restricted server-side to admin / super_admin.

- TechDay
  - `useTechDayCurrentPrincipal()`, `useSyncInternalTechDayUser()`, `useTechDayLogin()`, `useTechDayLogout()`
  - `useTechDayPublicSubmissions()`, `useTechDaySubmissionById()`, `useMyTechDaySubmissions()`, `useCreateTechDaySubmission()`, `useUpdateTechDaySubmission()`
  - `useAdminTechDaySubmissions()`, `useAdminUpdateTechDaySubmission()`, `useExportTechDaySubmissions()`
  - `useTechDayReimbursements()`, `useReviewTechDayReimbursement()`
  - `useTechDayAwards()`, `useTechDayAwardSubmissions()`, `useAssignTechDayAwards()`
  - `useTechDayPosts()`, `useTechDayPostBySlug()`, `useManageTechDayPosts()`
  - `useTechDayOrganizations()`, `useTechDayDirections()`, `useTechDaySettings()`, `useUpdateTechDaySettings()`
  - `useAdminTechDayUsers()`, `useUpdateTechDayUser()`, `useTechDayReviewerInvites()`

- Intranet
  - Treehole and feedback hooks automatically attach the stored `tongclass_session_token`.
  - Convex functions in `treehole` and `feedback` validate `authSessions` server-side and ignore client-supplied author ids for new content.
  - TechDay-only sessions are not accepted by intranet functions.

- Verification helpers
  - The legacy verification client calls `/api/request-verification`, `/api/verify-token`, and `/api/complete-email-verification` directly via `fetch`.

Examples

```ts
// Query users
const users = useUsers({ organization: 'pku', cohort: 2024 })

// Request verification (client-side)
await fetch('/api/request-verification', { method: 'POST', body: JSON.stringify({ email, purpose: 'email_verification' }) })
```

---

## Email verification flow (implementation notes)

- Tokens & codes:
  - The system generates a long random token (`generateVerificationToken`) and a 6-digit numeric code (`generateVerificationCode`). Only hashes (SHA-256 hex) are stored in the database (`emailVerifications.tokenHash` / `codeHash`).
- Proofs:
  - After consuming a token, the server may return a signed HMAC-SHA256 proof for email verification.
  - Proofs are created with `EMAIL_SIGNING_KEY` and include an expiration timestamp.
  - Dormant password-reset proof helpers remain in `src/lib/server/verification.ts`, but no supported reset route currently consumes them.
- Next API route responsibilities:
  - `/api/request-verification`: throttle/cooldown checks (email & IP), optional Turnstile verification, email sending via server mailer.
  - `/api/verify-token`: consume token/code and return signed proofs or mark user email verified.
  - `/api/complete-email-verification`: attach proof to newly created account (registration flow).

---

## Environment variables used by the API & server routes

- Convex endpoint: the browser client and Next.js server routes share `https://aiagora.pku.edu.cn/convex` by default. Set `NEXT_PUBLIC_AIA_CONVEX_URL` to override it (the value must be an HTTPS URL whose path is `/convex`; credentials, query strings, and fragments are rejected). The legacy `NEXT_PUBLIC_CONVEX_URL` variable is ignored so a stale deployment setting cannot take precedence.
- `EMAIL_SIGNING_KEY` (required) — HMAC secret used to sign verification/reset proofs. Must be set on server.
- `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_URL` / `NEXTAUTH_URL` — used to construct verification links (fallbacks supported).
- Mailer (used by `src/lib/server/mailer`):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP transport configuration.
  - `SMTP_FORCE_AUTH_FROM` — when true, forces envelope From to the authenticated user (useful for providers that require it).
  - `MAILTRAP_API_TOKEN`, `MAILTRAP_SENDER_EMAIL`, `MAILTRAP_SENDER_NAME` — optional Mailtrap API transport; SMTP remains the fallback.
- Turnstile (optional): `TURNSTILE_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — used to verify human interaction when rate limiting triggers.
- Token expiry override: `EMAIL_VERIFY_EXPIRY_MIN` (email verification default minutes).
- Cloudflare R2 (set in the Convex deployment environment, not as browser-visible secrets):
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — required by the introductory-course resource service.
  - `R2_ENDPOINT` — optional S3-compatible endpoint override; `R2_SIGNED_URL_TTL_SECONDS` controls the default download signature lifetime.
  - The private bucket CORS policy must allow the website origins to issue `PUT` with both `Content-Type` and `Content-Disposition`. `ETag` exposure is useful for diagnostics but not required by the current browser client. Keep production and local-development origins explicit.

Example R2 CORS policy (replace the origins with the actual deployment and local-development origins):

```json
[
  {
    "AllowedOrigins": [
      "https://tongclass.ac.cn",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Content-Disposition"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

CopyObject finalization is executed inside Convex with R2 credentials and is not a browser CORS operation.

---

## Error handling and common responses

- Convex function errors: throw errors on validation/authorization issues; these propagate to client hooks and should be handled by callers.
- Next API routes return JSON `{ ok: boolean, message?: string, ... }` with HTTP 400 for invalid requests and 500 for server errors.
- Verification failures: `/api/verify-token` returns 400 with message for invalid/expired/used tokens.

---

## Extending APIs

- After explicit backend-maintainer authorization, add a Convex function in `convex/*.ts` and run `npx convex codegen` (or the project's build) to regenerate `convex/_generated/api`.
- Add client helpers in `src/lib/api.ts` to expose typed hooks for new functions.

End of document.
