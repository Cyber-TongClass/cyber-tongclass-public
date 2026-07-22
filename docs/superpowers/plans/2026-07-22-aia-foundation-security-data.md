# AIA Foundation, Security, and Development-Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a guarded `bold-sandpiper-236` development environment, close the existing account-authorisation gaps, and provide idempotent identity/data migration foundations for AIA.

**Architecture:** A standalone Node tooling layer owns every development-deployment data operation and rejects any source/target other than the approved pair. Convex gets a small shared session-actor and public-DTO boundary before new institute features are added; existing roles remain compatible while `identityType` and `accountStatus` add institute semantics.

**Tech Stack:** Next.js App Router, TypeScript, Convex, Node `node:test`, `crypto`, existing `src/lib/api.ts` hooks.

---

## Locked files and boundaries

| Path | Responsibility |
| --- | --- |
| `scripts/aia-dev-data/lib/target-gate.mjs` | Parses the local development environment and rejects unsafe target operations without printing secrets. |
| `scripts/aia-dev-data/lib/snapshot-manifest.mjs` | Produces content-free SHA-256/count manifests for Convex exports. |
| `scripts/aia-dev-data/*.mjs` | Explicit clone, rollback, verification, migration, and demo-seed entry points; none are lifecycle hooks. |
| `convex/lib/authz-policy.ts` | Pure role/scope decision ordering and public field allow-lists. |
| `convex/lib/authz.ts` | Resolves a live, active server-side session actor; never trusts an actor id or role supplied by a component. |
| `convex/lib/user-dto.ts` | Builds public, current-user, and administrator DTOs without spreading a database document. |
| `convex/schema.ts` | Additive optional identity/account fields and indexes required by the shared authorization layer. |
| `convex/auth.ts`, `convex/users.ts`, `convex/accounts.ts`, `convex/adminUsers.ts` | Replaces anonymous account mutation/read paths with actor-derived APIs. |
| `src/lib/api.ts` | The sole React hook boundary for all new or changed Convex APIs. |
| `src/lib/hooks/use-auth.ts` | Uses only the safe auth DTO/API surface. |

The plan deliberately does not modify `package.json` scripts. It never uses `--prod`, and it never connects a local browser to a target before clone, sanitation, and code deployment are verified.

### Task 1: Add a testable target guard before any remote operation

**Files:**
- Create: `scripts/aia-dev-data/lib/target-gate.mjs`
- Create: `scripts/aia-dev-data/README.md`
- Create: `scripts/test-aia-target-gate.mjs`
- Create: `deployments/env.aia-dev.example`

- [ ] **Step 1: Write the failing target-gate tests.**

```js
// scripts/test-aia-target-gate.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { validateTargetConfig } from "./aia-dev-data/lib/target-gate.mjs";

const valid = {
  CONVEX_DEPLOYMENT: "dev:bold-sandpiper-236",
  NEXT_PUBLIC_CONVEX_URL: "https://bold-sandpiper-236.convex.cloud",
  NEXT_PUBLIC_CONVEX_SITE_URL: "https://bold-sandpiper-236.convex.site",
  AIA_DEV_DATA_TARGET: "bold-sandpiper-236",
};

test("accepts only the approved source and development target", () => {
  assert.deepEqual(
    validateTargetConfig(valid, {
      source: "clean-swordfish-983",
      target: "bold-sandpiper-236",
      confirmTarget: "bold-sandpiper-236",
      mode: "write",
    }),
    { target: "bold-sandpiper-236", mode: "write" },
  );
});

test("rejects production deployment strings and mismatched confirmation", () => {
  assert.throws(
    () => validateTargetConfig({ ...valid, CONVEX_DEPLOYMENT: "prod:bold-sandpiper-236" }, {
      source: "clean-swordfish-983", target: "bold-sandpiper-236",
      confirmTarget: "bold-sandpiper-236", mode: "write",
    }),
    /AIA_TARGET_GATE_PRODUCTION_VALUE/,
  );
  assert.throws(
    () => validateTargetConfig(valid, {
      source: "clean-swordfish-983", target: "bold-sandpiper-236",
      confirmTarget: "another-deployment", mode: "write",
    }),
    /AIA_TARGET_GATE_CONFIRMATION_MISMATCH/,
  );
});
```

- [ ] **Step 2: Run the target-gate test and verify it fails because the module does not exist.**

Run: `node --test scripts/test-aia-target-gate.mjs`

Expected: `ERR_MODULE_NOT_FOUND` naming `target-gate.mjs`.

