# Email Auth Setup Checklist

## Required environment variables

### Convex / app base
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_SITE_URL`

### SMTP (163 mail)
- `SMTP_HOST` (recommended: `smtp.163.com`)
- `SMTP_PORT` (recommended: `465`)
- `SMTP_USER` (you said: `tongclasspku@163.com`)
- `SMTP_PASS` (SMTP auth/app password)
- `SMTP_FROM` (recommended: `"TongClass" <noreply@tongclass.ac.cn>`)

### Cloudflare Turnstile
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET`

### Verification token behavior
- `EMAIL_SIGNING_KEY` (required for password reset proof signing)
- `EMAIL_TOKEN_EXPIRY_MIN` (password reset token expiry, default fallback `15`)
- `EMAIL_VERIFY_EXPIRY_MIN` (email verification expiry, default fallback `30`)

### Mailtrap (API)
- `MAILTRAP_API_TOKEN` (use Mailtrap API when set)
- `MAILTRAP_SENDER_EMAIL` (email address to display as sender)
- `MAILTRAP_SENDER_NAME` (optional sender name; defaults to `TongClass`)

## Optional fallback envs used by API
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_URL`

## Post-change commands

```powershell
npm install
npx convex codegen
npx convex deploy
npm run build
```

## Manual smoke test
1. Register page: send code, verify code, continue registration.
2. Forgot password: request reset email, click link, set new password, login with new password.
3. Settings page: change password with current password.
4. Safety path: trigger frequent send requests and verify Turnstile appears.

### Mailtrap API smoke test (recommended when using Mailtrap)
1. Install the Mailtrap client locally (if not installed):

```bash
npm install mailtrap --save-dev
```

2. Export env vars and run the smoke test script (script created at `scripts/mailtrap-smoke-test.js`):

```bash
export MAILTRAP_API_TOKEN="<your-token>"
export MAILTRAP_SENDER_EMAIL="hello@demomailtrap.co"
export SMOKE_TEST_RECIPIENT="your@recipient.com"
node scripts/mailtrap-smoke-test.js
```

3. Verify the message appears in your Mailtrap inbox.
