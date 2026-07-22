# Portal List Route Design

## Goal

Serve the authenticated AIA portal module list at `/portal/list`, while retaining `/portal` as a compatible entry URL.

## Route behavior

`/portal/list` becomes the canonical page for the existing `PortalClient` module list. It retains its current authentication states and role-aware module options unchanged.

`/portal` performs a server-side redirect to `/portal/list`. This preserves existing navbar and bookmarked entry URLs without duplicating the portal implementation. Login links use `/login?next=%2Fportal%2Flist` so a successful sign-in returns directly to the canonical list route.

## Components and data flow

The existing `PortalClient` remains the sole owner of auth checks, notification counts, Coffee Talk application status, identity tags, and list rows. The new list page renders that component directly. The redirect route has no client component and fetches no data.

## Error handling and accessibility

Unauthenticated visitors at `/portal/list` retain the existing login prompt. Redirecting `/portal` through Next.js `redirect` avoids a visible duplicate loading state and keeps history on the canonical route. Existing headings, sections, and linked list rows are unchanged.

## Verification

Extend the existing source-level portal script to prove that `/portal/list` renders `PortalClient`, `/portal` redirects to `/portal/list`, and the login return target is `/portal/list`. Run the focused script and the repository lint command.
