# AIA Directory, Coffee Talk, and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a privacy-safe institute people/group directory with clearly marked demo data, then implement the first real AIA service: Coffee Talk applications and in-app notifications.

**Architecture:** Institute profile data lives in new institution-specific tables rather than being inferred from raw user records. Coffee Talk is an independent server-authorized state machine that references an explicitly linked teacher person/account, creates append-only history and minimal notification projections, and deliberately excludes scheduling, room booking, attachments, chat, and WeChat integration.

**Tech Stack:** Convex schema/query/mutation modules, TypeScript, Next.js App Router, React hooks in `src/lib/api.ts`, Node `node:test`.

---

## Dependencies and file ownership

Do not start this plan until the AIA foundation plan provides `requireSessionActor`, `requireSystemRole`, public DTO conventions, optional `users.identityType`, and optional `users.accountStatus`. Each React component in this plan must consume the hooks defined in `src/lib/api.ts`, never `convex/react` or `convex/_generated/api` directly.

| Path | Responsibility |
| --- | --- |
| `convex/instituteDirectory.ts` | Public directory DTO queries and admin person/group management. |
| `convex/instituteContent.ts` | Institute-scoped publication/news projections and structured content relations. |
| `convex/lib/institute-dto.ts` | Explicit public DTO field allow-lists. |
| `convex/coffeeTalk.ts` | Coffee Talk reads/mutations and record-level actor checks. |
| `convex/lib/coffeeTalk.ts` | Pure state transitions, fingerprints, safe notification text, and DTO redaction. |
| `convex/notifications.ts` | Current-user notification inbox actions only. |
| `convex/lib/notifications.ts` | Internal idempotent notification projection helper. |
| `src/components/institute/**` | Public people/group pages and later admin editors. |
| `src/components/coffee-talk/**` | Coffee Talk forms, queues, details, and append-only history display. |
| `src/components/notifications/**` | Bell and inbox; notification content grants no resource access. |

### Task 1: Add institute directory schema and pure DTO contracts

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/lib/institute-dto.ts`
- Create: `scripts/test-institute-directory.mjs`
- Create: `src/types/institute.ts`

- [ ] **Step 1: Write the failing DTO and membership-invariant tests.**

```js
// scripts/test-institute-directory.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { toPublicInstitutePerson, validateGroupMemberships } from "../convex/lib/institute-dto.ts";

test("public institute person DTO never exposes account linkage", () => {
  const dto = toPublicInstitutePerson({
    _id: "person-1", accountUserId: "user-1", nameZh: "张三", nameEn: "Zhang San",
    kind: "teacher", visibility: "public", researchAreas: ["Learning"],
    publicEmail: "person@pku.edu.cn", coffeeTalkOpen: true, isDemo: true,
  });
  assert.deepEqual(dto, {
    slug: undefined, nameZh: "张三", nameEn: "Zhang San", kind: "teacher",
    researchAreas: ["Learning"], publicEmail: "person@pku.edu.cn", coffeeTalkOpen: true, isDemo: true,
  });
  assert.equal("accountUserId" in dto, false);
  assert.equal("_id" in dto, false);
});

test("a research-group leader has exactly one active leader membership", () => {
  assert.throws(() => validateGroupMemberships("person-1", [
    { personId: "person-1", role: "faculty", endedAt: undefined },
  ]), /INSTITUTE_LEADER_MEMBERSHIP_REQUIRED/);
});
```

- [ ] **Step 2: Run the test and verify it fails because the DTO module is absent.**

Run: `node --test scripts/test-institute-directory.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `convex/lib/institute-dto.ts`.

- [ ] **Step 3: Add the additive database tables and safe types.**

Add the following new tables and indexes to `convex/schema.ts`; use existing Convex `v` imports and exact table names:

```ts
institutePeople: defineTable({
  slug: v.string(), kind: v.union(v.literal("teacher"), v.literal("graduate")),
  nameZh: v.string(), nameEn: v.string(), titleZh: v.optional(v.string()), titleEn: v.optional(v.string()),
  bioZh: v.optional(v.string()), bioEn: v.optional(v.string()), photoUrl: v.optional(v.string()),
  researchAreas: v.array(v.string()),
  publicLinks: v.array(v.object({ kind: v.union(v.literal("homepage"), v.literal("scholar"), v.literal("orcid"), v.literal("github"), v.literal("other")), label: v.string(), href: v.string() })),
  publicEmail: v.optional(v.string()), coffeeTalkOpen: v.optional(v.boolean()),
  visibility: v.union(v.literal("public"), v.literal("hidden")), displayOrder: v.number(), isDemo: v.boolean(),
  accountUserId: v.optional(v.id("users")), createdAt: v.number(), updatedAt: v.number(),
}).index("by_slug", ["slug"]).index("by_visibility_kind_order", ["visibility", "kind", "displayOrder"]).index("by_accountUserId", ["accountUserId"]),
researchGroups: defineTable({
  slug: v.string(), nameZh: v.string(), nameEn: v.string(), summaryZh: v.optional(v.string()), summaryEn: v.optional(v.string()),
  descriptionZh: v.optional(v.string()), descriptionEn: v.optional(v.string()), leaderPersonId: v.id("institutePeople"),
  researchAreas: v.array(v.string()), publicLinks: v.array(v.object({ label: v.string(), href: v.string() })),
  recruitmentZh: v.optional(v.string()), recruitmentEn: v.optional(v.string()), visibility: v.union(v.literal("public"), v.literal("hidden")),
  displayOrder: v.number(), isDemo: v.boolean(), createdAt: v.number(), updatedAt: v.number(),
}).index("by_slug", ["slug"]).index("by_visibility_order", ["visibility", "displayOrder"]).index("by_leaderPersonId", ["leaderPersonId"]),
researchGroupMemberships: defineTable({
  personId: v.id("institutePeople"), researchGroupId: v.id("researchGroups"),
  role: v.union(v.literal("leader"), v.literal("faculty"), v.literal("graduate"), v.literal("member")),
  isPrimary: v.boolean(), startedAt: v.optional(v.number()), endedAt: v.optional(v.number()),
  visibility: v.union(v.literal("public"), v.literal("hidden")), sortOrder: v.number(), createdAt: v.number(), updatedAt: v.number(),
}).index("by_person_group", ["personId", "researchGroupId"]).index("by_group_order", ["researchGroupId", "sortOrder"]).index("by_person_order", ["personId", "sortOrder"]),
```

Also add `publicationAuthorships` and `contentMentions` with their unique natural-key indexes as defined in the design specification. Add optional `siteScope: "tong_class" | "institute"` and `visibility: "public" | "hidden"` fields to `publications` and optional `siteScope` to `news`; treat absent old values as Tong Class in query logic.

- [ ] **Step 4: Implement exact DTO/relationship helpers.**

```ts
// convex/lib/institute-dto.ts
export function toPublicInstitutePerson(person: Record<string, unknown>) {
  const p = person as { slug?: string; nameZh: string; nameEn: string; kind: "teacher" | "graduate"; titleZh?: string; titleEn?: string; photoUrl?: string; researchAreas: string[]; publicEmail?: string; coffeeTalkOpen?: boolean; isDemo: boolean };
  return { slug: p.slug, nameZh: p.nameZh, nameEn: p.nameEn, kind: p.kind,
    ...(p.titleZh ? { titleZh: p.titleZh } : {}), ...(p.titleEn ? { titleEn: p.titleEn } : {}),
    ...(p.photoUrl ? { photoUrl: p.photoUrl } : {}), researchAreas: p.researchAreas,
    ...(p.publicEmail ? { publicEmail: p.publicEmail } : {}), ...(p.coffeeTalkOpen !== undefined ? { coffeeTalkOpen: p.coffeeTalkOpen } : {}), isDemo: p.isDemo };
}
export function validateGroupMemberships(leaderPersonId: string, memberships: Array<{ personId: string; role: string; endedAt?: number }>) {
  if (memberships.filter((m) => m.personId === leaderPersonId && m.role === "leader" && m.endedAt === undefined).length !== 1) {
    throw new Error("INSTITUTE_LEADER_MEMBERSHIP_REQUIRED");
  }
}
```

Define the matching public types in `src/types/institute.ts` without Convex IDs, user IDs, user account status, or private emails.

