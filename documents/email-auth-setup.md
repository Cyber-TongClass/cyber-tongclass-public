# Email Verification Setup Checklist

> Updated 2026-08-19. Public self-registration and self-service password reset are currently disabled. The active login flow uses administrator-created accounts and student IDs.

## Required environment variables

### Convex / app base
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_SITE_URL`

### SMTP (163 mail)
- `SMTP_HOST` (recommended: `smtp.163.com`)
- `SMTP_PORT` (recommended: `465`)
- `SMTP_USER` (the authenticated mailbox address)
- `SMTP_PASS` (SMTP auth/app password)
- `SMTP_FROM` (recommended: `"TongClass" <noreply@tongclass.ac.cn>`)

### Cloudflare Turnstile
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET`

### Verification token behavior
- `EMAIL_SIGNING_KEY` (required for email-verification proof signing)
- `EMAIL_VERIFY_EXPIRY_MIN` (email verification expiry, default fallback `30`)

`EMAIL_TOKEN_EXPIRY_MIN` and password-reset proof helpers remain in the codebase for an incomplete legacy flow. There is currently no `/reset-password` page or `/api/reset-password` route.

### Mailtrap (API)
- `MAILTRAP_API_TOKEN` (use Mailtrap API when set)
- `MAILTRAP_SENDER_EMAIL` (email address to display as sender)
- `MAILTRAP_SENDER_NAME` (optional sender name; defaults to `TongClass`)

## Optional fallback envs used by API
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_URL`

## Post-change commands

```bash
npm ci
npm run build
```

Never append `--prod` to a Convex command unless a maintainer explicitly requests a production deployment.

## Manual smoke test
1. Call the email-verification request endpoint in a development environment and confirm the message is delivered.
2. Verify the token/code once and confirm a second use is rejected.
3. Settings page: change password with the current password.
4. Safety path: trigger frequent send requests and verify Turnstile appears.

### Mailtrap API smoke test (recommended when using Mailtrap)
1. Install the locked project dependencies with `npm ci`; `mailtrap` is already a runtime dependency.

2. Export env vars and run `scripts/mailtrap-smoke-test.js`:

```bash
export MAILTRAP_API_TOKEN="<your-token>"
export MAILTRAP_SENDER_EMAIL="hello@demomailtrap.co"
export SMOKE_TEST_RECIPIENT="your@recipient.com"
node scripts/mailtrap-smoke-test.js
```

3. Verify the message appears in your Mailtrap inbox.
