# Publication Corresponding Author Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make corresponding authors a validated, visible publication attribute, bind institute teachers through `publicationAuthorships`, and automatically show directly linked papers on teacher profiles.

**Architecture:** Keep `publications.authors` as the backward-compatible encoded snapshot and make `publicationAuthorships` the canonical institute-person relation. A shared pure author contract normalizes editor input, server mutations validate every institute slug before atomically writing the snapshot and relation rows, and public DTOs expose only safe author details with profile slugs. Existing publication archives and the teacher profile consume that DTO without exposing account IDs or broadening research-group output rules.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Convex queries/mutations and indexes, Tailwind CSS, shadcn/ui, Lucide icons, Node.js `node:test` contract tests, ESLint.

---

## File map and integration ownership

| File | Responsibility |
| --- | --- |
| `src/lib/publication-authors.ts` | Dual-runtime author codec, normalized write input, safe public author projection helpers. |
| `convex/lib/publicationAuthorships.ts` | Pure validation/sync planning plus Convex persistence adapters for canonical institute authorships. |
| `convex/publications.ts` | Publication author option query, atomic create/update/remove orchestration, safe publication DTO projection. |
| `convex/instituteContent.ts` | Preserve author role/order and person slug in AIA public research DTOs. |
| `convex/schema.ts` | Add only the publication-first visibility-override index needed for bounded delete cascades. |
| `convex/publicationAuthorshipMigration.ts` | Standalone, cursor-batched, super-admin-gated, idempotent legacy backfill. |
| `src/types/index.ts`, `src/types/institute.ts` | Shared normalized input and safe public author DTO types. |
| `src/lib/api.ts` | Canonical React hook for institute teacher author choices; no component calls Convex directly. |
| `src/components/publications/publication-author-editor.tsx` | External/Tong Class/institute teacher author editing and structured payload emission. |
| `src/components/publications/publication-authors-list.tsx` | Restrained `Mail` icon plus `通讯作者` text and safe profile links. |
| `src/components/content/publication-archive.tsx`, `src/components/content/tong-class-publication-archive.tsx` | Carry safe structured author details through both existing archive designs. |
| `src/components/institute/live-directory-view-model.ts`, `src/components/institute/person-profile.tsx`, `src/components/institute/research-output-list.tsx` | Compute and render compact teacher-only `相关论文` rows, including corresponding-author semantics. |
| `src/app/my-publications/[id]/page.tsx`, `src/app/admin/publications/[id]/page.tsx` | Submit compatibility snapshots and normalized author inputs together. |
| `src/app/tong-class/publications/page.tsx`, `src/app/research/page.tsx`, `src/app/tong-class/publications/[id]/page.tsx` | Pass safe author DTOs to existing list/detail presentation. |
| `scripts/test-publication-author-contract.mjs` | Codec, malformed legacy metadata, safe DTO and UI source contracts. |
| `scripts/test-publication-authorship-sync.mjs` | Validation and create/reorder/role-change/remove sync-plan tests. |
| `scripts/test-publication-authorship-migration.mjs` | Repeat-run, missing binding, conflict and interrupted-batch migration tests. |

**Cross-plan sequencing:** the program coordinator assigns one shared-backend owner for `convex/schema.ts`; this plan's schema patch lands before publication backend work and must be rebased around, never overwrite, teacher-recognition/news/Word schema additions. The coordinator serializes the small `src/lib/api.ts` insertion after all generated function references are known. Publication components and DTOs are otherwise independent and may run in parallel. Do not modify permission models owned by teacher recognition/news, do not modify OA files owned by teacher recognition/Word, do not change `package.json` scripts, and do not run any deployment command or any command targeting silverfish/production.

### Task 1: Lock the author codec and safe DTO contract

**Files:**
- Create: `scripts/test-publication-author-contract.mjs`
- Modify: `src/lib/publication-authors.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/institute.ts`

- [ ] **Step 1: Write the failing codec and safe-projection tests**

Create `scripts/test-publication-author-contract.mjs` with executable cases, not source-only assertions:

```js
import assert from "node:assert/strict"
import test from "node:test"

const authors = await import("../src/lib/publication-authors.ts")

test("plain and malformed legacy strings remain readable", () => {
  assert.deepEqual(authors.parsePublicationAuthor("Ada Lovelace"), { name: "Ada Lovelace" })
  assert.deepEqual(
    authors.parsePublicationAuthor("Grace Hopper [tc-author:%7Bbroken]"),
    { name: "Grace Hopper" },
  )
})

test("co-first, external corresponding and institute corresponding metadata round-trip", () => {
  const external = { name: "Alan Turing", coFirst: true, corresponding: true }
  assert.deepEqual(authors.parsePublicationAuthor(authors.encodePublicationAuthor(external)), external)

  const teacher = {
    name: "Yao Zhang",
    corresponding: true,
    institutePersonSlug: "yao-zhang",
  }
  assert.deepEqual(authors.parsePublicationAuthor(authors.encodePublicationAuthor(teacher)), teacher)
})

test("public projection contains slugs but never account ids", () => {
  const projected = authors.toPublicPublicationAuthor({
    name: "Yao Zhang",
    corresponding: true,
    userId: "users-secret",
    username: "yaozhang",
    institutePersonSlug: "yao-zhang",
  })
  assert.deepEqual(projected, {
    name: "Yao Zhang",
    coFirst: false,
    corresponding: true,
    profile: { kind: "institute_person", slug: "yao-zhang" },
  })
  assert.doesNotMatch(JSON.stringify(projected), /users-secret/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test scripts/test-publication-author-contract.mjs
```

