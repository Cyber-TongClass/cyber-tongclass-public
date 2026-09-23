# Quiz platform: separate Convex project migration plan

Status: original plan, 2026-09-23. Implemented with the user-requested branch split: student platform on public/quiz, admin management on public/main, separate quiz backend repository. See quiz-setup.md for actual implementation, validation, local hosting, and cloud-linking instructions. Historical migration is not applied; the release starts with an empty cloud database.

## 1. Base, scope, and source of truth

Implement on a fresh branch from the latest `public/main`, not by merging or rebasing `dev/quiz` into the public website. Fetch again at implementation time and record the actual base SHA. Selectively adapt presentation components from the old branch; reimplement integration against the new service contract.

Verified during planning:

| Source | Revision | Purpose |
| --- | --- | --- |
| `public/main`, also the remote default branch | `7dc3fb81a684f3652b3ad757dea4eb3186733281` | Website base; latest commit dated 2026-09-21 |
| `dev/quiz` | `db0a297476eb003a32dff408a306f03851d06959` | Old quiz presentation reference only |

The new Convex project is user-created but not connected here. Its deployed functions, credentials, and data have not been inspected. The existing root-level `cyber-tongclass-online-quiz-implementation-plan.md` describes a different architecture and is superseded by this document for this migration.

“Frontend only in the public repo” means **the quiz feature** contributes UI, typed client contracts, and API wrappers there. It does not mean removing the existing website's backend directory or server routes. All new quiz schema, authentication, administration, grading, import logic, and migration tools belong in a separate backend repository owned by the maintainers.

## 2. Findings that affect the migration

| Observed source | Consequence |
| --- | --- |
| `public/main:src/lib/convex-endpoint.ts` and `src/lib/server/convex-http.ts` use the shared AIA endpoint, defaulting to `https://aiagora.pku.edu.cn/convex`; the legacy `NEXT_PUBLIC_CONVEX_URL` is ignored | Preserve this endpoint and existing main-site client. Introduce an independent quiz client and configuration. |
| `public/main:src/lib/hooks/use-auth.ts`, `src/lib/undergraduate-access.ts`, and recent member-directory changes | Preserve main-site identity and directory policy. Course enrollment must not require or create a Tong Class member identity. |
| `dev/quiz:convex/schema.ts` places quiz tables in the main schema; `convex/quiz/lib.ts` reads main accounts locally | Separate table names are insufficient. Do not port the old schema or same-database admin authorization. |
| `dev/quiz:src/lib/quiz-api.ts` uses the ambient Convex provider and permissive `any` contracts | Rewrite transport and contracts; do not accidentally send quiz calls to AIA. |
| Old `/quiz/login`, `/quiz/register`, `/quiz/verify-pku`, and recovery pages assume open registration and mailbox verification | Replace with course-roster provisioning and student-ID login by default. The old authentication policy is not a migration requirement. |
| Old `/quiz/account` displays email and optional verified identity, but no progress | Add name unconditionally from the roster and a backend-derived progress summary. |
| Old admin quiz tabs cover courses, banks, and progress, but no account-management section | Add dedicated quiz student management without modifying the main user list. |
| Tracked `quiz/courses/*/lectures/*/questions.json` files include `correct-ans` | Never transfer these files or their commits into the public implementation branch. Treat their answers as previously exposed if real. |

The fetched public source is evidence of the client contract, not proof that the remote AIA deployment implements every local backend function identically. Verify the live session-introspection contract in a development integration before building the admin connection around it.

## 3. Target architecture and ownership

```text
Public website repository (based on public/main)
  existing main pages and /admin/users -> existing AIA client -> MAIN DATABASE
  /quiz/*                             -> quiz client         -> NEW QUIZ PROJECT
  /admin/quiz/*                        -> quiz admin actions -> NEW QUIZ PROJECT
                                                                 |
                                     read-only session validation |
                                                                 v
                                               existing AIA auth endpoint

Separate quiz backend repository
  schema + auth + enrollment + questions/keys + grading + progress
  admin authorization + audit + private imports + standalone migration tools
```

The quiz database owns students, credentials, sessions, enrollments, courses, lectures, questions, answer keys, attempts, and progress. No quiz student is inserted into AIA. No cross-project foreign key links a student to a main-site user, even if their student IDs happen to match.