- [ ] **Step 3: Implement the pure validator and a CLI that redacts values.**

```js
// scripts/aia-dev-data/lib/target-gate.mjs
import { readFileSync } from "node:fs";

const SOURCE = "clean-swordfish-983";
const TARGET = "bold-sandpiper-236";
const fail = (code) => { throw new Error(code); };

export function validateTargetConfig(env, { source, target, confirmTarget, mode }) {
  if (source !== SOURCE) fail("AIA_TARGET_GATE_SOURCE_MISMATCH");
  if (target !== TARGET || env.AIA_DEV_DATA_TARGET !== TARGET) fail("AIA_TARGET_GATE_TARGET_MISMATCH");
  if (source === target) fail("AIA_TARGET_GATE_SOURCE_EQUALS_TARGET");
  if (mode === "write" && confirmTarget !== TARGET) fail("AIA_TARGET_GATE_CONFIRMATION_MISMATCH");
  for (const value of [env.CONVEX_DEPLOYMENT, env.NEXT_PUBLIC_CONVEX_URL, env.NEXT_PUBLIC_CONVEX_SITE_URL]) {
    if (!value || value.includes("prod:")) fail("AIA_TARGET_GATE_PRODUCTION_VALUE");
    if (!value.includes(TARGET)) fail("AIA_TARGET_GATE_ENV_MISMATCH");
  }
  if (env.CONVEX_DEPLOYMENT !== `dev:${TARGET}`) fail("AIA_TARGET_GATE_DEPLOYMENT_MISMATCH");
  return { target: TARGET, mode };
}

export function parseDotEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['\"]|['\"]$/g, "")]] : [];
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) =>
    value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs, []));
  const env = parseDotEnv(readFileSync(args.envFile, "utf8"));
  const result = validateTargetConfig(env, args);
  process.stdout.write(`AIA target gate passed: ${result.target} (${result.mode})\n`);
}
```

Create `deployments/env.aia-dev.example` exactly as:

```dotenv
CONVEX_DEPLOYMENT=dev:bold-sandpiper-236
NEXT_PUBLIC_CONVEX_URL=https://bold-sandpiper-236.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://bold-sandpiper-236.convex.site
AIA_DEV_DATA_TARGET=bold-sandpiper-236
```

Write `scripts/aia-dev-data/README.md` with the exact declaration that `.env.aia-dev.local` is untracked, the approved source is `clean-swordfish-983`, the only write target is `bold-sandpiper-236`, and every command must pass `--confirm-target bold-sandpiper-236`.

- [ ] **Step 4: Run the target-gate tests.**

Run: `node --test scripts/test-aia-target-gate.mjs`

Expected: two passing subtests and no printed environment values.

- [ ] **Step 5: Commit the isolated safety primitive.**

```bash
git add scripts/aia-dev-data/lib/target-gate.mjs scripts/aia-dev-data/README.md \
  scripts/test-aia-target-gate.mjs deployments/env.aia-dev.example
git commit -m "chore: add guarded AIA development target configuration"
```

### Task 2: Add clone, manifest, verification, and rollback entry points

**Files:**
- Create: `scripts/aia-dev-data/lib/snapshot-manifest.mjs`
- Create: `scripts/aia-dev-data/clone-convex-snapshot.mjs`
- Create: `scripts/aia-dev-data/rollback-convex-snapshot.mjs`
- Create: `scripts/aia-dev-data/verify-convex-clone.mjs`
- Create: `scripts/test-aia-dev-data-source-guards.mjs`

- [ ] **Step 1: Write failing tests for command construction and manifest redaction.**

```js
// scripts/test-aia-dev-data-source-guards.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildConvexExport, buildConvexImport } from "./aia-dev-data/lib/snapshot-manifest.mjs";

test("exports source read-only and imports only the approved target", () => {
  assert.deepEqual(buildConvexExport("clean-swordfish-983", "/tmp/source.zip"), [
    "convex", "export", "--deployment", "clean-swordfish-983",
    "--include-file-storage", "--path", "/tmp/source.zip",
  ]);
  assert.deepEqual(buildConvexImport("bold-sandpiper-236", "/tmp/source.zip"), [
    "convex", "import", "--deployment", "bold-sandpiper-236",
    "/tmp/source.zip", "--replace-all", "--yes",
  ]);
  assert.throws(() => buildConvexImport("clean-swordfish-983", "/tmp/source.zip"), /AIA_TARGET_GATE_TARGET_MISMATCH/);
});
```