Expected: FAIL because `institutePersonSlug` is not encoded and `toPublicPublicationAuthor` does not exist.

- [ ] **Step 3: Add the normalized and public author types**

In `src/types/index.ts`, add and use these exact public contracts:

```ts
export type PublicationAuthorProfile = {
  kind: "institute_person" | "tong_class_member"
  slug: string
}

export type PublicPublicationAuthor = {
  name: string
  coFirst: boolean
  corresponding: boolean
  profile?: PublicationAuthorProfile
}

export type PublicationAuthorInput = {
  snapshot: string
  name: string
  coFirst: boolean
  corresponding: boolean
  tongClassUserId?: string
  tongClassUsername?: string
  institutePersonSlug?: string
}
```

Add `authorDetails?: PublicPublicationAuthor[]` to `Publication`. In `src/types/institute.ts`, import `PublicPublicationAuthor` from `@/types` and add `authorDetails: PublicPublicationAuthor[]` to `PublicInstituteResearch` while retaining `authors: string[]` for compatibility and search.

- [ ] **Step 4: Extend the codec without breaking legacy strings**

In `src/lib/publication-authors.ts`, extend `PublicationAuthor` with `institutePersonSlug?: string`; encode only a trimmed slug and preserve the existing plain-string behavior. Add these helpers:

```ts
export function toPublicationAuthorInput(author: PublicationAuthor): PublicationAuthorInput {
  const normalized: PublicationAuthor = {
    name: author.name.trim(),
    ...(author.isTongClass && author.userId ? { isTongClass: true, userId: author.userId } : {}),
    ...(author.username ? { username: author.username.trim() } : {}),
    ...(author.coFirst ? { coFirst: true } : {}),
    ...(author.corresponding ? { corresponding: true } : {}),
    ...(author.institutePersonSlug
      ? { institutePersonSlug: author.institutePersonSlug.trim().toLowerCase() }
      : {}),
  }
  return {
    snapshot: encodePublicationAuthor(normalized),
    name: normalized.name,
    coFirst: normalized.coFirst === true,
    corresponding: normalized.corresponding === true,
    ...(normalized.userId ? { tongClassUserId: normalized.userId } : {}),
    ...(normalized.username ? { tongClassUsername: normalized.username } : {}),
    ...(normalized.institutePersonSlug
      ? { institutePersonSlug: normalized.institutePersonSlug }
      : {}),
  }
}

export function toPublicPublicationAuthor(author: PublicationAuthor): PublicPublicationAuthor {
  const profile = author.institutePersonSlug
    ? { kind: "institute_person" as const, slug: author.institutePersonSlug }
    : author.username
      ? { kind: "tong_class_member" as const, slug: author.username }
      : undefined
  return {
    name: author.name.trim(),
    coFirst: author.coFirst === true,
    corresponding: author.corresponding === true,
    ...(profile ? { profile } : {}),
  }
}
```

Make `parsePublicationAuthor` discard malformed metadata rather than spreading arbitrary decoded fields; copy only correctly typed `isTongClass`, `userId`, `username`, `coFirst`, `corresponding`, and normalized `institutePersonSlug` values.

- [ ] **Step 5: Run codec tests GREEN and preserve the existing normalization test**

Run:

```bash
node --test scripts/test-publication-author-contract.mjs scripts/test-publication-author-normalization.mjs
```

Expected: all tests pass; plain, malformed and legacy metadata remain readable.

- [ ] **Step 6: Commit the contract foundation**

```bash
git add scripts/test-publication-author-contract.mjs \
  src/lib/publication-authors.ts src/types/index.ts src/types/institute.ts
git commit -m "feat(publications): define corresponding author contract"
```

### Task 2: Add deterministic authorship validation and sync planning

**Files:**
- Create: `scripts/test-publication-authorship-sync.mjs`
- Create: `convex/lib/publicationAuthorships.ts`

- [ ] **Step 1: Write failing pure sync-plan tests**

Create `scripts/test-publication-authorship-sync.mjs`. Import `validatePublicationAuthorInputs` and `planPublicationAuthorshipSync`; cover create, reorder, change role, remove, duplicate institute person, hidden/non-teacher/unbound person, forged slug, and account mismatch. The central passing case is:

```js
const people = new Map([
  ["teacher-a", {
    id: "person-a",
    slug: "teacher-a",
    kind: "teacher",
    visibility: "public",
    accountUserId: "user-a",
  }],
])
const inputs = [{
  snapshot: "Teacher A",
  name: "Teacher A",
  coFirst: false,
  corresponding: true,
  tongClassUserId: "user-a",
  institutePersonSlug: "teacher-a",
}]
const validated = validatePublicationAuthorInputs(inputs, people)
assert.deepEqual(
  planPublicationAuthorshipSync("pub-1", validated, [], 123),
  {
    inserts: [{
      naturalKey: "pub-1:person-a",
      publicationId: "pub-1",
      personId: "person-a",
      role: "corresponding_author",
      authorOrder: 0,
      createdAt: 123,
      updatedAt: 123,
    }],
    patches: [],
    deletes: [],
  },
)
```

