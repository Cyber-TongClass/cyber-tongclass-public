# AIA Shared Content Audiences Design

## Goal

Replace the empty institute-only feeds at `/research` and `/updates` with the existing real Tong Class publication and news datasets. Both pages add `All`, `Undergrad`, and `Grad` audience filters whose membership is derived from linked author account types rather than from manually assigned content tags.

This change reuses existing database records and presentation behavior. It does not clone publication or news records, add a second content source, or infer an author's identity from a display name.

## Audience Semantics

Every returned item has a stable content ID and a deduplicated set of audience values.

- `All` contains every returned content ID exactly once.
- `Undergrad` contains an item when at least one linked author account resolves to `undergrad`.
- `Grad` contains an item when at least one linked author account resolves to `graduate`.
- An item with both undergraduate and graduate authors appears once in each audience filter and once in `All`.
- Teacher-only, other-only, and unclassified items remain visible in `All` but do not appear in `Undergrad` or `Grad`.
- Tab counts are the number of unique content IDs in that tab, never the sum of author matches.

Publication classification uses linked author accounts in this order:

1. Explicit user IDs embedded in structured publication author metadata.
2. Account user IDs attached through structured publication-authorship and institute-person relationships.
3. The publication owner's `userId`, but only when the publication has no explicit linked author account at all. This preserves classification for legacy Tong Class records without overriding explicit coauthor data.

News classification uses the news record's `authorId`. Existing identity normalization continues to treat legacy `member` accounts as undergraduate users. Raw author names are never used to guess identity.

## Architecture

The Convex public content queries become the authoritative aggregation boundary. They read the existing publication and news tables, resolve only the account relationships needed for classification, and return safe public DTOs. The DTOs add a public content `id` and `audiences: ("undergrad" | "graduate")[]`; they do not expose user IDs, roles, email addresses, or private institute-person fields.

The existing `src/lib/api.ts` hooks remain the only client access path. `/research` and `/updates` request the shared public projections through those hooks, deduplicate records by `id`, and derive all three filtered collections and counts from the same response.

No migration or database copy is required. Existing Tong Class routes continue reading the same records, so edits remain consistent across the Tong Class and AIA views.

## Presentation and Routing

The existing Tong Class publication archive and news timeline are extracted into shared, focused presentation components. Their search, category/status filtering, chronological grouping, loading behavior, and empty states remain available to the Tong Class pages.

The AIA pages reuse those components inside the AIA shell and add an audience tab row above the existing controls. Labels are `All`, `Undergrad`, and `Grad`, each with its deduplicated count. Filtering by audience composes with the existing search, status, category, and sort controls.

Publication and news detail links continue to use the existing `/tong-class/publications/[id]` and `/tong-class/news/[id]` pages in this release. The AIA listing therefore exposes the real data immediately without introducing duplicate detail routes.

The public query limit is raised to the existing safe maximum of 100 for these archive views. The current real dataset fits within that bound. Pagination is outside this change and can be added when the dataset approaches the limit.

## Data Flow

For publications, Convex loads eligible real publication records, collects linked account IDs from explicit author metadata and structured authorships, applies the owner fallback only when necessary, resolves normalized user identity types, and emits a deduplicated audience array. For news, Convex resolves the single author account and emits zero or one audience value.

On the client, a shared audience helper builds a map keyed by content ID before computing tabs and counts. This guards against duplicate query rows and ensures mixed-audience content cannot inflate `All`. The selected audience is then applied before the existing page-specific filters.

## Error and Empty States

Query loading uses the current skeleton/loading presentation. A query error remains isolated to the affected page and shows a retry-oriented error state rather than silently presenting an empty archive. A legitimate zero-result audience or search combination shows the existing empty-result message and keeps the audience tabs visible so the user can switch back to `All`.

Records whose author relationship is missing or malformed remain visible in `All`. Malformed structured author metadata is ignored safely and never causes the entire archive query to fail.

## Verification

Source-level tests cover audience classification rules, including undergraduate-only, graduate-only, mixed authors, duplicate author links, legacy owner fallback, teacher-only content, and malformed metadata. UI tests cover unique counts and the composition of audience filtering with existing controls.

Verification includes the focused Node test scripts, TypeScript checking, linting, and a production build when the active local Convex environment permits code generation. Manual browser checks cover `/research`, `/updates`, `/tong-class/publications`, and `/tong-class/news`, with special attention to mixed-author deduplication and link behavior.

## Non-Goals

This change does not add manual content audience tags, infer account types from author names, duplicate the real data, create new AIA detail pages, introduce archive pagination, expose private user data, or change registration and authentication policy.
