# AIA Full-Chain Hardening Design

## Goal and scope

This change closes every confirmed issue in the July 29 AIA branch audit while preserving the current `codex/iai-institute-platform` working tree. The implementation covers account lifecycle and authentication, server-side authorization for shared content, Coffee Talk, OA workflow behavior, route and metadata correctness, focused regression tests, and development verification. It does not modify package lifecycle scripts, couple migrations to build or startup, use a production Convex deployment, or broaden unrelated feature scope.

The current working tree contains uncommitted feature work and is the source of truth for this repair. Existing changes must not be reset, overwritten, or reformatted wholesale. Convex changes are explicitly authorized by the user for this hardening work, but every schema addition remains backward-compatible and every data migration remains standalone, manually invoked, and idempotent.

## Delivery strategy

The work proceeds through six ordered repair groups. Each group starts with a focused failing test that reproduces the audited defect, followed by the smallest implementation that makes the test pass. A group is verified before the next begins so that authorization failures, schema compatibility failures, and product-flow failures remain attributable to one change.

The first group establishes the shared account and session boundary. The second secures news, events, publications, and courses. The third completes Coffee Talk. The fourth completes the OA workflow contract. The fifth repairs routing, account recovery, directory visibility, and metadata. The sixth reconciles stale tests and performs full verification.

## Account lifecycle and authentication

The `users` table gains an optional `accountStatus` field with values `active` and `disabled`. Missing values resolve as active for backward compatibility until a standalone migration writes explicit values. The migration scans in cursor batches, writes only missing statuses, never overwrites an existing value, and reports scanned, updated, skipped, and conflict counts. It is not referenced by development, build, start, or deployment scripts.

A single shared session-actor helper becomes the required boundary for main-site authenticated Convex functions. It validates the token hash, session existence, expiry, revocation, user existence, and effective account status. Disabled users are rejected even if an old session remains within its nominal expiry. Disabling an account revokes its active sessions in the same mutation. Login rejects disabled accounts with the same generic credential error used for invalid accounts, avoiding account-state disclosure.

Account removal becomes soft disable for normal administration. Hard deletion is not exposed through the routine admin surface. A super administrator cannot disable or demote the last active super administrator, cannot disable their own currently authenticated account through the normal operation, and cannot assign an unsupported role or identity. Existing account-management audit behavior is preserved and extended to status changes.

Password credentials become versioned. New and migrated-on-login credentials use PBKDF2-HMAC-SHA-256 through Web Crypto with a per-credential random salt and an explicit iteration count stored beside the hash. Existing plaintext, unsalted SHA-256, and salted single-round SHA-256 credentials remain readable only for a successful one-time compatibility login, after which they are rewritten to the current version. Password comparison uses byte-level constant-time comparison where the runtime permits it. Password changes revoke other active sessions for the account after the new credential is committed.

## Shared content and event authorization

News, event, publication, and course mutations accept a main session token and resolve the actor on the server. Administrative content creation, editing, publication, removal, and course-statistic maintenance require an administrator capability derived from the authenticated account. Client-provided author or owner identifiers never grant authority. Where a member-owned publication operation is supported, the server derives the owner from the session and permits modification only by that owner or an administrator.

Unpublished news is available only through an authenticated administrator query. Public news detail returns null for unpublished records. Event list and event detail share one audience evaluator. An absent or empty audience remains shared. An explicit undergraduate or graduate audience requires a matching active signed-in identity. The event detail endpoint accepts the optional session token and returns null rather than revealing whether a forbidden record exists.

The public event route follows the approved graduate design: signed-out visitors can view shared events, while identity-restricted events remain hidden. The page-level member guard is removed from the event route only; courses and intranet retain their existing login boundaries. Administrator event pages continue to receive all records through a separate authenticated query rather than relying on the public list.

## Coffee Talk completion

Coffee Talk applicants must be active, email-verified accounts whose effective identity is undergraduate or graduate. Teachers, other identities, and unverified accounts cannot submit even if they bypass the interface. The service landing page hides the applicant actions for ineligible accounts and retains the teacher console only for explicitly linked teacher accounts.

The application contract adds purpose, concise research background, expected outcome, preferred format, bounded textual availability, and an affirmative consent field. Existing topic and optional notes remain compatible. New fields are optional at schema level for historical rows but required by the new submission mutation. The record stores a submission-time applicant name, affiliation, identity, and email snapshot. Teacher DTOs reveal only the permitted snapshot fields at the appropriate accepted or completed stage; later profile edits do not rewrite historical application meaning.

Submission receives a client-generated idempotency key. The server stores a request fingerprint scoped to applicant and key. Repeating the same key and payload returns the original result; repeating the same key with a different payload returns an idempotency conflict. A new key may create a later application with identical business content after the previous request reaches a terminal state.

Server configuration defines the unresolved-application limit per applicant, unresolved limit per teacher, and minimum submission interval. Defaults are conservative and can be adjusted without changing interface code. Limits count only nonterminal applications and are enforced transactionally immediately before insertion.