- [ ] **Step 2: Run it and verify the missing module failure.**

Run: `node --test scripts/test-aia-dev-data-source-guards.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `snapshot-manifest.mjs`.

- [ ] **Step 3: Implement deterministic command builders and a content-free manifest.**

```js
// scripts/aia-dev-data/lib/snapshot-manifest.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const TARGET = "bold-sandpiper-236";
export const buildConvexExport = (deployment, outputPath) => [
  "convex", "export", "--deployment", deployment, "--include-file-storage", "--path", outputPath,
];
export const buildConvexImport = (deployment, snapshotPath) => {
  if (deployment !== TARGET) throw new Error("AIA_TARGET_GATE_TARGET_MISMATCH");
  return ["convex", "import", "--deployment", deployment, snapshotPath, "--replace-all", "--yes"];
};
export function makeFileManifest(snapshotPath) {
  const bytes = readFileSync(snapshotPath);
  return { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.byteLength };
}
```

`clone-convex-snapshot.mjs` must call `validateTargetConfig` before spawning anything, export a target backup first, export the source second, write only SHA-256/byte-count manifests, require the exact confirmation for import, then export and compare target post-import. `rollback-convex-snapshot.mjs` must repeat the same gate and import only the supplied target-backup zip. `verify-convex-clone.mjs` must compare manifests and return a nonzero exit code if either checksum/byte count differs; none of these scripts may log a document, filename, token, or password.

- [ ] **Step 4: Run the source/target tests.**

Run: `node --test scripts/test-aia-dev-data-source-guards.mjs`

Expected: one passing subtest and no network access.

- [ ] **Step 5: Document the manually triggered clone sequence.**

Add the following command block to `scripts/aia-dev-data/README.md`:

```bash
cp deployments/env.aia-dev.example .env.aia-dev.local
node scripts/aia-dev-data/clone-convex-snapshot.mjs \
  --env-file .env.aia-dev.local \
  --source clean-swordfish-983 \
  --target bold-sandpiper-236 \
  --confirm-target bold-sandpiper-236
```

The text immediately below the block must say that this is a development-only operation, there is no `--prod` option, and failure leaves the target backup available to the rollback script.

- [ ] **Step 6: Commit the clone tooling without running it yet.**

```bash
git add scripts/aia-dev-data scripts/test-aia-dev-data-source-guards.mjs
git commit -m "chore: add recoverable AIA development data tooling"
```

### Task 3: Define pure authorization and public-DTO contracts first

**Files:**
- Create: `convex/lib/authz-policy.ts`
- Create: `convex/lib/user-dto.ts`
- Create: `scripts/test-authz-policy.mjs`
- Create: `scripts/test-user-dtos.mjs`

- [ ] **Step 1: Write failing policy and DTO allow-list tests.**

```js
// scripts/test-authz-policy.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { decideAuthorization } from "../convex/lib/authz-policy.ts";

test("an explicit deny wins over an equally specific allow", () => {
  assert.equal(decideAuthorization([
    { effect: "allow", specificity: 3 }, { effect: "deny", specificity: 3 },
  ]).allowed, false);
});
test("an empty rule set defaults to deny", () => {
  assert.equal(decideAuthorization([]).allowed, false);
});
```

```js
// scripts/test-user-dtos.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { toPublicTongClassMemberDto } from "../convex/lib/user-dto.ts";