Assert exact Chinese error messages for duplicates (`同一研究院教师不能重复关联`), hidden references (`所选教师未公开`), wrong kind (`通讯作者必须绑定教师目录记录`), missing binding (`所选教师尚未绑定账户`), and inconsistent user IDs (`作者账户与教师目录绑定不一致`).

- [ ] **Step 2: Run the sync tests and verify RED**

Run:

```bash
node --test scripts/test-publication-authorship-sync.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `convex/lib/publicationAuthorships.ts`.

- [ ] **Step 3: Implement exact validation rules**

Define these exported types in `convex/lib/publicationAuthorships.ts`:

```ts
export type ResolvedInstituteAuthor = {
  id: string
  slug: string
  kind: "teacher" | "graduate"
  visibility: "public" | "hidden"
  accountUserId?: string
}

export type ValidatedPublicationAuthor = PublicationAuthorInput & {
  personId?: string
}
```

`validatePublicationAuthorInputs(inputs, peopleBySlug)` must trim names, reject empty names, reject duplicate person slugs, require the snapshot to equal `encodePublicationAuthor(parsePublicationAuthor(snapshot))`, and apply the exact teacher/visibility/account-consistency rules above. External corresponding authors remain valid with no `institutePersonSlug`. Return all rows in editor order.

- [ ] **Step 4: Implement the deterministic sync plan**

Use `naturalKey = `${publicationId}:${personId}``. For every validated institute-bound author, emit one insert or a patch containing `role: author.corresponding ? "corresponding_author" : "author"`, `authorOrder`, and `updatedAt`; emit deletions for every existing row whose natural key is absent. Never create `advisor` from publication editor input. Existing rows are modeled as:

```ts
export type ExistingPublicationAuthorship = {
  id: string
  naturalKey: string
  personId: string
  role: "author" | "corresponding_author" | "advisor"
  authorOrder: number
}
```

Patches must be omitted when role and order are already identical so retries are idempotent.

- [ ] **Step 5: Run the sync-plan suite GREEN**

Run:

```bash
node --test scripts/test-publication-authorship-sync.mjs
```

Expected: all validation and sync-plan subtests pass.

- [ ] **Step 6: Commit the backend domain helper**

```bash
git add scripts/test-publication-authorship-sync.mjs convex/lib/publicationAuthorships.ts
git commit -m "feat(publications): validate institute authorship relations"
```

### Task 3: Add the one bounded schema index and persistence adapters

**Files:**
- Modify: `convex/schema.ts: researchGroupPublicationVisibilityOverrides`
- Modify: `convex/lib/publicationAuthorships.ts`
- Modify: `scripts/test-publication-authorship-sync.mjs`

- [ ] **Step 1: Extend the failing source contract for bounded cascades**

Add source assertions to `scripts/test-publication-authorship-sync.mjs`:

```js
const schemaSource = await readFile(new URL("../convex/schema.ts", import.meta.url), "utf8")
assert.match(schemaSource, /researchGroupPublicationVisibilityOverrides:[\s\S]*\.index\("by_publication", \["publicationId"\]\)/)
```

Run `node --test scripts/test-publication-authorship-sync.mjs`; expected FAIL because the index is absent.

- [ ] **Step 2: Coordinate and add only the required index**

The shared-schema owner adds:

```ts
.index("by_publication", ["publicationId"])
```

to `researchGroupPublicationVisibilityOverrides`, preserving the existing `by_group_publication` and `by_group` indexes and all concurrent schema additions from the other three plans.

- [ ] **Step 3: Add Convex persistence adapters**

In `convex/lib/publicationAuthorships.ts`, add:

```ts
export async function resolvePublicationAuthors(ctx: any, inputs: PublicationAuthorInput[]) {
  const slugs = [...new Set(inputs.flatMap((item) => item.institutePersonSlug ? [item.institutePersonSlug] : []))]
  const people = await Promise.all(slugs.map(async (slug) => [
    slug,
    await ctx.db.query("institutePeople").withIndex("by_slug", (q: any) => q.eq("slug", slug)).unique(),
  ] as const))
  return validatePublicationAuthorInputs(
    inputs,
    new Map(people.flatMap(([slug, person]) => person ? [[slug, {
      id: String(person._id),
      slug: person.slug,
      kind: person.kind,
      visibility: person.visibility,
      ...(person.accountUserId ? { accountUserId: String(person.accountUserId) } : {}),
    }]] : [])),
  )
}
```

Add `syncPublicationAuthorships(ctx, publicationId, validated, now)` that loads `by_publication_order`, applies the pure plan, and executes patches/inserts/deletes. Add `deletePublicationRelations(ctx, publicationId)` that deletes authorships via `by_publication_order`, `contentMentions` via `by_content` with `contentType="publication"`, and visibility overrides via the new `by_publication` index.

- [ ] **Step 4: Verify the index and helper suite**

Run:

```bash
node --test scripts/test-publication-authorship-sync.mjs
npx convex codegen
```

Expected: tests pass and codegen exits 0 against the local configured development environment. Do not pass `--prod`, do not deploy, and stop if the configured deployment name contains `silverfish`.

- [ ] **Step 5: Commit the bounded persistence layer**

```bash
git add convex/schema.ts convex/lib/publicationAuthorships.ts \
  scripts/test-publication-authorship-sync.mjs
