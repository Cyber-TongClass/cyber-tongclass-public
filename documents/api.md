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

- Client-to-Convex (browser): use the generated `api` via `convex/react` hooks (`useQuery`, `useMutation`). See `src/lib/api.ts` for typed helpers.
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

The app exposes REST-like HTTP endpoints under `/api/*` used for email verification and password reset flows. These are server-only and call Convex via the server HTTP client.

All routes accept and return JSON.

### POST /api/request-verification
- Purpose: request a verification email (email verification or password reset)
- Request body:

  {
    "email": "user@domain",
    "purpose": "email_verification" | "password_reset",
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
- Purpose: consume a token or a code (used by verify-email and reset-password pages)
- Request body:

  {
    "purpose": "email_verification" | "password_reset",
    "token": "<token-from-link>",    // optional
    "code": "123456",               // optional
    "email": "user@domain"          // required when verifying by code
  }

- Behavior:
  - Calls `emailVerifications.consume` with hashed token/code
  - For `email_verification`: marks user email verified (if user exists) and returns a signed email proof
  - For `password_reset`: returns a signed password-reset proof containing `userId` and `email`

- Responses:
  - success: { ok: true, message?, proof?, email? }
  - failure: { ok: false, message } (HTTP 400 for invalid/expired/used)

### POST /api/reset-password
- Purpose: finish password reset using a signed proof
- Request body:

  {
    "proof": "<signed-reset-proof>",
    "newPassword": "..."
  }

- Behavior:
  - Verifies the proof using server-side HMAC + `EMAIL_SIGNING_KEY`
  - If valid, runs `users.updatePasswordByUserId` to set the new password

- Responses:
  - success: { ok: true, message: "Password updated successfully." }
  - failure: { ok: false, message }

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

---

## Client helper hooks (src/lib/api.ts)

The project exposes convenience React hooks around Convex `api` calls. These wrap `useQuery` and `useMutation` and are the recommended way to access backend functions from the UI.

Key hooks (examples):

- Authentication
  - `useCurrentUser()` → returns `useQuery(api.auth.currentUser)`
  - `useCurrentUserBySession()` → returns the authenticated user for the stored `tongclass_session_token`
  - `useSignUp()` → returns a callback that calls `api.users.create` (sign up)
  - `useSignIn()` → calls `api.users.simpleLogin` and returns `{ success, userId, email, role, sessionToken }`
  - `useSimpleLogin()` → raw mutation for development login

- Users
  - `useUsers({ organization?, cohort?, skip?, limit? })` → `api.users.list`
  - `useUserById(id)` → `api.users.getById`
  - `useCreateUser()`, `useUpdateUser()`, `useDeleteUser()` → mutations
  - `useUpdatePasswordWithCurrent()` → `api.users.updatePasswordWithCurrent`

- News / Events / Publications / Courses / CourseReviews
  - Hooks mapped to the module functions: `useNews`, `useCreateNews`, `useEvents`, `usePublications`, `useCourses`, `useCourseReviews`, etc.

- TechDay
  - `useTechDayCurrent()`, `useSyncTechDayInternalUser()`, `useTechDayLogin()`, `useTechDayLogout()`
  - `useTechDayPublicSubmissions()`, `useTechDaySubmission()`, `useTechDayMySubmissions()`, `useCreateTechDaySubmission()`, `useUpdateTechDaySubmission()`
  - `useTechDayManageSubmissions()`, `useTechDayUpdateManagedSubmission()`, `useExportTechDaySubmissions()`
  - `useTechDayReimbursements()`, `useTechDayManageReimbursements()`, `useReviewTechDayReimbursement()`
  - `useTechDayAwards()`, `useTechDayAwardSubmissions()`, `useAssignTechDayAwards()`
  - `useTechDayPublishedPosts()`, `useTechDayPostBySlug()`, `useManageTechDayPosts()`
  - `useTechDayOrganizations()`, `useTechDayDirections()`, `useTechDaySettings()`, `useUpdateTechDaySettings()`
  - `useTechDayUsers()`, `useUpdateTechDayUser()`, `useTechDayReviewerInvites()`

- Intranet
  - Treehole and feedback hooks automatically attach the stored `tongclass_session_token`.
  - Convex functions in `treehole` and `feedback` validate `authSessions` server-side and ignore client-supplied author ids for new content.
  - TechDay-only sessions are not accepted by intranet functions.

- Verification helpers
  - The frontend calls the Next API routes above (`/api/request-verification`, `/api/verify-token`, `/api/reset-password`, `/api/complete-email-verification`) directly via `fetch`.

Examples

```ts
// Sign up (using helper)
const signUp = useSignUp()
await signUp({ email, username, englishName, organization: 'pku', cohort: 2024, studentId, password })

// Query users
const users = useUsers({ organization: 'pku', cohort: 2024 })

// Request verification (client-side)
await fetch('/api/request-verification', { method: 'POST', body: JSON.stringify({ email, purpose: 'email_verification' }) })
```

---

## Email verification & password reset flow (implementation notes)

- Tokens & codes:
  - The system generates a long random token (`generateVerificationToken`) and a 6-digit numeric code (`generateVerificationCode`). Only hashes (SHA-256 hex) are stored in the database (`emailVerifications.tokenHash` / `codeHash`).
- Proofs:
  - After consuming a token, the server may return a signed proof (HMAC-SHA256) for email verification and password reset.
  - Proofs are created with `EMAIL_SIGNING_KEY` and include an expiration timestamp.
  - Verification functions: `signEmailVerificationProof`, `signPasswordResetProof`, and verification `verifyEmailVerificationProof`, `verifyPasswordResetProof` in `src/lib/server/verification.ts`.
- Next API route responsibilities:
  - `/api/request-verification`: throttle/cooldown checks (email & IP), optional Turnstile verification, email sending via server mailer.
  - `/api/verify-token`: consume token/code and return signed proofs or mark user email verified.
  - `/api/reset-password`: verify proof and update password.
  - `/api/complete-email-verification`: attach proof to newly created account (registration flow).

---

## Environment variables used by the API & server routes

- `EMAIL_SIGNING_KEY` (required) — HMAC secret used to sign verification/reset proofs. Must be set on server.
- `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_URL` / `NEXTAUTH_URL` — used to construct verification links (fallbacks supported).
- Mailer (used by `src/lib/server/mailer`):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP transport configuration.
  - `SMTP_FORCE_AUTH_FROM` — when true, forces envelope From to the authenticated user (useful for providers that require it).
- Turnstile (optional): `TURNSTILE_SECRET`, `TURNSTILE_SITEKEY` — used to verify human interaction when rate limiting triggers.
- Token expiry overrides:
  - `EMAIL_TOKEN_EXPIRY_MIN` (password reset default minutes)
  - `EMAIL_VERIFY_EXPIRY_MIN` (email verification default minutes)

---

## Error handling and common responses

- Convex function errors: throw errors on validation/authorization issues; these propagate to client hooks and should be handled by callers.
- Next API routes return JSON `{ ok: boolean, message?: string, ... }` with HTTP 400 for invalid requests and 500 for server errors.
- Verification failures: `/api/verify-token` returns 400 with message for invalid/expired/used tokens.

---

## Extending APIs

- Add a Convex function in `convex/*.ts` and run `npx convex codegen` (or the project's build) to regenerate `convex/_generated/api`.
- Add client helpers in `src/lib/api.ts` to expose typed hooks for new functions.

End of document.