The main admin interface retains `/admin/users` with its current permissions. A separate `/admin/quiz/students` section manages quiz students. Navigation provides access to both stores without combining their records, totals, searches, or exports. Existing restrictions on main user management remain in force; this migration does not grant ordinary admins additional main-site privileges.

Quiz identities never appear in `/users`, `/members`, their detail routes, public search, member counts, or public sitemaps. There is no quiz student directory or public profile route. Only an authenticated student can see their own account/progress, and authorized administrators can see roster records.

## 4. Authentication and cross-project administration

### Student accounts

- Default: admins provision accounts from the selected-course roster; no public registration and no PKU email-header verification in the initial release.
- Unique normalized `studentId`, required display name, active/disabled state, and explicit enrollment per course offering. Preserve leading zeroes in IDs. Email is optional unless required for the chosen invitation delivery method.
- Use student ID and password, with a one-time activation/reset credential distributed through the course's existing private channel. Store password hashes using an established password-auth implementation, never plaintext; activation/reset tokens are hashed, short-lived, and single-use. Do not send invitations automatically during import.
- Disable/reset revokes quiz sessions. Enrollment removal blocks that course immediately while preserving historical results. Student self-service cannot edit roster identity or enrollment.
- Quiz session storage uses a distinct namespace, e.g. `tongclass_quiz_session_v1`; never read or overwrite the main-site session key. Clear session-bound caches on logout or account changes. Expiry, active status, and enrollment are enforced by backend functions.
- Rate-limit login, activation, and reset attempts; return generic credential errors. Keep credentials and tokens out of logs and URLs.

### Admin connection: verified main identity, no copied admin credentials

Use public **actions in the quiz project** as the only entry points for quiz administration. Cross-project network verification cannot be performed inside an ordinary Convex query/mutation.

1. The main admin shell authenticates normally against AIA. Quiz API wrappers submit the current main session token to a quiz admin action over HTTPS.
2. That action calls AIA's existing `auth:currentUserBySession` using a server-configured, allowlisted AIA URL. Never accept an endpoint, actor ID, or claimed role from the caller.
3. Validate the authoritative result: valid current session, role `admin` or `super_admin`, and the current site's applicable identity/access policy. Reject expired/revoked sessions, unauthorized identities, malformed responses, and AIA timeouts. Do not cache positive authorization across requests.
4. Only after validation, invoke a quiz **internal** query/mutation using the verified actor. Record the main account ID as an external audit string plus authority identifier, not a `v.id("users")` reference or copied user record. Never persist the main session token.
5. Recheck authorization on every admin operation, including each import chunk, export page, and final publish. Main-role revocation takes effect on the next request; an already-authorized operation may finish.

Every public quiz function must enforce its own boundary: student endpoints require quiz credentials and ownership/enrollment; admin endpoints require the action flow above; internal privileged helpers must not be exposed as public mutations. Merely hiding an admin tab is insufficient.

This keeps the public repo frontend-only for the quiz feature and requires no new main-backend code if the existing introspection API suffices. Admin lists use paginated action responses and explicit refresh after writes rather than pretending cross-project authorization is a reactive query.

**Integration gate:** verify session introspection and authoritative role/status semantics against the actual AIA development service. If unavailable, ask the main backend maintainers for a narrow read-only identity introspection endpoint. Do not weaken authorization or modify this repository's `convex/` as a workaround. Service outages disable quiz administration, not student practice.

## 5. New quiz backend model and API contract

Table names below are proposed contracts, not instructions to edit the website schema.

| Entity | Minimum fields / invariant |
| --- | --- |
| Students | Unique normalized student ID, name, optional email, status, timestamps |
| Credentials / sessions / activation tokens | Student reference, secure hashes, expiry/revocation; entirely quiz-local |
| Course offerings / enrollments | Course + term, student + offering unique pair, enrollment status |
| Lectures | Offering, stable slug/order, title, draft/published/archived, bank version, draw count, grading-policy version |
| Bank versions / questions | Stable import key, immutable version, stem/type/options/assets; private correct answers, explanations, grading rules |
| Attempts / responses | Student, lecture and policy snapshot, pinned bank/question versions, server-selected questions, saved answers, status and timestamps |
| Progress | Student + lecture summary; derived atomically from finalized attempts, rebuildable from history |
| Import jobs / audit log | Idempotency key, source digest, actor, counts/errors/status; privileged operations recorded without secrets |

