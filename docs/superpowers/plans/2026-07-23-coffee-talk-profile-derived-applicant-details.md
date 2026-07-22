# Coffee Talk 申请人资料自动带入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从登录账户派生 Coffee Talk 的申请人资料，锁定申请页中的四个资料字段，并让申请历史始终显示账户的最新资料。

**Architecture:** 将账户→Coffee Talk 展示资料的映射封装为后端纯函数，由提交 mutation 和列表查询共同调用。浏览器仅提交可编辑的申请内容；申请页用当前用户资料生成只读值。持久化记录保留申请人账户关联，查询时重新派生资料以避免旧快照。

**Tech Stack:** Next.js App Router、React、TypeScript、Convex、Node.js 内置 test runner、ESLint。

---

## File structure

`convex/lib/coffeeTalkApplicantProfile.ts` will validate a current user record and map its `organization` and `identityType` fields into Coffee Talk display data. `convex/lib/coffeeTalkSubmission.ts` will normalize only editable request content. `convex/coffeeTalk.ts` will invoke the profile helper for trusted submission data and dynamic list DTOs. `src/lib/coffee-talk-applicant-profile.ts` will provide the equivalent client-side display mapping for the logged-in account. The Coffee Talk form/client/API wrapper will accept only the derived read-only profile plus editable content. `scripts/test-coffee-talk-profile-derived-details-source.mjs` will protect the source-level contract used in this repository.

### Task 1: Establish failing contract tests

**Files:**
- Create: `scripts/test-coffee-talk-profile-derived-details-source.mjs`
- Test: `scripts/test-coffee-talk-profile-derived-details-source.mjs`

- [ ] **Step 1: Write the failing test**

Create a Node test that reads `convex/coffeeTalk.ts`, `convex/schema.ts`, `src/components/coffee-talk/coffee-talk-application-form.tsx`, `src/components/coffee-talk/coffee-talk-apply-client.tsx`, `src/lib/api.ts`, and the new client mapper. Require the following source contracts:

```js
assert.match(coffeeTalk, /deriveCoffeeTalkApplicantProfile\(applicant\)/)
assert.doesNotMatch(submitBlock, /applicantName:\s*v\.string\(\)/)
assert.doesNotMatch(submitBlock, /affiliation:\s*v\.string\(\)/)
assert.doesNotMatch(submitBlock, /identity:\s*v\.string\(\)/)
assert.doesNotMatch(submitBlock, /email:\s*v\.string\(\)/)
assert.match(form, /readOnly/)
assert.doesNotMatch(form, /coffee-talk-applicant-name[\s\S]*?onChange/)
assert.doesNotMatch(form, /coffee-talk-email[\s\S]*?onChange/)
assert.match(applyClient, /useCurrentUser\(\)/)
assert.match(api, /export type CoffeeTalkApplicationInput = \{[\s\S]*?teacherSlug: string/)
assert.doesNotMatch(api, /export type CoffeeTalkApplicationInput = \{[\s\S]*?applicantName:/)
assert.match(schema, /v\.literal\("teacher"\)/)
```

Also import `deriveCoffeeTalkApplicantProfile` from the client mapper and assert the exact maps: `pku` → “北大通班”, `thu` → “清华通班”; `undergrad` → “本科生”, `graduate` → “研究生”, `teacher` → “教师”, and `other` → “其他”.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test scripts/test-coffee-talk-profile-derived-details-source.mjs
```

Expected: FAIL because the mapper and server-derived submission contract do not yet exist.

- [ ] **Step 3: Commit the failing test only**

```bash
git add scripts/test-coffee-talk-profile-derived-details-source.mjs
git commit -m "test: define Coffee Talk profile-derived details contract"
```

### Task 2: Derive and serve current applicant data on the backend

**Files:**
- Create: `convex/lib/coffeeTalkApplicantProfile.ts`
- Modify: `convex/lib/coffeeTalkSubmission.ts:1-105`
- Modify: `convex/coffeeTalk.ts:1-355`
- Modify: `convex/schema.ts:441-468`
- Test: `scripts/test-coffee-talk-profile-derived-details-source.mjs`

- [ ] **Step 1: Add the failing current-data query expectations**

Extend the source test to require `listMine` and `listForTeacher` to resolve the record’s `applicantUserId`, call `deriveCoffeeTalkApplicantProfile`, and include the result in their returned DTOs. Require the teacher DTO to pass `displayName` and gated `email` from the derived profile to `redactCoffeeTalkForTeacher`, while returning affiliation and identity from that derived profile. Require a missing or invalid historical account to produce `applicant: null`, not a query error.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test scripts/test-coffee-talk-profile-derived-details-source.mjs
```

