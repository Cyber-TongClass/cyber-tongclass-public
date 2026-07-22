# Session-Aware Admin Capabilities Design

## Problem

Tong Class login stores a validated opaque session token in `localStorage` under `tongclass_session_token`. `useAuth` correctly resolves the current account with `auth:currentUserBySession`, and management queries/mutations pass the same token to their server-side authorization helpers. However, the legacy convenience hooks `useCurrentUser`, `useCurrentUserRole`, `useIsAdmin`, and `useIsSuperAdmin` in `src/lib/api.ts` query Convex Identity-only endpoints. A normal Tong Class session does not establish Convex Identity, so those hooks can return `null` or `false` for an authenticated administrator.

The immediate symptom is `/admin/institute/bindings`: its data queries authorize successfully with the stored session token, but its UI guard consumes `useIsSuperAdmin()` and renders the unauthorized state for a valid super administrator.

## Decision

The client has one canonical current-account authority: the session-aware state already exposed by `useAuth`. The four convenience hooks in `src/lib/api.ts` will delegate to that authority rather than directly querying the Identity-only compatibility endpoints. This changes all existing consumers consistently, not only the Institute binding page.

The legacy `auth:currentUser`, `auth:currentUserRole`, `auth:isAdmin`, and `auth:isSuperAdmin` function references will be removed from the client API layer once no caller needs them. They remain backend compatibility endpoints and are not changed. No component will read `localStorage`, call Convex directly, or receive a client-supplied role as a security decision.

`InstituteBindingsPage` continues to consume the public `useIsSuperAdmin()` API hook. It will therefore share the same role semantics as every future consumer without acquiring a page-specific exception.

## Security and loading behavior

Server-side functions remain the sole authority for protected data and mutations. Institute binding and Reviewer operations continue to send the opaque session token and call their existing `requireSuperAdminBySession` checks; a UI capability only controls presentation.

The unified capability hooks preserve `useAuth` loading semantics: they return `undefined` while the local token is being resolved, then return `false` for no session, expired session, or a non-privileged account. A valid local-session `super_admin` resolves to `true` even when Convex Identity is absent.

## Verification

A source-level regression test will assert that all four legacy-facing capability hooks derive from `useAuth`, that the Institute binding page keeps using the shared capability hook, and that the page no longer imports or depends on the Identity-only `useIsSuperAdmin` implementation. The test will first fail against the existing direct `useQuery` implementations and then pass after the refactor. The focused Node test and project ESLint command will be run after the change.
