# Member visibility control

User-approved behavior: add a per-user enabled setting on /admin/users; disabled users do not appear on /members. This is directory visibility, not account suspension.

- Reuse the existing isClassMember flag and users:update API through src/lib/api.ts. Only explicit true is visible; existing backend requires super_admin. Do not modify convex/ or package scripts.
- Add a labeled, accessible per-row switch with saving state, repeat-click protection, and inline error feedback. Keep hidden accounts in the admin query for re-enabling.
- Verify the actual component sends only user ID and isClassMember, handles failures, and disables unauthorized changes. Run lint and frontend build.
- Keep develop changes and release only this patch onto the current main deployment; verify Vercel and the live admin bundle.