git commit -m "feat(publications): persist canonical authorships"
```

### Task 4: Make publication mutations atomic and expose safe teacher choices

**Files:**
- Modify: `convex/publications.ts`
- Modify: `scripts/test-publication-authorship-sync.mjs`

- [ ] **Step 1: Add failing source contracts for every mutation boundary**

Read `convex/publications.ts` in the test and assert that it contains the shared `publicationAuthorInputValidator`, calls `resolvePublicationAuthors` before `ctx.db.insert`/`ctx.db.patch`, calls `syncPublicationAuthorships` after the publication ID exists, and calls `deletePublicationRelations` before deleting the publication. Also assert that `listInstituteTeacherAuthorOptions` exists and does not return `accountUserId`.

Run `node --test scripts/test-publication-authorship-sync.mjs`; expected FAIL on missing imports/calls.

- [ ] **Step 2: Define one Convex validator for normalized author input**

Export this validator from `convex/lib/publicationAuthorships.ts` and reuse it from every publication mutation:

```ts
export const publicationAuthorInputValidator = v.object({
  snapshot: v.string(),
  name: v.string(),
  coFirst: v.boolean(),
  corresponding: v.boolean(),
  tongClassUserId: v.optional(v.id("users")),
  tongClassUsername: v.optional(v.string()),
  institutePersonSlug: v.optional(v.string()),
})
```

- [ ] **Step 3: Wire create/update to prevalidate and atomically sync**

Keep required `authors: v.array(v.string())` and add required `authorDetails: v.array(publicationAuthorInputValidator)` for `create`. Require the submitted `authors` array to equal `authorDetails.map(item => item.snapshot)` exactly, preserving the documented compatibility snapshot while preventing divergent representations. On `update`, keep both fields optional but require them as a pair and reject either one without the other. For create, use:

```ts
const validatedAuthors = await resolvePublicationAuthors(ctx, args.authorDetails)
const authors = validatedAuthors.map((author) => author.snapshot)
if (JSON.stringify(args.authors) !== JSON.stringify(authors)) {
  throw new Error("作者快照与结构化作者信息不一致")
}
const publicationId = await ctx.db.insert("publications", { ...publicationFields, authors })
await syncPublicationAuthorships(ctx, publicationId, validatedAuthors, now)
```

For update, resolve all author details before patching, replace `updates.authors` with the validated snapshots, patch, then sync. Because Convex mutations are transactional, any validation or sync failure leaves neither representation partially written. Preserve `assertPublicationWriteAccess` and venue normalization exactly.

- [ ] **Step 4: Cascade relations on remove**

Call `await deletePublicationRelations(ctx, args.id)` after authorization and before `ctx.db.delete(args.id)`. The helper must be idempotent so retrying cleanup of a partially migrated record cannot fail.

- [ ] **Step 5: Add the signed-in teacher choice query**

Add `listInstituteTeacherAuthorOptions` with `args: {sessionToken: v.string()}`. Authenticate with `getUserBySession`, query public teachers with `by_visibility_kind_order`, keep only rows with `accountUserId`, and return exactly:

```ts
{
  slug: person.slug,
  nameZh: person.nameZh,
  nameEn: person.nameEn,
}
```

Do not expose account IDs, email, hidden profiles, graduates, or unbound people.

- [ ] **Step 6: Run focused tests and codegen**

Run:

```bash
node --test scripts/test-publication-authorship-sync.mjs
npx convex codegen
```

Expected: source/domain tests pass and Convex validation/type generation succeeds locally without a deployment.

- [ ] **Step 7: Commit the mutation integration**

```bash
git add convex/publications.ts convex/lib/publicationAuthorships.ts \
  scripts/test-publication-authorship-sync.mjs