Expected: FAIL because current applicant data is not yet resolved in either list query.

- [ ] **Step 3: Write the minimal backend implementation**

Create `convex/lib/coffeeTalkApplicantProfile.ts` with a closed mapping and no fallback to stale application columns:

```ts
export type CoffeeTalkApplicantIdentity = "undergraduate" | "graduate" | "teacher" | "other"

export type CoffeeTalkApplicantProfile = {
  applicantName: string
  affiliation: "北大通班" | "清华通班"
  identity: CoffeeTalkApplicantIdentity
  identityLabel: "本科生" | "研究生" | "教师" | "其他"
  email: string
}

export function deriveCoffeeTalkApplicantProfile(user: {
  chineseName?: string
  englishName: string
  email: string
  organization: "pku" | "thu"
  identityType?: "undergrad" | "graduate" | "teacher" | "other"
}): CoffeeTalkApplicantProfile {
  const applicantName = user.chineseName?.trim() || user.englishName.trim()
  if (!applicantName || !user.email.trim() || !user.identityType) {
    throw new Error("COFFEE_TALK_APPLICANT_PROFILE_INCOMPLETE")
  }
  const identityByType = {
    undergrad: { identity: "undergraduate", identityLabel: "本科生" },
    graduate: { identity: "graduate", identityLabel: "研究生" },
    teacher: { identity: "teacher", identityLabel: "教师" },
    other: { identity: "other", identityLabel: "其他" },
  } as const
  return {
    applicantName,
    email: user.email.trim(),
    affiliation: user.organization === "pku" ? "北大通班" : "清华通班",
    ...identityByType[user.identityType],
  }
}
```

In `convex/lib/coffeeTalkSubmission.ts`, remove applicant name, affiliation, identity, and email from `CoffeeTalkSubmissionInput`, `NormalizedCoffeeTalkSubmission`, and `normalizeCoffeeTalkSubmission`; retain only teacher slug, topic, availability, and notes. In `convex/coffeeTalk.ts`, import the profile helper. Remove the four personal fields from `submitApplication.args`; derive the profile immediately after resolving the session user; pass only editable content to `normalizeCoffeeTalkSubmission`; use derived profile values when calculating the fingerprint; and insert no personal profile columns. Create an async DTO helper that loads `application.applicantUserId`, derives its current profile, and returns `null` when the linked account is absent or incomplete. Use this helper in both `listMine` and `listForTeacher`. Keep existing `applicantName`, `applicantAffiliation`, `applicantIdentity`, and `applicantEmail` schema columns for legacy row compatibility, but do not use them for new DTOs.

Make the four legacy personal profile fields in `coffeeTalkApplications` optional so new trusted submissions can omit them, and add `v.literal("teacher")` to its optional identity union for compatibility with teacher applicants.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test scripts/test-coffee-talk-profile-derived-details-source.mjs
```

Expected: PASS with all mapping, source-contract, server-authority, and dynamic-query assertions green.

- [ ] **Step 5: Commit the backend implementation**

```bash
git add convex/lib/coffeeTalkApplicantProfile.ts convex/lib/coffeeTalkSubmission.ts convex/coffeeTalk.ts convex/schema.ts scripts/test-coffee-talk-profile-derived-details-source.mjs
git commit -m "feat: derive Coffee Talk applicant details from accounts"
```

### Task 3: Render account-derived details as locked application fields

**Files:**
- Create: `src/lib/coffee-talk-applicant-profile.ts`
- Modify: `src/components/coffee-talk/coffee-talk-application-form.tsx:16-209`
- Modify: `src/components/coffee-talk/coffee-talk-apply-client.tsx:1-88`
- Modify: `src/lib/api.ts:552-574`
- Test: `scripts/test-coffee-talk-profile-derived-details-source.mjs`

- [ ] **Step 1: Add the failing UI/API assertions**

Extend the source test to require `CoffeeTalkApplicationDraft` to contain only `teacherPreference`, `topic`, `availability`, and `notes`; require the form props to receive `applicantProfile`; require each of the four basic fields to use `readOnly` or a disabled native select with no `onChange`; and require `handleSubmit` to pass only `teacherSlug`, `topic`, `availability`, and optional `notes` to `useSubmitCoffeeTalkApplication`.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test scripts/test-coffee-talk-profile-derived-details-source.mjs
```

Expected: FAIL because the form still owns editable applicant fields and the client still sends them.

- [ ] **Step 3: Write the minimal client implementation**

Create the client mapper with the same display mapping as the backend:

