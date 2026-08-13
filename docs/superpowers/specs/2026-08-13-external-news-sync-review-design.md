# External News Sync and Review Design

**Date:** 2026-08-13  
**Status:** Approved  
**Base:** `newnew`  

## Goal

Discover new content on the institute public website, create internal drafts automatically, route them to explicitly assigned news reviewers, and preserve a separate final publication-approval boundary.

## Sources

The first release covers four fixed `https://www.ai.pku.edu.cn` columns:

- News: `https://www.ai.pku.edu.cn/xwgg1/xwxx.htm`
- Notices: `https://www.ai.pku.edu.cn/xwgg1/tzgg.htm`
- Research progress: `https://www.ai.pku.edu.cn/kxyj1/kyjz.htm`
- Academic lectures: `https://www.ai.pku.edu.cn/kxyj1/xsjz.htm`

Each column has an isolated adapter so a source layout change does not alter workflow code.

## Chosen approach

Reuse `contentPermissions`, `contentSubmissions`, `contentReviewTasks`, notifications, news publication, and OA scope resolution. Add an external-source ledger, explicit reviewer routing, a `canReview` news capability, and a scheduled fixed-host fetch action.

Use a two-stage process:

1. Review: assigned `canReview` users correct and accept the synchronized draft.
2. Publication approval: existing news approval/manage capability performs the final publish action.

Holding both capabilities is allowed, but review and publication remain separate recorded actions.

## Scheduling and observation mode

- Run discovery hourly and provide a super-admin `立即同步` action.
- Initial observation mode records discovered identities and parser results without creating drafts.
- After fixture and duplicate checks pass, enable draft creation.
- No scheduler, action, or migration may target silverfish or production during development.

## Discovery and deduplication

- Canonical identity uses source key plus normalized canonical URL.
- SHA-256 detects content changes; the existing short submission fingerprint remains only an idempotency-conflict guard.
- A sync ledger stores source column, original URL, source publication time, first/last seen time, fetch time, hash, status, linked submission, and failure code.
- The ingest mutation atomically inserts the ledger row, draft, reviewer-task snapshots, and notifications.
- Repeated discovery updates `lastSeenAt` and never creates another draft.
- A remote update never overwrites an edited internal draft. It sets a visible `官网内容已更新` state and lets a reviewer create a new source snapshot.

## Reviewer routing

- Assignment modes: one explicit reviewer, one or more reviewer groups/scopes, or all news reviewers.
- Scope selection reuses the existing account, identity, research-group, user-group, and all-users picker.
- Resolved recipients are intersected with active `news.canReview` permission holders and snapshotted.
- An empty resolution fails closed and creates no draft tasks.
- Any one assigned reviewer can accept, request changes, or reject; sibling tasks become skipped.
- Later permission changes do not silently retarget an existing draft.

## Permissions and pages

- Split news capability into create, review, and manage/approve.
- Reviewers see only tasks assigned to them.
- Reviewers can edit synchronized drafts but cannot edit or delete published news without manage permission.
- Portal gains a distinct `审阅新闻` entry.
- Permissions page gains an independent `审阅权` control and continues to support scope-based bulk assignment.
- Sync operations page shows enabled state, observation/draft mode, source health, last attempt, last success, failures, and manual run.

## Content transformation and display

- Fetch only fixed HTTPS hosts with manual redirect validation, timeouts, response-size limits, low concurrency, and no cookies or authorization headers.
- Remove scripts, styles, forms, frames, objects, embeds, event handlers, and unsafe URLs.
- Convert the retained content to Markdown compatible with the existing safe renderer.
- Save title, body, category, source date, source URL, cover URL, and source snapshot metadata.
- Internal news cards link to the internal detail page. The detail page exposes a separate `查看原文` link.
- The final published record uses the source publication time where available.

## Failure behavior

- Parser, network, redirect, size, or schema failures produce a bounded error code and no public content.
- Source HTML bodies and user data are not written to operational logs.
- Consecutive failures surface in the sync operations page and do not trigger automatic selector guessing.

## Verification

- Offline fixtures for all four list/detail adapters, pagination, relative URLs, dates, images, and malformed pages.
- Idempotency tests for repeat runs, concurrent ingest, source updates, and historical manually created source URLs.
- Security tests for host allowlist, redirects, timeouts, response limits, sanitization, and absence of credentials.
- Routing tests for explicit reviewer, groups, scope intersection, all reviewers, empty results, disabled accounts, and any-one completion.
- Authorization tests proving review-only users cannot manage published news.
- Observation-mode, manual-run, source-health, and internal-detail-link tests.
- Finish with lint, build, and an integrated AIA visual/accessibility review.

## Out of scope

- Arbitrary administrator-entered source URLs.
- Headless-browser crawling.
- Silent selector repair after a source redesign.
- Direct publication without human review and approval.
- Any production or silverfish deployment.

