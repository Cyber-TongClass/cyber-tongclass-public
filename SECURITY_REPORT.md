# Security Report

This document records security issues identified during a review of the
TongClass codebase (`cyber-tongclass-public`). It covers issues that were
fixed in `src/` directly, plus issues found in `convex/` that require
maintainer authorization to remediate.

Per `AGENTS.md`, the `convex/` directory is treated as a finished backend
that must not be modified without explicit authorization from the
maintainers. Findings there are listed below so they can be addressed
out-of-band.

---

## Fixed in `src/` during this review

### 1. Missing rate limiting on reviewer login
**Severity:** High (credential stuffing / brute force)

The reviewer login route (`src/app/api/reviewer/login/route.ts`) had no
rate limiting, leaving it wide open to credential stuffing.

**Fix:**
- Added `src/lib/server/rate-limit.ts` — a small in-memory limiter keyed by
  scope + identifier with sliding-style windows per bucket.
- Applied the limiter to the reviewer login route with three independent
  buckets:
  - Per IP: 30 attempts per 10 minutes.
  - Per username (lower-cased): 10 attempts per 15 minutes.
  - Per username failure cooldown: any failed attempt triggers a 60 s
    cooldown that blocks further attempts against the same username.
- Generic error messages (`用户名或密码错误`) are returned so the response
  cannot be used to enumerate valid usernames.
- `Retry-After` headers are returned on 429 responses so clients can back
  off correctly.

### 2. SSRF in `fetchPaperPdf` (academic exchange PDF export)
**Severity:** High

`src/lib/server/academic-exchange-pdf.ts` `fetchPaperPdf` followed any URL
stored in `application.paperPdfUrl` without an allowlist, allowing an
attacker who can submit an application to point the server at internal
services (e.g. `http://169.254.169.254/...`).

**Fix:**
- Added `isSafePaperPdfUrl` which:
  - Requires `https:` protocol.
  - Blocks `localhost`, loopback and RFC1918 / link-local hosts even if they
    are added to the allowlist (defence in depth).
  - Allows only hosts in the allowlist, which is the union of:
    - The configured R2 endpoint host.
    - The R2 account id-derived host (`<accountId>.r2.cloudflarestorage.com`).
    - An optional `ACADEMIC_EXCHANGE_PDF_ALLOWED_HOSTS` env var
      (comma/whitespace separated).
- `fetchPaperPdf` now throws `"论文链接主机未在允许列表中"` if the URL fails
  the check.
- The PDF magic-byte and content-type checks that were already present
  remain in place.

### 3. Missing security response headers
**Severity:** Medium

`next.config.js` did not configure security headers.

**Fix:**
- Added `Content-Security-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers
  applied to all routes via `headers()`.
- CSP `connect-src` is built from `NEXT_PUBLIC_CONVEX_SITE_URL`,
  `NEXT_PUBLIC_CONVEX_URL`, the configured R2 endpoint, and
  `<accountId>.r2.cloudflarestorage.com` so legitimate client traffic is
  not blocked; Turnstile is allowed in `script-src` and `frame-src` for
  the CAPTCHA.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` together provide
  defence-in-depth against clickjacking.

### 4. Non-constant-time HMAC comparison in email verification
**Severity:** Medium (theoretical; requires a high-precision timing oracle)

`src/lib/server/verification.ts` `verifySignedPayload` compared the
provided HMAC against the expected value with `!==`, which is a
non-constant-time string comparison.

**Fix:**
- Switched to `crypto.timingSafeEqual` after Buffer-wrapping both values.
  A length check is run first, and when lengths diverge the comparison
  still runs against the expected buffer so timing does not reveal
  length information.

### 5. Reviewer session cookie `sameSite`
**Severity:** Low/Medium

`src/lib/server/reviewer-session.ts` set `sameSite: "lax"`, which allows
the reviewer cookie to be sent on top-level cross-site GET navigations.

**Fix:**
- Upgraded to `sameSite: "strict"`. Reviewer endpoints are only used
  inside the dashboard, so cross-site cookie inclusion is not needed in
  normal flows.

---

## Open issues in `convex/` (requires maintainer authorization)