Use indexes for student ID, enrollment lookup, student/lecture progress, and paginated attempts. Convex indexes alone are not a uniqueness declaration: enforce lookup-and-insert/update in transactional mutations. Do not delete attempt history when disabling an account or archiving a lecture.

Proposed versioned API surface:

| Domain | Operations | Authorization / result |
| --- | --- | --- |
| Student auth | login, activate, logout, change password, me | Quiz credentials; sanitized own identity |
| Learning | list enrolled courses, get lecture, start/resume, save response, submit | Quiz session + enrollment + ownership |
| Account | get own progress, paginated own history | Own identity derived from session, never caller-supplied student ID |
| Admin students | list/detail, create/update, disable/reactivate, reset invitation, roster import, enroll/unenroll | Verified main-admin actions |
| Admin content | courses/lectures, staged bank import, validation, publish/archive | Verified main-admin actions |
| Admin progress | paginated filtered progress, bounded export | Verified main-admin actions; private export |

Publish a versioned TypeScript DTO contract without backend implementation or real data. The public repo's API wrappers consume it, validate external payloads as needed, and normalize errors into unauthenticated/forbidden/validation/unavailable states. Student payloads explicitly allowlist fields; never spread database question documents into responses.

Questions and answer keys live in the new backend, including any private uploaded source JSON. No real banks, keys, private storage URLs, or roster fixtures in public Git, static assets, client bundles, or source maps. Media retrieval must respect enrollment if the material is restricted. Grading runs only on the backend; no client-submitted score is trusted. Default review returns saved answers and score but withholds the correct keys unless an explicit teaching/release policy allows them.

Do not inherit the old “first two attempts count, later attempts are practice” rule merely because it appears in the old UI. Initial proposed behavior is repeatable practice with latest/best score and completed-lecture counts. Finalize counted attempts, timing, and answer-release policy before implementing the engine; store the chosen policy version on each attempt.

## 6. Frontend behavior and concrete file map

Keep the old quiz's cards, lecture rows, question layout, controls, spacing, and overall appearance, adapting them to the latest public site's shared UI components and tokens. Avoid an unrelated redesign.

| Route / area | Planned behavior |
| --- | --- |
| `/quiz/login` | Existing centered login-card design. Title `课程练习平台登录`; description `请使用课程分配的学号和密码登录`; fields `学号` and `密码`. Replace registration/PKU links with `账号由课程管理员开通；如需重置密码，请联系课程管理员`. Allow only validated local quiz return paths. |
| `/quiz/activate` | One-time account activation/reset and password creation; no self-registration. |
| `/quiz` | Login required; cards for enrolled courses only. Missing enrollment gets a helpful empty state. |
| `/quiz/courses/[courseSlug]` | Existing lecture-list design with progress derived from backend data. |
| Existing lecture and attempt routes | Preserve question renderer/runner appearance, resume saved work, backend sampling/grading and any agreed deadlines. |
| `/quiz/account` | Title `我的学习`; roster name and student ID, enrolled courses, per-course completion, latest activity, best/latest score, resumable attempt, and paginated history. |
| `/admin/quiz/students` and `/[studentId]` | Search/paginate accounts; provision/import, edit name, disable/reactivate, enroll, reset, view progress. Route ID is quiz-local and always authorized. |
| `/admin/quiz/courses`, `/question-banks`, `/progress` | Adapt existing admin presentation; new service operations and strict role checks. |

Progress definition: for each enrolled offering, denominator = currently published, accessible lectures; numerator = those with at least one finalized attempt. An in-progress attempt does not count as completion. Zero lectures displays `暂无已发布练习`, not a misleading percentage. Archived lectures leave the denominator but stay in history. Show the numerator and denominator explicitly, and separate completion from score. Backend owns this calculation; document any later grading policy change.

Concrete public-repo changes:

- Add/adapt `src/app/quiz/**` and `src/components/quiz/**`; omit the old registration, PKU verification, and email-recovery pages.
- Add/adapt `src/app/admin/quiz/**` and `src/components/admin/quiz/**`, including new student-management screens.
- Add `src/lib/quiz-client.ts`, `src/lib/quiz-contracts.ts`, and rewritten `src/lib/quiz-api.ts`; expose component-facing hooks through canonical `src/lib/api.ts`. Components import hooks there, never raw Convex functions.
- Add a quiz provider boundary within quiz route layouts, below the existing main admin shell where applicable. Main-site hooks must remain outside that boundary. Keep the global AIA provider/client unchanged; verify routing cannot switch a main-site hook to the quiz client.
- Update `src/components/layout/app-shell.tsx` to give `/quiz/*` its own existing quiz shell without the main-account navbar. Keep the admin shell on AIA. A student should see only their quiz login/name in the quiz area.
- Add the quiz admin navigation item and `/admin/quiz` to the appropriate allowed-prefix rules in the latest `src/app/admin/layout.tsx`. Preserve the newest public layout and all other role rules.
- Update quiz metadata/robots behavior to `noindex`; exclude private quiz routes from sitemap generation. This supplements, never replaces, API access control. Public navigation may link to the login page but must not reveal student data.
- Document configuration and contracts under `documents/`; ignore private roster/bank working files. Do not import the old commit containing answer-bearing files.

Do not modify `convex/`, package scripts, existing AIA endpoint resolution, main account/member behavior, or add quiz migration work to build/dev/start hooks. Quiz exports can be downloaded by the admin UI from paginated authorized backend results; the old Next.js quiz export and PKU-verification routes are not needed.

## 7. Configuration and deployment separation

Public frontend: keep `NEXT_PUBLIC_AIA_CONVEX_URL` unchanged; add `NEXT_PUBLIC_QUIZ_CONVEX_URL` for the new project's public API URL. Validate the quiz URL independently (do not apply AIA's `/convex` path requirement to a normal Convex deployment URL). Missing quiz config disables quiz routes with a clear unavailable state; it must never fall back to AIA. Reject accidental same-endpoint configuration.

Quiz backend: configure its own development/deployment identity and a server-only `MAIN_AUTH_CONVEX_URL` for the existing AIA service. Provision any password/auth secrets only in that backend environment. Keep deploy keys out of public environment variables, bundles, and Git. Frontend builds do not deploy or generate the quiz backend.

The existing website build script still performs its existing main-project codegen. Preserve it; arrange its established safe development configuration separately from quiz backend deployment. Never redirect main-project `CONVEX_DEPLOYMENT` to the quiz project to make this work. Backend codegen/deployment runs only from the separate backend checkout. A frontend launch must not require quiz credentials at build time.

## 8. Data transfer and cutover

Do not assume a live legacy quiz database exists. Establish which of these applies before importing anything:

1. **Fresh deployment (default):** provision the approved course roster, import private bank sources, and start with empty progress.
2. **Existing records to preserve:** inventory/export only the legacy quiz entities from an authorized source, freeze legacy quiz writes for a final export, and import through an explicit ID map. Never export or copy main user credentials/tables. Do not import sessions; require fresh activation. Reconcile students, enrollment, bank versions, attempts, responses, and progress before cutover.

Backend-repository tools must be standalone and manually invoked. Each tool defaults to dry-run, names the source/target deployment, validates source shape, and emits counts/errors without passwords or raw answers. Roster imports upsert by normalized student ID and enrollment pair. Banks use stable source IDs plus version/digest. Historical entities use a source-system/source-ID map. Repeated execution must not duplicate students, enrollments, banks, or attempts.

Large imports use bounded chunks into a staging version; publish atomically only after all validation succeeds. Failed chunks are retryable. Never partially publish a question bank. Validate choice IDs, supported question types, accepted answers, duplicate IDs, question counts, and math/media rendering.

The answer-bearing files on the old branch are not a secure source for future confidential assessments. Inventory whether they are synthetic or real; replace exposed assessment questions if confidentiality matters. Removing a file from the new branch does not erase historical disclosure. No history rewriting is part of this plan.