git commit -m "feat(publications): sync authorships on publication writes"
```

### Task 5: Preserve roles in public DTOs without leaking accounts

**Files:**
- Modify: `convex/publications.ts`
- Modify: `convex/instituteContent.ts`
- Modify: `convex/lib/instituteDto.ts`
- Modify: `scripts/test-publication-author-contract.mjs`

- [ ] **Step 1: Add failing safe-DTO source tests**

Extend `scripts/test-publication-author-contract.mjs` to read the three Convex sources and assert:

```js
assert.match(publicationsSource, /authorDetails/)
assert.match(instituteContentSource, /role:\s*"author"\s*\|\s*"corresponding_author"\s*\|\s*"advisor"/)
assert.match(instituteContentSource, /authorOrder:\s*number/)
assert.doesNotMatch(instituteDtoSource, /PublicPublicationAuthor[\s\S]*accountUserId/)
```

Run the test; expected FAIL because public DTOs currently return plain names only.

- [ ] **Step 2: Build safe author details for regular publication queries**

Change `publicationForActor` to async. Owners/admins may retain stored `authors` for editing but receive `authorDetails`; anonymous/non-owner callers receive plain display-name `authors` and `authorDetails`. Load ordered authorships and visible institute people in one helper; map each snapshot index to a `PublicPublicationAuthor`, with an institute `profile` only when the matching authorship person is public. Fall back to the safe snapshot projection for external and Tong Class authors. Never serialize `_id`, `personId`, `userId`, or `accountUserId`.

Update `list`, `getById`, and `search` to `await Promise.all(page.map(...))`; keep pagination and authorization behavior unchanged. `listByUser` remains authenticated and editable but adds safe author details for consistent clients.

- [ ] **Step 3: Preserve role and author order in AIA institute research projection**

In `convex/instituteContent.ts`, change the source type to:

```ts
type PublicationAuthorshipSource = {
  personId: string
  role: "author" | "corresponding_author" | "advisor"
  authorOrder: number
}
```

Build `authorDetails` by parsing each compatibility snapshot, matching authorship by `authorOrder`, setting `corresponding: true` when either the explicit snapshot flag or relation role is `corresponding_author`, and linking only a public institute person slug. Keep the existing `authors` display-name array so filters and old consumers continue to work.

- [ ] **Step 4: Update the duplicate DTO helper consistently**

In `convex/lib/instituteDto.ts`, add `authorDetails` to `InstitutePublicationRecord`/`toPublicInstituteResearch` or delegate to the same safe helper used in `convex/instituteContent.ts`; do not maintain a second incompatible public author shape. The resulting `PublicInstituteResearch` type must be identical from list and detail paths.

- [ ] **Step 5: Run DTO and existing public-content contracts**

Run:

```bash
node --test scripts/test-publication-author-contract.mjs \
  scripts/test-aia-shared-publications.mjs \
  scripts/test-aia-public-account-surface.mjs
```

Expected: all pass, including the no-account-ID public boundary.

- [ ] **Step 6: Commit the safe DTO integration**

```bash
git add convex/publications.ts convex/instituteContent.ts convex/lib/instituteDto.ts \
  scripts/test-publication-author-contract.mjs
git commit -m "feat(publications): expose safe corresponding author details"
```

### Task 6: Add institute teacher selection to the existing author editor

**Files:**
- Modify: `src/lib/api.ts: publication hook section near usePublications`
- Modify: `src/components/publications/publication-author-editor.tsx`
- Modify: `src/app/my-publications/[id]/page.tsx`
- Modify: `src/app/admin/publications/[id]/page.tsx`
- Modify: `scripts/test-publication-author-contract.mjs`

- [ ] **Step 1: Add failing editor and canonical-hook contracts**

Assert the editor source contains `instituteTeacherOptions`, `institutePersonSlug`, `toPublicationAuthorInput`, the Chinese labels `关联研究院教师` and `通讯作者`, and that both edit pages use `usePublicationTeacherAuthorOptions`. Assert neither page imports from `convex/`.

Run `node --test scripts/test-publication-author-contract.mjs`; expected FAIL on the new selector/hook strings.

- [ ] **Step 2: Add the one canonical API hook in the serialized integration window**

Near the other publication function references in `src/lib/api.ts`, add:

```ts
const listInstituteTeacherAuthorOptionsRef = makeFunctionReference<"query">(
  "publications:listInstituteTeacherAuthorOptions",
)
```

Near `usePublications`, add:

```ts
export function usePublicationTeacherAuthorOptions() {
  const sessionToken = useTongClassSessionToken()
  return useQuery(
    listInstituteTeacherAuthorOptionsRef,
    sessionToken ? { sessionToken } : "skip",
  ) as Array<{ slug: string; nameZh: string; nameEn: string }> | undefined
}
```

The program coordinator applies this bounded insertion after teacher-recognition/news/Word have declared their references; preserve all concurrent hooks.

- [ ] **Step 3: Extend the editor contract rather than rewrite it**

Add props:

```ts
type InstituteTeacherAuthorOption = { slug: string; nameZh: string; nameEn: string }

type PublicationAuthorEditorProps = {
  value: string[]
  users: User[]
  instituteTeacherOptions: InstituteTeacherAuthorOption[]
  onChange: (authors: string[]) => void
  onStructuredChange: (authors: PublicationAuthorInput[]) => void
  onValidationChange?: (hasInvalidSelection: boolean) => void
  error?: string
}
```

Keep existing row matching/confirmation behavior. Add a shadcn `Select` labeled `关联研究院教师（可选）`; selecting an option sets `institutePersonSlug`, uses `nameEn || nameZh` only when the row name is blank, and does not inject an account ID. Clearing the selection removes only `institutePersonSlug`. Render the existing checkboxes with Chinese labels `共同第一作者` and `通讯作者`; keep external corresponding authors valid.

- [ ] **Step 4: Emit both representations from one row state**

Inside `emitChange`, build the encoded snapshots once and call:

```ts
const structured = nextRows
  .filter((row) => row.name.trim())
  .map((row) => toPublicationAuthorInput(row))