test("public member DTO excludes account and contact fields", () => {
  const dto = toPublicTongClassMemberDto({
    _id: "user-1", studentId: "240001", email: "private@pku.edu.cn",
    personalEmail: "private@example.com", role: "super_admin", accountStatus: "active",
    name: "Alice", avatarUrl: "https://example.com/a.png", cohort: 2024,
  });
  assert.deepEqual(dto, { name: "Alice", avatarUrl: "https://example.com/a.png", cohort: 2024 });
});
```

- [ ] **Step 2: Run both tests and verify the imports fail.**

Run: `node --test scripts/test-authz-policy.mjs scripts/test-user-dtos.mjs`

Expected: `ERR_MODULE_NOT_FOUND` naming both Convex library modules.

- [ ] **Step 3: Implement the non-I/O policy and DTO builders.**

```ts
// convex/lib/authz-policy.ts
export type PolicyDecision = { allowed: boolean; reason: "ALLOW" | "DENY" | "NO_MATCH" };
export type PolicyCandidate = { effect: "allow" | "deny"; specificity: number };
export function decideAuthorization(candidates: PolicyCandidate[]): PolicyDecision {
  const highest = Math.max(-1, ...candidates.map((candidate) => candidate.specificity));
  if (highest < 0) return { allowed: false, reason: "NO_MATCH" };
  const finalists = candidates.filter((candidate) => candidate.specificity === highest);
  return finalists.some((candidate) => candidate.effect === "deny")
    ? { allowed: false, reason: "DENY" }
    : { allowed: true, reason: "ALLOW" };
}
```

```ts
// convex/lib/user-dto.ts
type PublicableUser = { name?: string; avatarUrl?: string; cohort?: number | "mascot" };
export function toPublicTongClassMemberDto(user: PublicableUser) {
  return {
    ...(user.name ? { name: user.name } : {}),
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    ...(user.cohort !== undefined ? { cohort: user.cohort } : {}),
  };
}
```

- [ ] **Step 4: Run the policy and DTO tests.**

Run: `node --test scripts/test-authz-policy.mjs scripts/test-user-dtos.mjs`

Expected: three passing subtests.

- [ ] **Step 5: Commit the reusable contracts.**

```bash
git add convex/lib/authz-policy.ts convex/lib/user-dto.ts \
  scripts/test-authz-policy.mjs scripts/test-user-dtos.mjs
git commit -m "feat(auth): add AIA authorization and public DTO contracts"
```

### Task 4: Add backward-compatible AIA identity fields and an active session actor

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/lib/authz.ts`
- Create: `convex/adminMigrations.ts`
- Create: `scripts/test-identity-migration.mjs`

- [ ] **Step 1: Write failing identity migration tests.**

```js
// scripts/test-identity-migration.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { deriveIdentityPatch } from "../convex/adminMigrations.ts";

test("a legacy member becomes an undergrad without changing access role", () => {
  assert.deepEqual(deriveIdentityPatch({ role: "member" }), {
    identityType: "undergrad", accountStatus: "active",
  });
});
test("an existing identity and an administrator role are preserved", () => {
  assert.deepEqual(deriveIdentityPatch({ role: "admin", identityType: "teacher", accountStatus: "active" }), {});
});
```

- [ ] **Step 2: Run it and verify it fails before the migration helper exists.**

Run: `node --test scripts/test-identity-migration.mjs`

Expected: import failure for `adminMigrations.ts`.

- [ ] **Step 3: Make the schema additive and define the patch helper.**

In `convex/schema.ts`, change only the existing `users` validator fields needed for compatibility:

```ts
studentId: v.optional(v.string()),
cohort: v.optional(v.union(v.number(), v.literal("mascot"))),
identityType: v.optional(v.union(
  v.literal("undergrad"), v.literal("graduate"), v.literal("teacher"), v.literal("other"),
)),
accountStatus: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
```

Create the pure helper at the top of `convex/adminMigrations.ts`:

```ts
export function deriveIdentityPatch(user: {
  role: "member" | "admin" | "super_admin";
  identityType?: "undergrad" | "graduate" | "teacher" | "other";
  accountStatus?: "active" | "disabled";
}) {
  return {
    ...(user.identityType === undefined && user.role === "member" ? { identityType: "undergrad" as const } : {}),
    ...(user.accountStatus === undefined ? { accountStatus: "active" as const } : {}),
  };
}
```

Then export a server-authorized, cursor-batched `backfillIdentityBatch` mutation. It must obtain the actor from `requireSessionActor`, require `super_admin`, read a bounded page, apply only `deriveIdentityPatch`, and return `{ scanned, updated, nextCursor }`. It must not accept a client-supplied target user id list or role.

- [ ] **Step 4: Implement active-session resolution.**

```ts
// convex/lib/authz.ts
export async function resolveSessionActor(ctx: QueryCtx | MutationCtx, sessionToken?: string | null) {
  if (!sessionToken) return null;
  const session = await getValidSessionByToken(ctx, sessionToken);
  if (!session) return null;
  const user = await ctx.db.get(session.userId);
  if (!user || user.accountStatus === "disabled") return null;
  return { userId: user._id, accessRole: user.role, identityType: user.identityType ?? null,
    accountStatus: "active" as const, organization: user.organization, cohort: user.cohort };
}
export async function requireSessionActor(ctx: QueryCtx | MutationCtx, sessionToken?: string | null) {
  const actor = await resolveSessionActor(ctx, sessionToken);
  if (!actor) throw new Error("UNAUTHENTICATED");
  return actor;
}
```

`getValidSessionByToken` must use the existing token hash/index logic rather than store a raw token. It must reject revoked and expired sessions before it reads the user.