```ts
import type { User } from "@/types"

export type CoffeeTalkApplicantProfileView = {
  applicantName: string
  email: string
  affiliation: "北大通班" | "清华通班"
  identity: "本科生" | "研究生" | "教师" | "其他"
}

export function deriveCoffeeTalkApplicantProfile(user: Pick<User, "chineseName" | "englishName" | "email" | "organization" | "identityType">): CoffeeTalkApplicantProfileView | null {
  const applicantName = user.chineseName?.trim() || user.englishName.trim()
  const identity = { undergrad: "本科生", graduate: "研究生", teacher: "教师", other: "其他" }[user.identityType ?? ""]
  if (!applicantName || !user.email.trim() || !identity) return null
  return {
    applicantName,
    email: user.email.trim(),
    affiliation: user.organization === "pku" ? "北大通班" : "清华通班",
    identity,
  }
}
```

In the form, remove the four fields from initial state and all four `onChange` callbacks. Add a required `applicantProfile` prop and render its text values in `readOnly` inputs; render identity in a `disabled` select or a `readOnly` input. Include “以下资料来自个人账户，无法在此修改。” below the grid.

In the client, call `useCurrentUser`, show a loading state until it resolves, derive the profile, and show an account-profile-incomplete alert if it returns `null`. Only render the submit-capable form when profile and teacher data are available. Remove the now-obsolete identity type guard. Narrow `CoffeeTalkApplicationInput` to only `teacherSlug`, `topic`, `availability`, and optional `notes`, and submit exactly those values.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test scripts/test-coffee-talk-profile-derived-details-source.mjs
```

Expected: PASS; client submissions cannot contain browser-supplied profile details and the four displayed fields are locked.

- [ ] **Step 5: Commit the UI/API change**

```bash
git add src/lib/coffee-talk-applicant-profile.ts src/components/coffee-talk/coffee-talk-application-form.tsx src/components/coffee-talk/coffee-talk-apply-client.tsx src/lib/api.ts scripts/test-coffee-talk-profile-derived-details-source.mjs
git commit -m "feat: lock Coffee Talk applicant fields to account profile"
```

### Task 4: Surface current details in both history views and verify the branch

**Files:**
- Modify: `src/components/coffee-talk/coffee-talk-my-client.tsx:20-71`
- Modify: `src/components/coffee-talk/coffee-talk-teacher-manage-client.tsx:21-83`
- Modify: `scripts/test-coffee-talk-profile-derived-details-source.mjs`
- Test: `scripts/test-coffee-talk-profile-derived-details-source.mjs`

- [ ] **Step 1: Add the failing history-display assertions**

Extend the source test to require both list clients to consume the backend `applicant` profile DTO. Require their `participantLabel` strings to include name, email, affiliation, and identity labels, so applicant and teacher history views visibly use the latest account-derived data returned by the query.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test scripts/test-coffee-talk-profile-derived-details-source.mjs
```

Expected: FAIL because history list clients do not yet render the current applicant profile.

- [ ] **Step 3: Write the minimal history UI implementation**

Update the applicant-facing response type with:

```ts
applicant: {
  applicantName: string
  email: string
  affiliation: string
  identityLabel: string
}
```

Format the applicant-facing list’s `participantLabel` as `申请资料：${name} · ${email} · ${affiliation} · ${identityLabel}`. The teacher-facing list must use the current `applicant` name, affiliation, and identity label; append the current `contact.email` only when the existing server-side redaction supplies it for accepted or completed applications. Do not read the legacy snapshot columns in either UI.

- [ ] **Step 4: Run targeted tests and lint**

Run:

```bash
node --test scripts/test-coffee-talk-profile-derived-details-source.mjs
npm run lint
```

Expected: Both commands exit 0 with no lint warnings. Do not modify `package.json`, do not run Convex with `--prod`, and do not delete caches or generated directories.

- [ ] **Step 5: Commit the history presentation and verification changes**

```bash
git add src/components/coffee-talk/coffee-talk-my-client.tsx src/components/coffee-talk/coffee-talk-teacher-manage-client.tsx scripts/test-coffee-talk-profile-derived-details-source.mjs
git commit -m "feat: show current applicant details in Coffee Talk history"
```

## Plan self-review

Spec coverage: Tasks 2–3 enforce server-derived, non-editable application data; Task 2 resolves current account data for both queries; Task 4 displays those latest values in both history views; all required organization and identity mappings are covered by Task 1. The plan intentionally retains legacy schema columns without a migration, matching the approved compatibility scope.

Placeholder scan: no deferred implementation placeholders remain. Type consistency: the persisted identity union and the backend helper share `undergraduate | graduate | teacher | other`; the client payload contains no profile fields; the query DTO uses the `applicant` field in both list clients.