- [ ] **Step 5: Run the tests and generate Convex types.**

Run: `node --test scripts/test-institute-directory.mjs && npx convex codegen`

Expected: both directory test cases pass; codegen succeeds only after the foundation target gate has approved the development environment.

- [ ] **Step 6: Commit schema and contract types together.**

```bash
git add convex/schema.ts convex/lib/institute-dto.ts scripts/test-institute-directory.mjs src/types/institute.ts
git commit -m "feat(institute): add directory schema and public DTO contracts"
```

### Task 2: Implement public directory/content queries and controlled admin writes

**Files:**
- Create: `convex/instituteDirectory.ts`
- Create: `convex/instituteContent.ts`
- Modify: `src/lib/api.ts`
- Modify: `documents/api.md`
- Create: `scripts/test-institute-content-relations.mjs`

- [ ] **Step 1: Write failing content-relation tests.**

```js
// scripts/test-institute-content-relations.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDoi, contentMentionNaturalKey } from "../convex/instituteContent.ts";

test("DOI normalization and explicit relation keys do not infer people from names", () => {
  assert.equal(normalizeDoi("https://doi.org/10.1000/ABC.1"), "10.1000/abc.1");
  assert.equal(contentMentionNaturalKey("publication", "pub-1", "person", "person-1", "featured"), "publication:pub-1:person:person-1:featured");
});
```

- [ ] **Step 2: Run the test and verify missing module failure.**

Run: `node --test scripts/test-institute-content-relations.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `convex/instituteContent.ts`.

- [ ] **Step 3: Implement public queries with field allow-lists.**

`convex/instituteDirectory.ts` must export these public queries: `listPublicPeople`, `getPublicPerson`, `listPublicResearchGroups`, and `getPublicResearchGroup`. Each query accepts only documented filters (`kind`, `researchArea`, `query`, and bounded `limit`) and returns only `toPublicInstitutePerson` / explicit group DTOs. It must never accept `includeHidden`, account id, or client-supplied role.

Add server-authorized mutations `adminUpsertInstitutePerson`, `adminSetInstitutePersonVisibility`, `adminUpsertResearchGroup`, and `adminReplaceResearchGroupMemberships`. Each resolves the session actor and requires `admin` or `super_admin` according to the foundation policy. `adminReplaceResearchGroupMemberships` must validate every referenced person/group before changes, require exactly one leader membership for the group leader, then replace active rows atomically so no duplicate active natural key remains.

`convex/instituteContent.ts` must export `normalizeDoi`, `contentMentionNaturalKey`, public institute research/update queries, and admin mutations for explicit authorships/mentions/surface assignment. It must not parse an author name or news text to create a person relation.

- [ ] **Step 4: Add hooks at the only client boundary.**

Add `usePublicInstitutePeople`, `usePublicInstitutePerson`, `usePublicResearchGroups`, `usePublicResearchGroup`, `usePublicInstituteResearch`, `usePublicInstituteUpdates`, and separately named admin hooks in `src/lib/api.ts`. Use DTO types from `src/types/institute.ts`; no component in this plan may call raw generated APIs.

- [ ] **Step 5: Run contract tests and lint.**

Run: `node --test scripts/test-institute-directory.mjs scripts/test-institute-content-relations.mjs && npm run lint`

Expected: all tests pass; lint exits zero.

- [ ] **Step 6: Commit the directory/data API boundary.**

```bash
git add convex/instituteDirectory.ts convex/instituteContent.ts src/lib/api.ts \
  documents/api.md scripts/test-institute-content-relations.mjs
git commit -m "feat(institute): add safe directory and content APIs"
```

### Task 3: Seed demo teachers, graduate students, and groups idempotently

**Files:**
- Create: `convex/aiaDemoSeed.ts`
- Create: `scripts/aia-dev-data/seed-aia-demo.mjs`
- Create: `scripts/test-aia-directory-seed.mjs`

- [ ] **Step 1: Write failing seed behavior tests.**

```js
// scripts/test-aia-directory-seed.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { classifyDemoUpsert } from "../convex/aiaDemoSeed.ts";