onChange(structured.map((row) => row.snapshot))
onStructuredChange(structured)
```

Treat a teacher slug absent from current options as invalid; this catches a profile hidden/unbound after the page loaded, while the server remains authoritative.

- [ ] **Step 5: Wire both publication forms**

In each edit page, call `usePublicationTeacherAuthorOptions()`, maintain `PublicationAuthorInput[]` beside the existing `authors` snapshot, initialize it by parsing loaded authors, pass both editor callbacks, and submit `authorDetails` with the other publication fields. On update, never send `authors` without the matching `authorDetails` array.

- [ ] **Step 6: Run focused tests and lint changed UI**

Run:

```bash
node --test scripts/test-publication-author-contract.mjs \
  scripts/test-publication-author-normalization.mjs
npm run lint
```

Expected: tests pass and ESLint exits with zero warnings.

- [ ] **Step 7: Commit editor integration**

```bash
git add src/lib/api.ts src/components/publications/publication-author-editor.tsx \
  'src/app/my-publications/[id]/page.tsx' \
  'src/app/admin/publications/[id]/page.tsx' \
  scripts/test-publication-author-contract.mjs
git commit -m "feat(publications): bind institute teachers in author editor"
```

### Task 7: Render corresponding authors consistently in lists and details

**Files:**
- Modify: `src/components/publications/publication-authors-list.tsx`
- Modify: `src/components/content/publication-archive.tsx`
- Modify: `src/components/content/tong-class-publication-archive.tsx`
- Modify: `src/app/tong-class/publications/page.tsx`
- Modify: `src/app/research/page.tsx`
- Modify: `src/app/tong-class/publications/[id]/page.tsx`
- Modify: `scripts/test-publication-author-contract.mjs`

- [ ] **Step 1: Add failing semantic presentation tests**

Assert that `PublicationAuthorsList` accepts `authorDetails`, contains visible text `通讯作者`, gives the icon `aria-hidden="true"`, constructs `/people/` only from `profile.kind === "institute_person"`, and keeps `/tong-class/members/` for safe member usernames. Assert both archives and the detail page pass `authorDetails`.

Run `node --test scripts/test-publication-author-contract.mjs`; expected FAIL because the current component shows only an icon and links by account metadata.

- [ ] **Step 2: Update the author list with a safe fallback**

Use this prop contract:

```ts
type PublicationAuthorsListProps = {
  authors: string[]
  authorDetails?: PublicPublicationAuthor[]
  emphasizedUserId?: string
  className?: string
}
```

For each index, prefer `authorDetails[index]`; otherwise safely parse the legacy snapshot. Render a restrained inline marker:

```tsx
{author.corresponding ? (
  <span className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
    <Mail className="h-3 w-3" aria-hidden="true" />
    通讯作者
  </span>
) : null}
```

Do not add a row background or saturated highlight. Link institute profiles to `/people/${encodeURIComponent(slug)}` and member profiles to `/tong-class/members/${encodeURIComponent(slug)}`. Never construct a link from `userId`.

- [ ] **Step 3: Carry details through archive item types and pages**

Add `authorDetails?: PublicPublicationAuthor[]` to `PublicationArchiveItem`; pass it to `PublicationAuthorsList` in both archive components. Include `authorDetails` in the Tong Class page mapping and pass it directly from `PublicInstituteResearch` on `/research`. On the detail page render:

```tsx
<PublicationAuthorsList
  authors={publication.authors}
  authorDetails={publication.authorDetails}
/>
```

- [ ] **Step 4: Run list/detail contracts**

Run:

```bash
node --test scripts/test-publication-author-contract.mjs \
  scripts/test-aia-shared-publications.mjs \
  scripts/test-tong-class-publications-style-source.mjs
```

Expected: all pass; existing AIA and Tong Class archive styles remain unchanged apart from the inline semantic label.

- [ ] **Step 5: Commit corresponding-author presentation**

```bash
git add src/components/publications/publication-authors-list.tsx \
  src/components/content/publication-archive.tsx \
  src/components/content/tong-class-publication-archive.tsx \
  src/app/tong-class/publications/page.tsx src/app/research/page.tsx \
  'src/app/tong-class/publications/[id]/page.tsx' \
  scripts/test-publication-author-contract.mjs