Pilot with a small roster and draft course. Cutover changes only the quiz endpoint/feature availability after reconciliation and acceptance checks. Rollback disables quiz entry or returns to a compatible frontend release; preserve the new database and its attempts. Do not route new quiz writes into the main database. If legacy data was migrated, do not reopen legacy writes without a reconciliation plan.

## 9. Ordered implementation milestones

| Milestone | Deliverable | Exit gate |
| --- | --- | --- |
| M0 — baseline and contracts | Fresh `codex/quiz-separate-backend` branch/worktree from latest `public/main`; separate backend checkout; DTOs, environment map, finalized auth/progress rules | Verified main session introspection from quiz development backend; no need to change main schema |
| M1 — independent accounts and admin access | Quiz-local schema/auth/enrollment; verified admin actions; student list/import/reset UI | Same roster imported twice gives identical counts; invalid main/quiz sessions rejected; quiz students absent from AIA |
| M2 — private course materials | Versioned banks, staged imports, courses/lectures and enrollment access | Enrolled student receives sanitized content; other students cannot retrieve it; keys stay private |
| M3 — student frontend and practice | Adapted login/shell/catalog/runner, server-owned attempts/scoring, account progress | Login → course → save/resume → submit → account progress works; name visible without PKU verification |
| M4 — administration and reconciliation | Complete roster management, content publication, progress filters/exports; optional historical migration tools | Admin operations audited; export agrees with account summaries; reset/disable revokes access |
| M5 — verification and release readiness | Regression/security checks, small pilot, deployment/cutover and rollback runbook | Evidence below passes; any real deployment/import is separately authorized and manually triggered |

Backend work belongs to the separate project and its maintainers; frontend work belongs to a PR against `public/main`. Land compatible backend APIs before enabling the frontend routes. The planning request does not authorize deploying or importing data.

## 10. Acceptance and verification evidence

- Isolation: create a quiz student and complete practice; verify no main user record, public directory/search entry, member-count change, or main login capability is created. Matching student IDs across stores remain independent.
- Authorization: main ordinary student, forged role/actor fields, expired/revoked admin token, disabled quiz student, unenrolled student, cross-student attempt IDs, and direct privileged function calls all fail. Admin disable/reset and role removal take effect as specified.
- Provider routing: main pages and outer admin shell still call AIA; quiz student/admin functions call only the quiz project. Quiz auth changes do not log the main admin in/out, or vice versa.
- Privacy: inspect browser responses and bundles for answer keys, private source files, other students' data, and credentials. Roster exports are private and CSV-formula-safe; audit entries omit tokens and passwords.
- Correctness: save/resume cannot reroll questions; submit is idempotent; concurrent submit/start and stale autosave cannot corrupt results. Refresh and multiple tabs preserve progress. If timers are enabled, server deadlines survive local-clock changes.
- Progress: test no enrollment, no published lectures, partial completion, completed attempts, repeated practice, archived lectures, and historical migrated attempts. Admin and student summaries agree.
- UI: desktop/mobile, keyboard access, math/questions, loading/empty/error/session-expiry states, activation/reset, and safe return navigation. Use the old quiz UI as a visual reference, not as behavioral acceptance evidence.
- Main-site regression: login, member visibility, main user administration, and existing admin navigation/permissions remain unchanged.
- Run the existing lint gate and an explicit TypeScript check, since production builds ignore TypeScript errors. Run the existing build with safe main-project codegen configuration; do not alter scripts to bypass failures. Add targeted backend/integration tests for authorization, idempotency, grading, and progress in the backend project; the repo currently has no test suite to assume is present.

## 11. Inputs to settle before implementation

These do not block this plan; defaults are stated above.

1. Separate backend repository location and the new project's development endpoint; who owns deployment access.
2. Approved roster format and course/term IDs; private activation delivery method.
3. Whether any actual old accounts/results must be preserved (default: fresh start).
4. Grading policy: practice-only latest/best results versus counted attempts, timers, and answer-release timing (default: repeatable practice, no key release).
5. Confirmation of live AIA session validation and account-policy fields; maintainers resolve any missing read-only contract.

Completion means an independently stored, enrollment-controlled quiz system managed from the existing admin website, with the old quiz's familiar presentation, roster login, and a name/progress account page—implemented on the current public website without copying quiz students or materials into its main database.