test("a matching demo slug is updated but a non-demo collision is rejected", () => {
  assert.equal(classifyDemoUpsert({ slug: "demo-teacher", isDemo: true }, "demo-teacher"), "update");
  assert.throws(() => classifyDemoUpsert({ slug: "faculty", isDemo: false }, "faculty"), /AIA_DEMO_SLUG_CONFLICT/);
});
```

- [ ] **Step 2: Run the test before seed helpers exist.**

Run: `node --test scripts/test-aia-directory-seed.mjs`

Expected: import failure for `aiaDemoSeed.ts`.

- [ ] **Step 3: Implement deterministic target-only demo seed.**

```ts
// convex/aiaDemoSeed.ts
export function classifyDemoUpsert(existing: { slug: string; isDemo: boolean } | null, slug: string) {
  if (!existing) return "create";
  if (existing.isDemo) return "update";
  throw new Error("AIA_DEMO_SLUG_CONFLICT");
}
```

Add a secret/development-gated mutation that upserts a fixed set of Chinese/English teacher, graduate, and group profiles using stable slugs, stable relation natural keys, `isDemo: true`, no account linkage, no default credentials, and no real contact data. It returns `{ created, updated, skipped, conflicts }`. `seed-aia-demo.mjs` must use the foundation target gate, require `--target bold-sandpiper-236 --confirm-target bold-sandpiper-236`, and run no mutation automatically.

- [ ] **Step 4: Run the pure seed test.**

Run: `node --test scripts/test-aia-directory-seed.mjs`

Expected: one passing test and no remote write.

- [ ] **Step 5: Perform the allowed development-only seed twice after schema/API deployment.**

Run:

```bash
node scripts/aia-dev-data/seed-aia-demo.mjs --env-file .env.aia-dev.local \
  --target bold-sandpiper-236 --confirm-target bold-sandpiper-236 --run-id aia-demo-001
node scripts/aia-dev-data/seed-aia-demo.mjs --env-file .env.aia-dev.local \
  --target bold-sandpiper-236 --confirm-target bold-sandpiper-236 --run-id aia-demo-001
```

Expected: first run reports only aggregate created/updated/skipped counts; second run reports `created: 0`; neither command prints demo record bodies.

- [ ] **Step 6: Commit the standalone demo seed.**

```bash
git add convex/aiaDemoSeed.ts scripts/aia-dev-data/seed-aia-demo.mjs scripts/test-aia-directory-seed.mjs
git commit -m "feat(demo): add idempotent AIA directory demo seed"
```

### Task 4: Build public people, group, research, and update pages

**Files:**
- Create: `src/components/institute/people-directory.tsx`
- Create: `src/components/institute/person-profile.tsx`
- Create: `src/components/institute/research-group-directory.tsx`
- Create: `src/components/institute/research-group-profile.tsx`
- Create: `src/components/institute/research-output-list.tsx`
- Create: `src/app/people/page.tsx`
- Create: `src/app/people/[slug]/page.tsx`
- Create: `src/app/groups/page.tsx`
- Create: `src/app/groups/[slug]/page.tsx`
- Modify: `src/app/research/page.tsx`
- Modify: `src/app/updates/page.tsx`

- [ ] **Step 1: Write a failing source contract test for safe data access.**

```js
// append to scripts/test-institute-directory.mjs
import { readFileSync } from "node:fs";
test("public directory components use the API hook boundary", () => {
  const source = readFileSync("src/components/institute/people-directory.tsx", "utf8");
  assert.match(source, /usePublicInstitutePeople/);
  assert.doesNotMatch(source, /convex\/_generated\/api|from "convex\/react"/);
});
```

- [ ] **Step 2: Run the test and verify the component does not exist yet.**

Run: `node --test scripts/test-institute-directory.mjs`

Expected: `ENOENT` for `people-directory.tsx`.

- [ ] **Step 3: Implement responsive public directory components.**

`PeopleDirectory` must filter only the public DTO array, link by slug, label each `isDemo` record as “演示数据”, and have a semantic heading/list. `PersonProfile` must render only public fields; show the Coffee Talk link only when `kind === "teacher" && coffeeTalkOpen === true`, and never manufacture a teacher id in the URL. Group and research components must use the corresponding public hooks and safely render empty/loading/not-found states.

- [ ] **Step 4: Run component/source tests and lint.**

Run: `node --test scripts/test-institute-directory.mjs && npm run lint`

Expected: all directory contract tests pass and lint exits zero.

- [ ] **Step 5: Commit the public institute directory.**

```bash
git add src/components/institute src/app/people src/app/groups src/app/research/page.tsx src/app/updates/page.tsx scripts/test-institute-directory.mjs
git commit -m "feat(directory): add public AIA people and group pages"
```

### Task 5: Define notification storage and safe projection primitives

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/lib/notifications.ts`
- Create: `convex/notifications.ts`
- Create: `scripts/test-user-notifications.mjs`
- Modify: `src/lib/api.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write failing notification safety tests.**

```js
// scripts/test-user-notifications.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { toSafeNotification, notificationKey } from "../convex/lib/notifications.ts";