git commit -m "feat(publications): label corresponding authors"
```

### Task 8: Show directly linked papers on teacher profiles

**Files:**
- Modify: `src/components/institute/live-directory-view-model.ts`
- Modify: `src/components/institute/demo-directory-data.ts`
- Modify: `src/components/institute/live-person-profile.tsx`
- Modify: `src/components/institute/person-profile.tsx`
- Modify: `src/components/institute/research-output-list.tsx`
- Create: `scripts/test-teacher-related-publications.mjs`

- [ ] **Step 1: Write the failing teacher-profile contract**

Create `scripts/test-teacher-related-publications.mjs` to assert that `PersonProfile` renders a teacher `ResearchOutputList` headed `相关论文`, that `LivePersonProfile` passes the current person slug into the view-model mapper, that the output model contains `isCorrespondingContributor`, and that `ResearchOutputList` renders `通讯作者` when that flag is true. Assert no group-wide query is added to `LivePersonProfile`.

Run:

```bash
node --test scripts/test-teacher-related-publications.mjs
```

Expected: FAIL because teacher output sections are currently hidden and the view model drops roles.

- [ ] **Step 2: Preserve the current person's role in the directory view model**

Add `isCorrespondingContributor?: boolean` to `PublicResearchOutput` in `demo-directory-data.ts`. Change the mapper signature to:

```ts
export function toDirectoryResearchOutput(
  item: PublicInstituteResearch,
  returnTo: string,
  personSlug?: string,
): PublicResearchOutput
```

Set `isCorrespondingContributor` when `personSlug` is present and `item.authorDetails.some(author => author.profile?.kind === "institute_person" && author.profile.slug === personSlug && author.corresponding)`. Preserve group callers by leaving the argument optional.

- [ ] **Step 3: Pass the exact profiled slug**

In `LivePersonProfile`, change only the output mapping:

```ts
outputs={research.map((item) =>
  toDirectoryResearchOutput(item, `/people/${slug}`, slug)
)}
```

The backend `personSlug` filter already reads `publicationAuthorships`, so this list contains directly linked papers only; do not merge research-group-wide candidates into it.

- [ ] **Step 4: Add the compact AIA teacher section**

In `PersonProfile`, render this immediately after the biography/research-area block for teachers:

```tsx
{person.kind === "teacher" ? (
  <div className="mt-12">
    <ResearchOutputList
      outputs={relatedOutputs}
      heading="相关论文"
      emptyMessage="暂未发布与该教师直接关联的论文。"
      showSummary={false}
      underlineTitleLinks={false}
    />
  </div>
) : null}
```

Keep the existing graduate team/output/update layout. In `ResearchOutputList`, add a small AIA-muted inline `Mail` icon and `通讯作者` text next to year when `output.isCorrespondingContributor` is true.

- [ ] **Step 5: Run profile and directory contracts**

Run:

```bash
node --test scripts/test-teacher-related-publications.mjs \
  scripts/test-aia-shared-publications.mjs \
  scripts/test-people-tong-class-entry-source.mjs
npm run lint
```

Expected: all tests and lint pass; teacher papers are compact and graduate/group views remain intact.

- [ ] **Step 6: Commit the teacher profile projection**

```bash
git add src/components/institute/live-directory-view-model.ts \
  src/components/institute/demo-directory-data.ts \
  src/components/institute/live-person-profile.tsx \
  src/components/institute/person-profile.tsx \
  src/components/institute/research-output-list.tsx \
  scripts/test-teacher-related-publications.mjs
git commit -m "feat(people): show directly related teacher papers"
```

### Task 9: Add the standalone idempotent legacy backfill

**Files:**
- Create: `convex/publicationAuthorshipMigration.ts`
- Create: `convex/lib/publicationAuthorshipMigration.ts`
- Create: `scripts/test-publication-authorship-migration.mjs`
- Create: `scripts/publication-authorship-migration/README.md`

- [ ] **Step 1: Write failing pure migration classification tests**

Create `scripts/test-publication-authorship-migration.mjs` to import `classifyLegacyPublicationAuthors`. Cover explicit valid legacy `userId`, external authors, malformed metadata, missing account binding, multiple person bindings, graduate binding, repeated existing natural key, and corresponding role. The repeated row must classify as `unchanged`, never `insert`.

- [ ] **Step 2: Run the migration tests and verify RED**

Run:

```bash
node --test scripts/test-publication-authorship-migration.mjs
```

Expected: FAIL because the migration helper does not exist.

- [ ] **Step 3: Implement the pure classifier**

`classifyLegacyPublicationAuthors(publication, peopleByAccountId, existingByNaturalKey, now)` must parse only explicit encoded `userId`; never match `name`, `nameZh`, or `nameEn`. Emit one of:

```ts
type MigrationDecision =
  | { kind: "insert"; value: PlannedAuthorshipInsert }
  | { kind: "patch"; id: string; value: PlannedAuthorshipPatch }
  | { kind: "unchanged"; naturalKey: string }
  | { kind: "skipped"; authorOrder: number; reason: "external_or_unlinked" | "malformed_metadata" }
  | { kind: "conflict"; authorOrder: number; reason: "missing_binding" | "multiple_bindings" | "not_teacher" }
