# Hide About Tong Class Navigation Design

## Goal

Hide the public-header navigation entry labelled `关于通班` while preserving the `/about` route and the Tong Class brand shown in the site header.

## Design

The shared `Navbar` component defines one `navigation` array that is rendered by both its desktop and mobile menus. Remove the `关于通班` object from this array. Because both views consume that same array, the entry disappears consistently at every viewport size without duplicated conditions or CSS-only hiding.

No route, page content, backend API, authentication behavior, or header branding will change. Direct visits to `/about` remain supported.

## Verification

Run the repository lint command and inspect the navigation configuration to ensure it no longer includes the removed item.