test("notification projections have a stable recipient key and a relative deep link", () => {
  assert.equal(notificationKey("coffee-talk", "app-1", 2, "user-1"), "coffee-talk:app-1:v2:user-1");
  assert.deepEqual(toSafeNotification({ title: "Coffee Talk 申请状态更新", href: "/services/coffee-talk/my" }), {
    title: "Coffee Talk 申请状态更新", href: "/services/coffee-talk/my",
  });
});
test("external deep links are rejected", () => {
  assert.throws(() => toSafeNotification({ title: "x", href: "https://evil.example" }), /NOTIFICATION_HREF_INVALID/);
});
```

- [ ] **Step 2: Run the test and verify the library is absent.**

Run: `node --test scripts/test-user-notifications.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `convex/lib/notifications.ts`.

- [ ] **Step 3: Add the notifications table and internal-only helper.**

Add `userNotifications` to `convex/schema.ts` with `recipientUserId`, `eventRecipientKey`, `resourceType: "coffeeTalk" | "approvalWorkflow"`, `resourceId`, whitelisted `type`, `title`, optional `body`, relative `href`, `state: "unread" | "read" | "archived"`, and timestamps. Add indexes `by_recipient_createdAt`, `by_recipient_state_createdAt`, and `by_event_recipient`.

```ts
// convex/lib/notifications.ts
export const notificationKey = (resourceType: string, resourceId: string, version: number, recipientId: string) =>
  `${resourceType}:${resourceId}:v${version}:${recipientId}`;
export function toSafeNotification(value: { title: string; href: string }) {
  if (!value.href.startsWith("/") || value.href.startsWith("//")) throw new Error("NOTIFICATION_HREF_INVALID");
  return { title: value.title, href: value.href };
}
```

`upsertNotificationProjection` must be an unexported helper that inserts or returns the record keyed by `eventRecipientKey`; it must not be a public generic send-notification mutation.

- [ ] **Step 4: Implement current-user inbox operations.**

`convex/notifications.ts` must expose `listMine`, `unreadCount`, `markRead`, `archive`, and `markAllRead`. Each calls `requireSessionActor`, filters strictly by `recipientUserId === actor.userId`, and returns a safe DTO. Add matching hooks in `src/lib/api.ts` and types in `src/types/index.ts`.

- [ ] **Step 5: Run notification tests and lint.**

Run: `node --test scripts/test-user-notifications.mjs && npm run lint`

Expected: both notification tests pass and lint exits zero.

- [ ] **Step 6: Commit the notification foundation.**

```bash
git add convex/schema.ts convex/lib/notifications.ts convex/notifications.ts src/lib/api.ts src/types/index.ts scripts/test-user-notifications.mjs
git commit -m "feat(notifications): add private AIA in-app notification inbox"
```

### Task 6: Implement the Coffee Talk state-machine contract before persistence

**Files:**
- Create: `convex/lib/coffeeTalk.ts`
- Create: `scripts/test-coffee-talk.mjs`
- Modify: `convex/schema.ts`

- [ ] **Step 1: Write failing state-transition/idempotency tests.**