- [ ] **Step 5: Re-run the identity tests.**

Run: `node --test scripts/test-identity-migration.mjs`

Expected: two passing subtests; calling the helper twice returns an empty patch on the second call after applying its first result.

- [ ] **Step 6: Generate types, lint, and commit the schema-compatible change.**

Run: `npx convex codegen && npm run lint`

Expected: code generation succeeds against the configured development deployment and lint exits zero. Do not run this command until `.env.aia-dev.local` has passed the target gate.

```bash
git add convex/schema.ts convex/lib/authz.ts convex/adminMigrations.ts scripts/test-identity-migration.mjs
git commit -m "feat(auth): add AIA identity fields and active session actor"
```

### Task 5: Replace anonymous account APIs with actor-derived DTO APIs

**Files:**
- Modify: `convex/auth.ts`
- Modify: `convex/users.ts`
- Create: `convex/accounts.ts`
- Create: `convex/adminUsers.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/hooks/use-auth.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/register/RegisterClient.tsx`
- Create: `scripts/test-aia-public-account-surface.mjs`

- [ ] **Step 1: Write a failing public-surface regression test.**

```js
// scripts/test-aia-public-account-surface.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { toPublicTongClassMemberDto } from "../convex/lib/user-dto.ts";

test("the public account surface cannot return privileged database fields", () => {
  const dto = toPublicTongClassMemberDto({ name: "A", role: "super_admin", email: "a@pku.edu.cn" });
  assert.equal("role" in dto, false);
  assert.equal("email" in dto, false);
});
```

- [ ] **Step 2: Run the test to establish the DTO contract still holds.**

Run: `node --test scripts/test-aia-public-account-surface.mjs`

Expected: one passing subtest; this test protects the contract while endpoints are refactored.

- [ ] **Step 3: Implement the safe endpoint split.**

Add these exported Convex functions, all using `requireSessionActor` where a session is required:

```ts
// convex/accounts.ts
export const me = query({ args: { sessionToken: v.optional(v.string()) }, handler: async (ctx, args) => {
  const actor = await requireSessionActor(ctx, args.sessionToken);
  const user = await ctx.db.get(actor.userId);
  return toCurrentUserDto(user!);
}});

export const updateOwnProfile = mutation({ args: {
  sessionToken: v.string(), name: v.optional(v.string()), avatarUrl: v.optional(v.string()), bio: v.optional(v.string()),
}, handler: async (ctx, args) => {
  const actor = await requireSessionActor(ctx, args.sessionToken);
  await ctx.db.patch(actor.userId, {
    ...(args.name !== undefined ? { name: args.name.trim() } : {}),
    ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
    ...(args.bio !== undefined ? { bio: args.bio } : {}),
  });
  return { ok: true };
}});
```

`convex/adminUsers.ts` must expose `list`, `get`, `updateAccount`, and `disableAccount`; each resolves the actor on the server and calls `requireSystemRole(actor, "super_admin")`. `disableAccount` must revoke every primary session for the target user in the same mutation. `convex/users.ts` public member listing must map each result through `toPublicTongClassMemberDto`; it must not export lookup-by-email, lookup-by-student-id, arbitrary create, role update, or raw reset-password mutations to a browser client.

Replace `/register` with a static “公开注册暂未开放” screen and remove all code paths that call a create-user mutation. Make login validate the `next` query with `next.startsWith("/") && !next.startsWith("//")` before navigating.

- [ ] **Step 4: Migrate React callers through `src/lib/api.ts`.**

Add typed hooks such as `useCurrentAccount`, `useUpdateOwnProfile`, `useAdminUsers`, and `useDisableAccount`. Their only session input comes from the existing auth state; no component receives a `requesterId`, `role`, or authorization owner field. Replace direct component imports of `api.users.*` with these hooks.

- [ ] **Step 5: Verify the safe surface and type boundary.**

Run: `node --test scripts/test-aia-public-account-surface.mjs scripts/test-user-dtos.mjs && npm run lint`

Expected: all tests pass and lint exits zero. Manually invoke the retired public create/role-change functions with no session against the development deployment and expect `UNAUTHENTICATED` or a removed-function error.

- [ ] **Step 6: Commit the authentication hardening.**

```bash
git add convex/auth.ts convex/users.ts convex/accounts.ts convex/adminUsers.ts \
  src/lib/api.ts src/lib/hooks/use-auth.ts src/app/login/page.tsx \
  src/app/register/page.tsx src/app/register/RegisterClient.tsx \
  scripts/test-aia-public-account-surface.mjs
git commit -m "fix(auth): close public account mutation and PII surfaces"
```

