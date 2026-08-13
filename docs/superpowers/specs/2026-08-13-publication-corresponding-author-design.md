# Publication Corresponding Author Design

**Date:** 2026-08-13  
**Status:** Approved  
**Base:** `newnew`  

## Goal

Complete the existing publication-author relationship so corresponding authors can be represented clearly, institute teachers can be bound to publications, and directly related publications appear automatically on teacher profile pages.

## Existing foundation

- `publications.authors` is a compatibility-oriented `string[]` whose encoded metadata already supports `coFirst` and `corresponding`.
- `PublicationAuthorEditor` already exposes co-first and corresponding-author checkboxes.
- `publicationAuthorships` already models `author`, `corresponding_author`, and `advisor`, but the production publication mutations do not write it.
- `institutePeople.accountUserId` already provides the stable account-to-directory binding.
- Institute person research queries already read `publicationAuthorships`, but public author DTOs discard the relationship role and teacher profiles currently hide the output section.

## Chosen approach

Use `publicationAuthorships` as the canonical institute-person relationship and retain `publications.authors` as the backward-compatible display snapshot. Publication mutations update both representations atomically.

The author editor supports three cases:

1. External author: free text, no institute relationship.
2. Existing Tong Class member: existing account binding behavior remains compatible.
3. Institute corresponding author: must select an institute person of kind `teacher` whose account binding is valid.

An external author may still be marked as a corresponding author, but only a selected institute teacher creates a profile relationship.

## Data and server flow

- Publication create/update accepts a normalized author payload alongside the compatibility strings.
- The server validates person slugs, teacher kind, duplicate bindings, account consistency, and write access.
- Each institute-bound author is upserted by a deterministic `publicationId + personId` natural key.
- `corresponding=true` writes `role=corresponding_author`; otherwise it writes `role=author`.
- Author order follows the editor order. Removed bindings are deleted during the same mutation.
- Publication deletion cascades to authorships, content mentions, and group visibility overrides.
- Public DTOs add safe author details: display name, co-first flag, corresponding flag, and optional public person slug. Account IDs are never exposed.

## Presentation

- Render a restrained mail icon and the text label `通讯作者` after the name.
- Institute teachers link to `/people/:slug`; Tong Class-only authors retain their existing profile destination.
- Do not highlight an entire row or use a saturated background.
- Teacher profiles gain a compact `相关论文` section containing only publications directly linked to that teacher. Research-group-wide outputs remain on the group page.
- When the profiled teacher is a corresponding author, show the same semantic label in the compact output row.

## Compatibility and migration

- Plain author strings, valid legacy metadata, and malformed legacy metadata remain readable.
- Add a standalone, manually triggered, idempotent migration that parses explicit legacy account IDs, resolves `institutePeople.by_accountUserId`, and upserts relationships.
- Never guess a teacher relationship by display name.
- Re-running the migration performs no duplicate inserts and reports conflicts separately.
- The migration is not connected to dev, build, start, or deployment commands.

## Errors and authorization

- Reject duplicate institute-person selections, invalid or hidden teacher references, forged person slugs, and inconsistent account relationships.
- Preserve the current publication owner/admin authorization contract on the server.
- A failed validation writes neither the publication snapshot nor relationship rows.

## Verification

- Author codec compatibility tests: plain, legacy, malformed, co-first, external corresponding, and institute corresponding authors.
- Mutation tests: create, reorder, change role, remove author, duplicate person, invalid person, and delete cascade.
- Public DTO tests: role preservation, correct profile link, and no account-ID leakage.
- Profile tests: teachers show only directly related publications; research groups still show group-wide outputs.
- Migration tests: repeated execution, conflicts, missing bindings, and interrupted batches.
- Finish with lint, build, and an AIA visual/accessibility pass after integration.

## Out of scope

- Replacing `publications.authors` with a new normalized author table.
- Guessing people by names.
- Expanding teacher profiles with unrelated team activity.
- Any production or silverfish deployment.