These issues live inside `convex/` and **cannot be fixed without explicit
authorization from the maintainers** per `AGENTS.md`.

### A. Weak password hashing for reviewer accounts
**Severity:** Critical

`convex/reviewer/lib.ts` `hashReviewerPassword` and
`verifyReviewerPassword` use a single round of plain SHA-256 with a
static salt:

```ts
passwordHash: await sha256Hex(password + salt),
```

SHA-256 is a fast, unkeyed hash that is not a password hash; modern GPUs
crack such hashes trivially. There is no work factor, no memory hardness,
and no pepper. Reviewer credentials are at material risk if the database
is ever exfiltrated.

**Recommended fix (for the maintainer to apply):**
- Move to Argon2id (`@node-rs/argon2`) or bcrypt (`bcryptjs`) with
  appropriate cost parameters.
- Re-hash on next successful login (gradual migration), or force a
  password reset if the operational risk allows.
- A pepper keyed off a separate env var (`REVIEWER_PASSWORD_PEPPER`)
  should layer on top of bcrypt/argon2 for defence in depth.

### B. Non-constant-time password comparison
**Severity:** Medium

`verifyReviewerPassword` uses `===` to compare the stored hash with the
candidate hash:

```ts
return credential.passwordHash === await sha256Hex(password + credential.salt)
```

Even though both sides are 64-character hex strings of identical length,
the string comparison is still value-dependent at the JavaScript engine
level, opening a (mostly theoretical) timing oracle. Replacing it with
`crypto.timingSafeEqual` after Buffer conversion closes the gap and is
cheaper than re-architecting to use an auth library.

**Recommended fix:** combine with issue A above — once a real password
hash library is used, this comparison becomes part of that library's
`compare`/`verify` API, which is constant-time by construction.

### C. Predictable session tokens if the random source is weak
**Severity:** Medium (depends on runtime `crypto`)

`generateSalt` uses `crypto.getRandomValues`, which is fine; however,
`convex/reviewer/lib.ts` `createReviewerSession` calls `generateSalt(32)`
to mint the session token. Session tokens should be at least 256 bits
from a CSPRNG, and they should ideally come from a dedicated
`randomBytes`/`randomUUID` style helper rather than reusing the salt
generator — mixing two implementations makes auditing harder. The
existing implementation is acceptable but worth standardising.

**Recommended fix:** introduce a single `generateSessionToken`
function that returns a 32-byte CSPRNG value and use it consistently
for tokens, salts, and verification challenges.

### D. Email verification codes use `Math.random`
**Severity:** Low

`src/lib/server/verification.ts` `generateVerificationCode` uses
`Math.random`, which is not cryptographically secure. Verification codes
are short-lived (10 minutes by default) and rate-limited at the Convex
mutation layer, so this is a low-severity issue, but the function should
use `crypto.randomInt(0, 1_000_000)` instead.

**Recommended fix:** `return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")`.

### E. No application-level rate limiting on verification flows
**Severity:** Medium

`src/app/api/request-verification/`, `complete-email-verification/`,
and `verify-token/` have no rate limiting. An attacker can spray email
verification emails at arbitrary addresses (resource consumption on
the SMTP/Mailtrap side) or brute-force 6-digit codes.

**Recommended fix:** apply the same `consumeRateLimit` helper used for
the reviewer login route to these endpoints, keyed by IP and by
`email`.

### F. Session token returned in JSON body on academic-exchange PDF route
**Severity:** Medium (lowered after the rate-limit fix above)

This was inspected but not modified because the route is invoked from
the Convex `actions` layer that already authenticates the user. Worth
confirming with the maintainer that `sessionToken` never reaches the
client in non-authenticated contexts.

---

## Out of scope (not addressed)

- The repo does not currently run any automated SAST or dependency
  audit in CI (see `AGENTS.md` constraint against modifying
  `package.json` scripts). Recommend enabling `npm audit` and a tool
  such as `osv-scanner` once the maintainers opt in.
- No changes were made to package versions, dependencies, or any
  `convex/` source. All fixes are additive or local swaps inside the
  Next.js half of the project.
