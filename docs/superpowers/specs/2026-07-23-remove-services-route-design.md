# Remove Public Services Route Design

## Goal

Remove the public AIA services entry point and surface the OA directory as a role-aware option in the authenticated portal list.

## Route behavior

The `/services` route will call Next.js `notFound()` so direct requests receive the application’s existing 404 page. `/services/oa` and the deeper OA routes remain available for their current account checks and workflows, but the OA directory is entered from `/portal/list`.

## Navigation and discovery

Remove the `服务` item from the AIA primary navigation, remove `服务中心` from the AIA footer, and remove `/services` from the sitemap. No public page will link visitors to the deleted route.

## Portal list

Add an `OA 与审批` row to the existing shared `commonModules` list in `PortalClient`. The row links to `/services/oa` and explains that it hosts institution forms, submissions, and approval items. It is subject to the existing portal login gate, so unauthenticated visitors only see the portal login prompt.

## Verification

Extend the source-level portal script to require `notFound()` in the root services route, forbid `/services` navigation and sitemap entries, and require the OA portal module. Run the focused script, lint, and local HTTP checks that confirm `/services` returns `404`, `/portal` redirects to `/portal/list`, and `/portal/list` returns `200`.