### Task 6: Provide idempotent target sanitation and migration runners

**Files:**
- Create: `convex/aiaDevData.ts`
- Create: `scripts/aia-dev-data/run-migration.mjs`
- Create: `scripts/aia-dev-data/verify-target-state.mjs`
- Create: `scripts/test-aia-dev-data-sanitize.mjs`

- [ ] **Step 1: Write a pure sanitation-plan test.**

```js
// scripts/test-aia-dev-data-sanitize.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { summarizeSanitation } from "../convex/aiaDevData.ts";

test("sanitation summary reports only aggregate counts", () => {
  assert.deepEqual(summarizeSanitation({ sessions: 3, reviewers: 2, techDayUsers: 4, verifications: 1 }), {
    sessionsRevoked: 3, reviewersDisabled: 2, techDayUsersDisabled: 4, verificationsDeleted: 1,
  });
});
```

- [ ] **Step 2: Run it before implementing the helper.**

Run: `node --test scripts/test-aia-dev-data-sanitize.mjs`

Expected: import failure for `aiaDevData.ts`.

- [ ] **Step 3: Implement idempotent sanitation.**

```ts
// convex/aiaDevData.ts
export function summarizeSanitation(input: { sessions: number; reviewers: number; techDayUsers: number; verifications: number }) {
  return { sessionsRevoked: input.sessions, reviewersDisabled: input.reviewers,
    techDayUsersDisabled: input.techDayUsers, verificationsDeleted: input.verifications };
}
```

Add a `sanitizeClonedTarget` mutation guarded by a development-only server secret and exact target marker. It must delete/revoke primary, Reviewer, and TechDay sessions; delete verification records; set every cloned main account to `disabled`; set independent reviewer accounts to disabled; and return only the aggregate object from `summarizeSanitation`. It must never create a default-password account.

`run-migration.mjs` and `verify-target-state.mjs` must invoke the target guard before a Convex command. The verifier must assert zero session/verification records and print only table counts and stable error codes.

- [ ] **Step 4: Run the sanitation test.**

Run: `node --test scripts/test-aia-dev-data-sanitize.mjs`

Expected: one passing test with no network access.

- [ ] **Step 5: Perform the explicit development clone only after the scripts are reviewed.**

Run:

```bash
node scripts/aia-dev-data/clone-convex-snapshot.mjs \
  --env-file .env.aia-dev.local \
  --source clean-swordfish-983 \
  --target bold-sandpiper-236 \
  --confirm-target bold-sandpiper-236
node scripts/aia-dev-data/run-migration.mjs \
  --env-file .env.aia-dev.local \
  --target bold-sandpiper-236 \
  --confirm-target bold-sandpiper-236 \
  --operation sanitize-cloned-target
node scripts/aia-dev-data/verify-target-state.mjs \
  --env-file .env.aia-dev.local \
  --target bold-sandpiper-236
```

Expected: the target backup completes before import, post-import manifest verification succeeds, sanitation reports only counts, and validation reports zero live copied sessions/verification records. If any command fails, stop all target writes and invoke only `rollback-convex-snapshot.mjs` with the backup created by this task.

- [ ] **Step 6: Commit the manual-only sanitation tooling.**

```bash
git add convex/aiaDevData.ts scripts/aia-dev-data/run-migration.mjs \
  scripts/aia-dev-data/verify-target-state.mjs scripts/test-aia-dev-data-sanitize.mjs
git commit -m "feat(migrations): add idempotent AIA development target sanitation"
```

## Final verification matrix

- [ ] Run `node --test scripts/test-aia-target-gate.mjs scripts/test-aia-dev-data-source-guards.mjs scripts/test-authz-policy.mjs scripts/test-user-dtos.mjs scripts/test-identity-migration.mjs scripts/test-aia-public-account-surface.mjs scripts/test-aia-dev-data-sanitize.mjs`; expect all passing.
- [ ] Run `npx convex codegen`, `npx tsc --noEmit --incremental false`, `npm run lint`, and `npm run build` with a supported Node/npm runtime; expect exit code zero. Build is not accepted as a replacement for the separate typecheck.
- [ ] Directly test anonymous, disabled, member, admin, and super-admin sessions against sensitive account mutations; expect actor-derived authorization and no PII in public DTO responses.
- [ ] Confirm no command in the git history, script source, or command output contains `--prod`, raw credentials, session tokens, or copied personal details.