```js
// scripts/test-coffee-talk.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { transitionCoffeeTalk, requestFingerprint } from "../convex/lib/coffeeTalk.ts";

test("teacher can review, request information, accept, and complete in order", () => {
  assert.equal(transitionCoffeeTalk("submitted", "teacher", "start_review"), "under_review");
  assert.equal(transitionCoffeeTalk("under_review", "teacher", "request_information"), "needs_information");
  assert.equal(transitionCoffeeTalk("under_review", "teacher", "accept"), "accepted");
  assert.equal(transitionCoffeeTalk("accepted", "teacher", "complete"), "completed");
});
test("terminal records cannot be reopened and fingerprints are stable", () => {
  assert.throws(() => transitionCoffeeTalk("declined", "teacher", "start_review"), /COFFEE_TALK_TRANSITION_FORBIDDEN/);
  assert.equal(requestFingerprint({ topic: " A ", purpose: "B" }), requestFingerprint({ purpose: "B", topic: "A" }));
});
```

- [ ] **Step 2: Run the test and verify an import failure.**

Run: `node --test scripts/test-coffee-talk.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `convex/lib/coffeeTalk.ts`.

- [ ] **Step 3: Add Coffee Talk tables and state helpers.**

Add `coffeeTalkSettings`, `coffeeTalkApplications`, `coffeeTalkApplicationHistory`, `coffeeTalkOperationReceipts`, and `coffeeTalkRateLimitBuckets` to `convex/schema.ts` with the fields/indexes below:

```ts
// Status is one of submitted | under_review | needs_information | accepted | declined | withdrawn | cancelled | completed.
coffeeTalkApplications: defineTable({ applicantUserId: v.id("users"), targetTeacherPersonId: v.id("institutePeople"), assignedTeacherUserId: v.id("users"), groupId: v.optional(v.id("researchGroups")), topic: v.string(), purpose: v.string(), researchBackground: v.string(), expectedOutcome: v.string(), preferredFormat: v.union(v.literal("in_person"), v.literal("online"), v.literal("either")), availabilityWindows: v.array(v.object({ startAt: v.number(), endAt: v.number() })), referenceUrls: v.optional(v.array(v.string())), contactSnapshot: v.object({ displayName: v.string(), email: v.optional(v.string()) }), contactConsentAt: v.number(), contentFingerprint: v.string(), status: v.union(v.literal("submitted"), v.literal("under_review"), v.literal("needs_information"), v.literal("accepted"), v.literal("declined"), v.literal("withdrawn"), v.literal("cancelled"), v.literal("completed")), isOpen: v.boolean(), version: v.number(), createdAt: v.number(), submittedAt: v.number(), updatedAt: v.number(), statusChangedAt: v.number(), terminalAt: v.optional(v.number()), lastActorUserId: v.optional(v.id("users")) })
  .index("by_applicant_updatedAt", ["applicantUserId", "updatedAt"]).index("by_applicant_open_updatedAt", ["applicantUserId", "isOpen", "updatedAt"]).index("by_teacher_open_updatedAt", ["assignedTeacherUserId", "isOpen", "updatedAt"]).index("by_teacher_status_updatedAt", ["assignedTeacherUserId", "status", "updatedAt"]).index("by_applicant_fingerprint", ["applicantUserId", "contentFingerprint"]),
```

`transitionCoffeeTalk` must allow only: applicant `needs_information→submitted` via `supplement` and any nonterminal state to `withdrawn`; teacher `submitted→under_review`, `under_review→needs_information|accepted|declined`, `accepted→completed`; coordinator/super-admin nonterminal cancellation/reassignment/correction. No action may reopen `declined`, `withdrawn`, `cancelled`, or `completed`.

- [ ] **Step 4: Implement deterministic fingerprints.**

```ts
// excerpt from convex/lib/coffeeTalk.ts
import { createHash } from "node:crypto";
export function requestFingerprint(input: Record<string, unknown>) {
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])));
  return createHash("sha256").update(canonical).digest("hex");
}
```

Use the Convex-compatible crypto approach already present in the repository if Node `crypto` is not supported inside a Convex function; preserve the same deterministic inputs and output contract.

- [ ] **Step 5: Run the state-machine tests.**

Run: `node --test scripts/test-coffee-talk.mjs`

Expected: two passing subtests; any terminal reopen emits `COFFEE_TALK_TRANSITION_FORBIDDEN`.

- [ ] **Step 6: Commit the testable domain contract.**

```bash
git add convex/schema.ts convex/lib/coffeeTalk.ts scripts/test-coffee-talk.mjs
git commit -m "feat(coffee-talk): add application state machine contract"
```

### Task 7: Implement Coffee Talk ACL, history, receipts, and notification projections

**Files:**
- Create: `convex/coffeeTalk.ts`
- Modify: `convex/lib/coffeeTalk.ts`
- Modify: `convex/lib/notifications.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Extend the failing test with capability and redaction expectations.**