The status machine adds `needs_information`. A teacher or scoped coordinator can request information with a required, bounded note. Only the applicant can supplement an application in that state, producing a new append-only history event and returning it to `under_review`. Applicants can withdraw nonterminal requests. Teachers act only on applications assigned to their linked person record. Ordinary administrators do not receive coordinator authority automatically; coordinator actions require an explicit capability, while super administrators retain recovery access.

Notification rows gain an optional natural key and matching index. Coffee Talk writes one notification per event-recipient pair. A repeated mutation or workflow retry cannot create duplicate notices. Notification titles and bodies remain data-minimized.

## OA workflow completion

OA approval actions support approve, reject, and request changes. Request changes requires a bounded comment, sets the submission to `needs_changes`, closes pending sibling tasks for the active step, records an append-only event, and notifies the submitter. The submitter may update answers only while the workflow is in `needs_changes`. Resubmission increments the workflow version, reactivates the same approval step from a fresh assignee snapshot, and records a resubmitted event.

Each approval task action accepts `expectedVersion` and an idempotency key. The submission stores a monotonically increasing workflow version. A matching key and payload returns the original outcome, a matching key with a different payload raises an idempotency conflict, and a stale expected version returns a stable stale-version result without writing events, tasks, or notifications.

Workflow notifications use the same natural-key deduplication contract as Coffee Talk. Existing legacy OA forms without approval steps retain their current review flow. Historical form snapshots and approval-step snapshots remain immutable. No bulk conversion of legacy submissions is introduced.

## Routing, directory visibility, recovery, and metadata

The main login return target is accepted only when it is a same-origin absolute path beginning with one slash. Protocol-relative paths, backslash-prefixed paths, control characters, and non-path values fall back to `/`. The same helper is reused by notification and Coffee Talk navigation validation so all local deep links follow one contract.

The unfinished public password-reset email path is removed from the request-verification endpoint. Email verification remains available only for authenticated or administrator-provisioned account flows that still use it. The public forgot-password page continues to direct users to the administrator process and does not advertise a nonexistent route. No email is sent to an arbitrary address for a disabled workflow.

Public Tong Class membership becomes opt-in. Only `isClassMember === true` records appear in anonymous member lists, search, and profile lookup. The controlled migration for historical member accounts sets the flag only where legacy policy proves membership. Teacher and other institute accounts use their linked `/people/[slug]` profile when available; the portal omits a personal-profile row when it cannot construct a valid public destination.

Canonical metadata is page-specific. The root layout supplies `metadataBase` and global identity but does not force every descendant to canonicalize to `/`. Public top-level pages and Tong Class pages declare their own canonical paths. Public person and group detail pages generate canonical metadata from their route slug. The Coffee Talk overview remains public and indexable because it is present in the sitemap; apply, status, teacher, portal, OA, authentication, and account pages remain noindex.

The deleted `/services` route continues to return 404. Dead source references to the removed services index are eliminated so later reuse cannot reintroduce a broken link.

## Error behavior and compatibility

Authorization failures use stable generic errors and never disclose the existence of a forbidden user, draft, event, application, or attachment. Public detail queries return null for missing and forbidden content. Mutation validation distinguishes unauthenticated, forbidden, validation, stale version, and idempotency conflict conditions without including private record contents.

Schema additions are optional wherever historical documents must remain readable. New mutations always write the complete new contract. Read adapters support historical Coffee Talk and OA rows by presenting explicit “historical record” fallbacks rather than inventing missing consent, snapshots, or workflow state.

## Verification

Focused regression scripts cover anonymous content mutation rejection, draft-news isolation, event audience detail isolation, disabled-session rejection, last-super-admin protection, password credential migration, safe login return paths, Coffee Talk eligibility, field validation, snapshot stability, rate limits, idempotency semantics, information-request transitions, scoped coordinator access, OA request-changes, stale versions, replay behavior, notification deduplication, public member opt-in, canonical paths, and Coffee Talk indexing.

The four currently failing scripts are reconciled with the latest approved product rules. Portal coverage requires one unified Coffee Talk entry. The icon compatibility script checks only icons that are actually rendered. Directory scripts use a Node-compatible import strategy so they execute rather than fail during module resolution.

Final verification runs every `scripts/test-*.mjs` script, `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build` with the explicitly loaded `dev:bold-sandpiper-236` AIA environment. Local HTTP checks verify `/services` returns 404, `/portal` redirects once to `/portal/list`, public canonical URLs are distinct, the Coffee Talk overview is indexable, and private service pages are noindex. No command appends `--prod`, and no production deployment is accessed.

## Acceptance criteria

The repair is complete when anonymous callers cannot invoke administrative content writes or read drafts and restricted event details; disabled accounts cannot log in or continue using old sessions; existing credentials migrate safely to the versioned password format; Coffee Talk enforces verified student eligibility and provides a complete, rate-limited, idempotent information-request workflow with stable snapshots; OA supports request changes, version conflicts, replay safety, and notification deduplication; public directory membership is explicit; redirects and canonical metadata are safe and correct; every repository script passes; lint, typecheck, and the AIA development build succeed; and the resulting diff contains no unrelated reset, package-script change, automated migration hook, or production operation.
