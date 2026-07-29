# Tong Class Account Avatar Design

## Goal

Make the Tong Class navigation accurately represent the authenticated session after login.

## Behavior

When `useAuth()` resolves an authenticated `currentUser`, the desktop navigation shows that user's `realPhoto` or `avatar` in a round account control instead of the static login link. The account control opens a menu with the user's Tong Class profile and a logout action. When no photo exists, it shows the first letter of the user's English name, username, or `U`.

The mobile menu provides the same profile and logout actions. Unauthenticated visitors retain the existing login link. Logging out returns the visitor to the Tong Class home page.

## Boundaries

This is a frontend-only change in `src/components/layout/tong-class-navbar.tsx`. It reuses `useAuth()` and existing shadcn dropdown primitives; no Convex function or schema is changed.