```

Preserve author order and set role from the explicit legacy `corresponding` flag.

- [ ] **Step 4: Implement a manual cursor-batched mutation**

In `convex/publicationAuthorshipMigration.ts`, export `backfillBatch` with arguments:

```ts
{
  sessionToken: v.string(),
  cursor: v.optional(v.string()),
  numItems: v.optional(v.number()),
}
```

Require `super_admin` through existing reviewer/session authorization, clamp `numItems` to 1–100, paginate publications, load exact `institutePeople.by_accountUserId` bindings for explicit legacy IDs, apply decisions idempotently, and return:

```ts
{
  scanned,
  inserted,
  updated,
  unchanged,
  skipped,
  conflicts: Array<{ publicationId: string; authorOrder: number; reason: string }>,
  nextCursor: page.continueCursor,
  isDone: page.isDone,
}
```

If a batch is interrupted, rerunning the same cursor performs only unchanged/necessary patches because the natural key is deterministic.

- [ ] **Step 5: Document a local/manual-only runbook**

The README must state that the migration is not connected to `dev`, `build`, `start`, `postinstall`, CI, or deployment. Document preflight inspection, a 10-row dry observation using the pure test, then local-development `npx convex run publicationAuthorshipMigration:backfillBatch` calls without `--prod`; explicitly forbid silverfish and production. Require operators to retain every returned conflict report and feed `nextCursor` into the next manual call.

- [ ] **Step 6: Verify repeat-run and interrupted batches**

Run:

```bash
node --test scripts/test-publication-authorship-migration.mjs
npx convex codegen
```

Expected: migration cases pass and local codegen succeeds. Do not execute `backfillBatch` against any remote deployment during implementation.

- [ ] **Step 7: Commit the migration separately**

```bash
git add convex/publicationAuthorshipMigration.ts \
  convex/lib/publicationAuthorshipMigration.ts \
  scripts/test-publication-authorship-migration.mjs \
  scripts/publication-authorship-migration/README.md
git commit -m "feat(migrations): backfill publication authorships idempotently"
```

### Task 10: Integrated verification and AIA visual/accessibility pass

**Files:**
- Verify: all files changed in Tasks 1–9
- Do not modify: `package.json` scripts

- [ ] **Step 1: Run every focused publication contract**

```bash
node --test scripts/test-publication-author-contract.mjs \
  scripts/test-publication-authorship-sync.mjs \
  scripts/test-publication-authorship-migration.mjs \
  scripts/test-teacher-related-publications.mjs \
  scripts/test-publication-author-normalization.mjs \
  scripts/test-aia-shared-publications.mjs \
  scripts/test-tong-class-publications-style-source.mjs \
  scripts/test-aia-public-account-surface.mjs
```

Expected: all tests pass with exit code 0.

- [ ] **Step 2: Run repository quality gates**

```bash
npm run lint
npm run build
```

Expected: ESLint has zero warnings and the build succeeds. `npm run build` may run local Convex codegen per the existing script; inspect the configured deployment first and do not proceed if it is silverfish or production. Never append `--prod` and never deploy.

- [ ] **Step 3: Exercise the author state matrix locally**

On the isolated development worktree, verify: external author; external corresponding author; Tong Class member; public bound teacher; reordering; role change; removal; duplicate teacher rejection; hidden/unbound teacher rejection; update authorization; delete cascade. Reload list/detail pages after every saved mutation and confirm no account IDs appear in page source or query payloads returned to anonymous callers.

- [ ] **Step 4: Perform the AIA visual and accessibility check**

At 375 px and 1440 px, inspect `/research`, `/tong-class/publications`, a publication detail, and a teacher `/people/:slug` page. Confirm the marker is a restrained mail icon plus visible `通讯作者`, keyboard focus reaches author profile links and selectors, icon-only decoration is `aria-hidden`, profile links have visible focus, no full-row saturated highlight was introduced, and the teacher section uses existing AIA serif/mono/rule tokens.

- [ ] **Step 5: Inspect the final scope and forbidden changes**

```bash
git diff --check
git status --short
git diff -- package.json package-lock.json
rg -n "silverfish|--prod|deploy" \
  convex/publicationAuthorshipMigration.ts \
  scripts/publication-authorship-migration/README.md
```

Expected: no whitespace errors; dependency manifests are unchanged; no production/deploy command was added; any `silverfish`/`--prod` text appears only in explicit prohibition language in the runbook.

- [ ] **Step 6: Commit only verification-driven corrections**

```bash
git add convex src scripts docs/superpowers/plans/2026-08-13-publication-corresponding-author-implementation.md
git commit -m "test(publications): verify corresponding author workflow"
```

If there are no verification corrections, skip this commit instead of creating an empty commit.

## Plan self-review

- **Spec coverage:** Tasks 1–7 cover compatibility snapshot plus canonical relation writes, all three author cases, validation, atomicity, public safe DTOs, semantic display, and profile links. Task 8 limits teacher profiles to directly related publications and preserves group-wide outputs on group pages. Task 9 covers explicit-ID-only, manual, batched, repeatable migration and conflict reporting. Task 10 covers lint/build and AIA visual/accessibility verification.
- **Security and privacy:** Public DTOs never expose account IDs; server validation rejects forged/hidden/unbound/non-teacher relations; existing owner/admin write authorization is preserved; failed mutations are transactional; deletion uses bounded indexed cascades.
- **Cross-plan consistency:** Only the shared schema owner edits `convex/schema.ts`; `src/lib/api.ts` is integrated serially; no teacher-recognition permission, news review, OA, Word, lifecycle script, deployment, production, or silverfish behavior is touched.
- **Type consistency:** `PublicationAuthorInput` is the single client/server write shape; `PublicPublicationAuthor` is the single public shape; `authorDetails` is optional on legacy Tong Class `Publication` but required on `PublicInstituteResearch`; `profile.slug` is the only public link identifier.