```js
// append to scripts/test-coffee-talk.mjs
import { redactCoffeeTalkForTeacher } from "../convex/lib/coffeeTalk.ts";
test("teacher receives no applicant contact until acceptance", () => {
  const dto = redactCoffeeTalkForTeacher({ status: "under_review", contactSnapshot: { displayName: "Student", email: "private@pku.edu.cn" } });
  assert.equal("email" in dto.contact, false);
});
```

- [ ] **Step 2: Run the test and verify the new export fails.**

Run: `node --test scripts/test-coffee-talk.mjs`

Expected: missing `redactCoffeeTalkForTeacher` export.

- [ ] **Step 3: Implement actor-derived Coffee Talk APIs.**

`convex/coffeeTalk.ts` must export `listOpenTeachers`, `getCapabilities`, `createApplication`, `listMine`, `listTeacherQueue`, `listCoordinatorQueue`, `getApplication`, and `actOnApplication`. Every non-public function resolves the main session with `requireSessionActor`. Creating requires an active `undergrad` or `graduate` whose existing `users.isEmailVerified === true`; target teacher must be a `public`, `coffeeTalkOpen`, explicitly linked institute person with an active `teacher` account. Do not use email/name matching.

`actOnApplication` must accept `{ sessionToken, id, expectedVersion, idempotencyKey, action }`, compare `expectedVersion`, check a receipt before any rate counting, create one append-only history row with a monotonically increasing `sequenceNo`, patch application/version/status in the same mutation, insert/return the operation receipt, and call internal notification projection. Same idempotency key + same fingerprint returns first result; same key + different fingerprint throws `IDEMPOTENCY_CONFLICT`.

Notification titles must be exactly generic phrases such as `Coffee Talk 申请状态更新`; they must not include topic, background, availability, email, or decision explanation. The deep link must be a relative `/services/coffee-talk/my` or role-appropriate internal route.

- [ ] **Step 4: Add API hooks and redacted UI DTO types.**

Add `useCoffeeTalkOpenTeachers`, `useCoffeeTalkCapabilities`, `useCreateCoffeeTalkApplication`, `useMyCoffeeTalkApplications`, `useTeacherCoffeeTalkApplications`, `useCoordinatorCoffeeTalkApplications`, `useCoffeeTalkApplication`, and `useActOnCoffeeTalkApplication` in `src/lib/api.ts`. The returned types must include `allowedActions` generated server-side, safe status/history fields, and only role-permitted contact information.

- [ ] **Step 5: Run state/notification tests, codegen, and lint.**

Run: `node --test scripts/test-coffee-talk.mjs scripts/test-user-notifications.mjs && npx convex codegen && npm run lint`

Expected: all tests pass, codegen succeeds, and lint exits zero.

- [ ] **Step 6: Commit domain persistence and ACL.**

```bash
git add convex/coffeeTalk.ts convex/lib/coffeeTalk.ts convex/lib/notifications.ts src/lib/api.ts src/types/index.ts scripts/test-coffee-talk.mjs
git commit -m "feat(coffee-talk): add secure applications and notifications"
```

### Task 8: Build the Coffee Talk and notification interface

**Files:**
- Create: `src/app/services/coffee-talk/page.tsx`
- Create: `src/app/services/coffee-talk/apply/page.tsx`
- Create: `src/app/services/coffee-talk/my/page.tsx`
- Create: `src/app/admin/coffee-talk/page.tsx`
- Create: `src/app/admin/coffee-talk/[id]/page.tsx`
- Create: `src/app/account/notifications/page.tsx`
- Create: `src/components/coffee-talk/coffee-talk-application-form.tsx`
- Create: `src/components/coffee-talk/coffee-talk-application-list.tsx`
- Create: `src/components/coffee-talk/coffee-talk-application-detail.tsx`
- Create: `src/components/coffee-talk/coffee-talk-decision-dialog.tsx`
- Create: `src/components/coffee-talk/coffee-talk-history.tsx`
- Create: `src/components/coffee-talk/coffee-talk-status-badge.tsx`
- Create: `src/components/notifications/notification-bell.tsx`
- Create: `src/components/notifications/notification-inbox.tsx`
- Create: `src/components/notifications/notification-row.tsx`
- Modify: `src/components/layout/aia-navbar.tsx`
- Modify: `src/app/admin/layout.tsx`
- Create: `src/lib/coffee-talk.ts`

- [ ] **Step 1: Write a failing source test for draft and form safety.**

```js
// append to scripts/test-coffee-talk.mjs
import { readFileSync } from "node:fs";
test("application form keeps drafts browser-only and submits an idempotency key", () => {
  const source = readFileSync("src/components/coffee-talk/coffee-talk-application-form.tsx", "utf8");
  assert.match(source, /sessionStorage/);
  assert.match(source, /idempotencyKey/);
  assert.doesNotMatch(source, /saveDraft|draftMutation/);
});
```

- [ ] **Step 2: Run the test before the form exists.**

Run: `node --test scripts/test-coffee-talk.mjs`

Expected: `ENOENT` for the application form component.

- [ ] **Step 3: Implement applicant, teacher, coordinator, and inbox screens.**

`CoffeeTalkApplicationForm` stores an unfinished form in `sessionStorage` only, clears it only after a successful response, and generates one `crypto.randomUUID()` idempotency key per submit attempt. It must label every field, validate availability start/end ordering locally, use `aria-describedby` for errors, and not offer uploads, calendar reservation, live chat, or WeChat buttons.

`CoffeeTalkApplicationDetail` renders only server-provided `allowedActions`, passes current `expectedVersion`, and re-fetches after success/conflict. `CoffeeTalkHistory` is chronological and never presents editing/deleting history. `/my` does not infer teacher/coordinator status from a browser role; it uses `useCoffeeTalkCapabilities`. The admin pages only render queues returned by server-authorized hooks.

`NotificationBell` uses the unread-count hook in the AIA navbar, has an accessible label, and links to `/account/notifications`. `NotificationInbox` uses only current-user inbox hooks; opening a deep link must still receive normal destination authorization.

- [ ] **Step 4: Run UI contract tests and lint.**

Run: `node --test scripts/test-coffee-talk.mjs scripts/test-user-notifications.mjs && npm run lint`

Expected: all Coffee Talk/notification tests pass and lint exits zero.

- [ ] **Step 5: Commit the first real service UI.**

```bash
git add src/app/services/coffee-talk src/app/admin/coffee-talk src/app/account/notifications \
  src/components/coffee-talk src/components/notifications src/components/layout/aia-navbar.tsx \
  src/app/admin/layout.tsx src/lib/coffee-talk.ts scripts/test-coffee-talk.mjs
git commit -m "feat(coffee-talk-ui): add AIA application and inbox views"
```

## Final verification matrix

- [ ] Run `node --test scripts/test-institute-directory.mjs scripts/test-institute-content-relations.mjs scripts/test-aia-directory-seed.mjs scripts/test-user-notifications.mjs scripts/test-coffee-talk.mjs`; expect all passing.
- [ ] Run `npx convex codegen`, `npx tsc --noEmit --incremental false`, `npm run lint`, and `npm run build`; expect exit zero with supported Node/npm versions.
- [ ] Against `bold-sandpiper-236` only, test anonymous, disabled, unverified undergrad, verified undergrad, graduate, linked teacher, ordinary admin, scoped coordinator, super-admin, independent Reviewer, and TechDay-only principal. Verify direct mutations, not only hidden buttons.
- [ ] Verify applicant submit → teacher start review → request information → applicant supplement → teacher accept → complete; then test each forbidden transition, stale version, same/different idempotency payload, duplicate open submission, and notification event-recipient deduplication.
- [ ] At mobile and desktop widths, verify form labels/errors, keyboard focus, one-page notification navigation, AIA bell, absence of room-reservation/calendar/WeChat features, and the West Building card remains a disabled placeholder.
