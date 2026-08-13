# Teacher Recognition and Professional Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a teacher-only recognition and professional-service submission workspace with required private proof, user-group review routing, any-one completion, approved-only annual statistics, Excel export, and a compact public teacher-profile timeline.

**Architecture:** Keep OA submissions, immutable workflow snapshots, tasks, events, and notifications as the approval source of truth. Add a protected `teacher_recognition` OA system form, a small recognition settings/category/draft layer, and domain-specific Convex queries plus AIA-styled pages; approved public output is projected from OA submissions and never exposes proof or comments. The permissions page stores only reviewer user-group IDs, while applicant eligibility is always derived server-side from `identityType=teacher`.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Convex queries/mutations/storage, existing OA workflow and R2 helpers, Tailwind/shadcn AIA design tokens, Node built-in test runner, existing `simple-xlsx`/`simple-zip` utilities.

---

## File map and coordination gate

This feature owns these new files:

- `convex/lib/teacherRecognition.ts` — pure domain normalization, system-form construction, authorization predicates, projections, and export rows.
- `convex/teacherRecognitions.ts` — settings/categories, teacher drafts/submission, reviewer/manager queries, proof access, and public profile query.
- `tests/teacher-recognition-domain.test.ts` — executable domain and authorization tests using Node's built-in runner.
- `src/lib/teacher-recognition.ts` — client types, labels, date/status formatters, and Excel cell escaping helpers.
- `src/components/teacher-recognition/teacher-recognition-permission-panel.tsx` — reviewer-group-only permission editor.
- `src/components/teacher-recognition/teacher-recognition-workspace.tsx` — teacher draft/history surface.
- `src/components/teacher-recognition/teacher-recognition-review-queue.tsx` — assigned OA review queue and action panel.
- `src/components/teacher-recognition/teacher-recognition-management.tsx` — year/teacher/category/status filters, annual counts, and export.
- `src/components/teacher-recognition/teacher-recognition-timeline.tsx` — proof-free public timeline.
- `src/app/services/teacher-recognitions/page.tsx` — teacher entry page.
- `src/app/services/teacher-recognitions/review/page.tsx` — assigned-reviewer page.
- `src/app/services/teacher-recognitions/manage/page.tsx` — reviewer/super-admin management and annual statistics page.
- `src/app/api/teacher-recognitions/export/route.ts` — server-authorized XLSX download.

Shared-file ownership is serialized:

1. The integration owner alone edits `convex/schema.ts`, `convex/lib/r2.ts`, `convex/lib/oaWorkflow.ts`, `src/lib/api.ts`, and `src/types/institute.ts` in Tasks 1–2. Publication, news, and Word workers must not edit those files concurrently.
2. The news-sync owner first lands the `canReview` split in `src/components/permissions/platform-permissions-client.tsx`; this feature then adds the independent `teacher_recognition` tab without changing news semantics.
3. This feature does not change generic OA submission/rendering components. The Word module may edit `convex/oaForms.ts`, `src/lib/oa-forms.ts`, and OA components only after this feature's backend commits; it must keep `oaForms.systemKey === "teacher_recognition"` protected and excluded from generic form editors/lists.
4. No task runs `convex deploy`, uses `--prod`, targets Silverfish, or couples migrations/provisioning to build/dev/start. No `package.json` script is changed.

### Task 1: Lock the domain contract and shared schema

**Files:**

- Create: `convex/lib/teacherRecognition.ts`
- Create: `tests/teacher-recognition-domain.test.ts`
- Modify (integration owner only): `convex/schema.ts` at `oaForms`, after `oaApprovalEvents`, and before `reviewerAccounts`
- Modify (integration owner only): `convex/lib/r2.ts` at `R2Purpose` and `R2_PURPOSES`

- [ ] **Step 1: Write the failing domain-contract tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  assertTeacherRecognitionApplicant,
  buildTeacherRecognitionSystemForm,
  normalizeTeacherRecognitionDraft,
  toPublicTeacherRecognition,
} from "../convex/lib/teacherRecognition.ts"

test("only an explicit teacher identity may apply", () => {
  assert.doesNotThrow(() => assertTeacherRecognitionApplicant({ identityType: "teacher", role: "member" }))
  for (const identityType of ["undergrad", "graduate", "other", undefined]) {
    assert.throws(
      () => assertTeacherRecognitionApplicant({ identityType, role: "member" }),
      /仅教师账号可以申报教师荣誉与专业服务/,
    )
  }
})

test("normalization requires proof and snapshots the category label", () => {
  assert.throws(() => normalizeTeacherRecognitionDraft({
    reportingYear: 2026,
    categoryId: "category-1",
    categoryLabel: "Area Chair",
    name: "ACL Area Chair",
    organization: "ACL",
    startDate: "2026-01-01",
    proof: [],
  }), /请上传证明材料/)

  const value = normalizeTeacherRecognitionDraft({
    reportingYear: 2026,
    categoryId: "category-1",
    categoryLabel: "领域主席",
    name: "ACL Area Chair",
    organization: "ACL",
    startDate: "2026-01-01",
    explanation: "  负责主会审稿组织  ",
    proof: [{ storageId: "file-1", fileName: "proof.pdf", mimeType: "application/pdf", size: 10 }],
  })
  assert.equal(value.categoryLabel, "领域主席")
  assert.equal(value.explanation, "负责主会审稿组织")
})

test("system form is teacher-scoped and any-one reviewed", () => {
  const form = buildTeacherRecognitionSystemForm(["group-a", "group-b"])
  assert.equal(form.systemKey, "teacher_recognition")
  assert.deepEqual(form.targetScope, { identityTypes: ["teacher"] })
  assert.deepEqual(form.workflowDefinition.nodes[1], {
    id: "teacher_recognition_review",
    type: "batch_approval",
    title: "教师奖励审核",
    scope: { userGroupIds: ["group-a", "group-b"] },
    completion: "any",
  })
})

test("public projection contains no proof, private comment, or account id", () => {
  const projected = toPublicTeacherRecognition({
    reportingYear: 2026,
    categoryLabel: "奖项与荣誉",
    name: "最佳论文奖",
    organization: "Example Conference",
    startDate: "2026-07-01",
    endDate: "2026-07-02",
    explanation: "公开说明",
    proof: [{ storageId: "secret", fileName: "secret.pdf", mimeType: "application/pdf", size: 10 }],
    adminNote: "private",
    submitterId: "teacher-1",
  })
  assert.deepEqual(projected, {
    reportingYear: 2026,
    categoryLabel: "奖项与荣誉",
    name: "最佳论文奖",
    organization: "Example Conference",
    startDate: "2026-07-01",
    endDate: "2026-07-02",
  })
})
```

- [ ] **Step 2: Run the tests and confirm the missing module failure**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `convex/lib/teacherRecognition.ts`.

- [ ] **Step 3: Add the pure contract module**

```ts
import { resolveUserIdentityType } from "./userIdentity"

export const TEACHER_RECOGNITION_SYSTEM_KEY = "teacher_recognition" as const
export const TEACHER_RECOGNITION_FORM_SLUG = "teacher-recognition-and-service" as const
export const TEACHER_RECOGNITION_MAX_PROOF_BYTES = 20 * 1024 * 1024
export const TEACHER_RECOGNITION_PROOF_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

export type TeacherRecognitionProof = {
  storageId: string
  fileName: string
  mimeType: string
  size: number
}

export type TeacherRecognitionDraftValue = {
  reportingYear: number
  categoryId: unknown
  categoryLabel: string
  name: string
  organization: string
  startDate: string
  endDate?: string
  explanation?: string
  proof: TeacherRecognitionProof[]
}

const required = (value: unknown, message: string, max = 240) => {
  const text = String(value ?? "").trim().slice(0, max)
  if (!text) throw new Error(message)
  return text
}

export function assertTeacherRecognitionApplicant(user: { identityType?: unknown; role?: string }) {
  if (resolveUserIdentityType(user as never) !== "teacher") {
    throw new Error("仅教师账号可以申报教师荣誉与专业服务")
  }
}

export function normalizeTeacherRecognitionDraft(input: TeacherRecognitionDraftValue) {
  const reportingYear = Number(input.reportingYear)
  if (!Number.isInteger(reportingYear) || reportingYear < 1900 || reportingYear > 2200) throw new Error("申报年度无效")
  if (!input.categoryId) throw new Error("请选择申报类别")
  const proof = Array.isArray(input.proof) ? input.proof : []
  if (proof.length < 1) throw new Error("请上传证明材料")
  if (proof.length > 5) throw new Error("证明材料最多上传 5 个文件")
  return {
    reportingYear,
    categoryId: input.categoryId,
    categoryLabel: required(input.categoryLabel, "类别快照无效", 80),
    name: required(input.name, "请填写荣誉、职务或专业服务名称"),
    organization: required(input.organization, "请填写授予或任职机构"),
    startDate: required(input.startDate, "请选择开始日期", 10),
    ...(String(input.endDate ?? "").trim() ? { endDate: String(input.endDate).trim().slice(0, 10) } : {}),
    ...(String(input.explanation ?? "").trim() ? { explanation: String(input.explanation).trim().slice(0, 2000) } : {}),
    proof,
  }
}

export function buildTeacherRecognitionSystemForm(reviewerUserGroupIds: readonly unknown[]) {
  return {
    systemKey: TEACHER_RECOGNITION_SYSTEM_KEY,
    slug: TEACHER_RECOGNITION_FORM_SLUG,
    title: "教师荣誉与专业服务申报",
    description: "教师提交荣誉、奖励、学术职务与专业服务证明材料。",
    category: "teacher_recognition",
    kind: "form" as const,
    visibility: "members" as const,
    status: "published" as const,
    allowMultipleSubmissions: true,
    allowSubmissionEdits: true,
    targetScope: { identityTypes: ["teacher"] as const },
    workflowDefinition: {
      version: 2 as const,
      nodes: [
        { id: "create_form", type: "create_form" as const, title: "创建申报" },
        {
          id: "teacher_recognition_review",
          type: "batch_approval" as const,
          title: "教师奖励审核",
          scope: { userGroupIds: [...reviewerUserGroupIds] },
          completion: "any" as const,
        },
      ],
    },
  }
}

export function toPublicTeacherRecognition(source: TeacherRecognitionDraftValue) {
  return {
    reportingYear: source.reportingYear,
    categoryLabel: source.categoryLabel,
    name: source.name,
    organization: source.organization,
    startDate: source.startDate,
    ...(source.endDate ? { endDate: source.endDate } : {}),
  }
}
```

- [ ] **Step 4: Extend the schema without changing legacy OA unions**

Add `systemKey` and its index to `oaForms`; generic OA forms keep `systemKey` absent:

```ts
systemKey: v.optional(v.literal("teacher_recognition")),
// ...existing fields...
  .index("by_systemKey", ["systemKey"])
```

Add these tables after `oaApprovalEvents`:

```ts
teacherRecognitionSettings: defineTable({
  singletonKey: v.literal("default"),
  reviewerUserGroupIds: v.array(v.id("userGroups")),
  systemFormId: v.id("oaForms"),
  updatedByUserId: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_singletonKey", ["singletonKey"]),

teacherRecognitionCategories: defineTable({
  key: v.string(),
  label: v.string(),
  sortOrder: v.number(),
  status: v.union(v.literal("active"), v.literal("retired")),
  createdByUserId: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_key", ["key"])
  .index("by_status_order", ["status", "sortOrder"]),

teacherRecognitionDrafts: defineTable({
  teacherId: v.id("users"),
  reportingYear: v.number(),
  categoryId: v.id("teacherRecognitionCategories"),
  categoryLabelSnapshot: v.string(),
  name: v.string(),
  organization: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  explanation: v.optional(v.string()),
  proof: v.array(v.object({
    storageId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  })),
  version: v.number(),
  submittedSubmissionId: v.optional(v.id("oaFormSubmissions")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_teacher_updatedAt", ["teacherId", "updatedAt"])
  .index("by_submittedSubmissionId", ["submittedSubmissionId"]),
```

Extend the R2 union and set with exactly `"teacher-recognition-proof"`. Keep `oa-form-attachment` unchanged for generic OA.

- [ ] **Step 5: Run contract tests and schema type checks**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: 4 tests PASS.

Run: `npx tsc -p convex/tsconfig.json --noEmit`

Expected: PASS without a schema or validator error.

- [ ] **Step 6: Commit the contract and schema gate**

```bash
git add convex/schema.ts convex/lib/r2.ts convex/lib/teacherRecognition.ts tests/teacher-recognition-domain.test.ts
git commit -m "feat: define teacher recognition domain"
```

### Task 2: Provision reviewer groups, categories, and the protected system form

**Files:**

- Create: `convex/teacherRecognitions.ts`
- Modify (integration owner only): `convex/lib/oaWorkflow.ts` in `activateReviewNode`
- Modify: `tests/teacher-recognition-domain.test.ts`

- [ ] **Step 1: Add failing settings and category tests**

```ts
import {
  DEFAULT_TEACHER_RECOGNITION_CATEGORIES,
  normalizeReviewerUserGroupIds,
} from "../convex/lib/teacherRecognition.ts"

test("reviewer groups are required and de-duplicated", () => {
  assert.deepEqual(normalizeReviewerUserGroupIds(["b", "a", "b"]), ["a", "b"])
  assert.throws(() => normalizeReviewerUserGroupIds([]), /至少选择一个教师奖励审核用户组/)
})

test("default categories are stable and ordered", () => {
  assert.deepEqual(DEFAULT_TEACHER_RECOGNITION_CATEGORIES.map((item) => item.key), [
    "reviewer", "area_chair", "program_committee", "editorial_board",
    "academic_society_role", "award_or_honor", "other",
  ])
})
```

- [ ] **Step 2: Run the focused tests and verify missing exports**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: FAIL because `normalizeReviewerUserGroupIds` and `DEFAULT_TEACHER_RECOGNITION_CATEGORIES` are not exported.

- [ ] **Step 3: Add the deterministic settings helpers**

```ts
export const DEFAULT_TEACHER_RECOGNITION_CATEGORIES = [
  { key: "reviewer", label: "期刊或会议审稿人" },
  { key: "area_chair", label: "领域主席" },
  { key: "program_committee", label: "程序委员会" },
  { key: "editorial_board", label: "编委" },
  { key: "academic_society_role", label: "学术组织职务" },
  { key: "award_or_honor", label: "奖项与荣誉" },
  { key: "other", label: "其他" },
] as const

export function normalizeReviewerUserGroupIds(values: readonly unknown[]) {
  const ids = [...new Set(values.map(String).filter(Boolean))].sort()
  if (ids.length === 0) throw new Error("至少选择一个教师奖励审核用户组")
  return ids
}
```

- [ ] **Step 4: Implement super-admin settings/category mutations**

Create `convex/teacherRecognitions.ts` with these exports and gates:

```ts
export const getConfiguration = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.sessionToken)
    const [settings, categories] = await Promise.all([
      ctx.db.query("teacherRecognitionSettings").withIndex("by_singletonKey", q => q.eq("singletonKey", "default")).first(),
      ctx.db.query("teacherRecognitionCategories").collect(),
    ])
    return {
      reviewerUserGroupIds: (settings?.reviewerUserGroupIds ?? []).map(String),
      initialized: Boolean(settings),
      categories: categories.sort((a, b) => a.sortOrder - b.sortOrder).map(categoryDto),
    }
  },
})

export const setReviewerGroups = mutation({
  args: { sessionToken: v.string(), reviewerUserGroupIds: v.array(v.id("userGroups")) },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.sessionToken)
    const ids = normalizeReviewerUserGroupIds(args.reviewerUserGroupIds) as Id<"userGroups">[]
    const groups = await Promise.all(ids.map(id => ctx.db.get(id)))
    if (groups.some(group => !group)) throw new Error("审核用户组不存在")
    const now = Date.now()
    const form = await upsertSystemForm(ctx, admin, ids, now)
    await ensureDefaultCategories(ctx, admin._id, now)
    const existing = await ctx.db.query("teacherRecognitionSettings").withIndex("by_singletonKey", q => q.eq("singletonKey", "default")).first()
    const value = { reviewerUserGroupIds: ids, systemFormId: form._id, updatedByUserId: admin._id, updatedAt: now }
    if (existing) await ctx.db.patch(existing._id, value)
    else await ctx.db.insert("teacherRecognitionSettings", { singletonKey: "default", ...value, createdAt: now })
    return { updated: true }
  },
})
```

Also export `upsertCategory`, `reorderCategories`, and `setCategoryStatus`. Each calls `requireSuperAdmin`; key generation is immutable; label is 1–80 characters; reorder rejects duplicates/unknown IDs; retirement patches only `status` and never edits drafts or OA snapshots.

- [ ] **Step 5: Make resubmission reuse the immutable reviewer task panel for every system-form workflow**

In `activateReviewNode`, replace the reimbursement-only branching with this exact policy:

```ts
const resolvedRecipients = formKind === "reimbursement"
  ? await resolveCurrentReimbursementReviewers(ctx)
  : input.workflowVersion > 1
    ? await resolvePriorOAWorkflowReviewers(ctx, input)
    : await resolveOAWorkflowRecipients(ctx, input.node.scope)
```

This is already the existing generic behavior; add a regression comment that `teacher_recognition` stays on the non-reimbursement branch. Do not add live-group re-resolution on resubmission.

- [ ] **Step 6: Run tests, Convex codegen, and lint**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: 6 tests PASS.

Run: `npx convex codegen`

Expected: generated bindings complete locally; no deployment prompt or `--prod` flag.

Run: `npm run lint`

Expected: PASS with zero warnings.

- [ ] **Step 7: Commit provisioning**

```bash
git add convex/teacherRecognitions.ts convex/lib/teacherRecognition.ts convex/lib/oaWorkflow.ts tests/teacher-recognition-domain.test.ts
git commit -m "feat: configure teacher recognition reviewers"
```

### Task 3: Implement teacher drafts, required proof, and idempotent OA submission

**Files:**

- Modify: `convex/teacherRecognitions.ts`
- Modify: `convex/lib/teacherRecognition.ts`
- Modify: `tests/teacher-recognition-domain.test.ts`

- [ ] **Step 1: Add failing proof and idempotency tests**

```ts
import { fingerprintTeacherRecognition, validateTeacherRecognitionProof } from "../convex/lib/teacherRecognition.ts"

test("proof accepts the documented formats and enforces size", () => {
  assert.doesNotThrow(() => validateTeacherRecognitionProof({
    storageId: "r2:teacher-recognition-proof/2026/08/u/file-proof.pdf",
    fileName: "证明.pdf",
    mimeType: "application/pdf",
    size: 1024,
  }))
  assert.throws(() => validateTeacherRecognitionProof({
    storageId: "file",
    fileName: "proof.exe",
    mimeType: "application/octet-stream",
    size: 1024,
  }), /不支持该证明材料类型/)
})

test("submission fingerprint is stable and detects changed content", async () => {
  const base = { reportingYear: 2026, categoryId: "c", categoryLabel: "奖项", name: "A", organization: "B", startDate: "2026-01-01", proof: [{ storageId: "f", fileName: "p.pdf", mimeType: "application/pdf", size: 1 }] }
  assert.equal(await fingerprintTeacherRecognition(base), await fingerprintTeacherRecognition({ ...base }))
  assert.notEqual(await fingerprintTeacherRecognition(base), await fingerprintTeacherRecognition({ ...base, name: "C" }))
})
```

- [ ] **Step 2: Run the focused tests and verify the missing helpers**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: FAIL because proof validation and fingerprint exports do not exist.

- [ ] **Step 3: Add exact proof and fingerprint rules**

```ts
export function validateTeacherRecognitionProof(file: TeacherRecognitionProof) {
  if (!file.storageId) throw new Error("证明材料上传凭证无效")
  if (!TEACHER_RECOGNITION_PROOF_MIME_TYPES.includes(file.mimeType.toLowerCase() as never)) {
    throw new Error("不支持该证明材料类型")
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > TEACHER_RECOGNITION_MAX_PROOF_BYTES) {
    throw new Error("单个证明材料不能超过 20MB")
  }
}

export async function fingerprintTeacherRecognition(value: TeacherRecognitionDraftValue) {
  const canonical = JSON.stringify({
    ...value,
    proof: value.proof.map(file => ({ ...file })).sort((a, b) => a.storageId.localeCompare(b.storageId)),
  })
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
}
```

- [ ] **Step 4: Add teacher-only draft and upload functions**

Implement these exports; every handler starts with `assertTeacherRecognitionApplicant(await getUserBySession(...))`:

```ts
export const listMyDrafts = query({ args: { sessionToken: v.string() }, handler: listTeacherDrafts })
export const getMyDraft = query({ args: { sessionToken: v.string(), draftId: v.id("teacherRecognitionDrafts") }, handler: getTeacherDraft })
export const saveDraft = mutation({ args: { sessionToken: v.string(), draftId: v.optional(v.id("teacherRecognitionDrafts")), expectedVersion: v.optional(v.number()), value: draftValidator }, handler: saveTeacherDraft })
export const removeDraft = mutation({ args: { sessionToken: v.string(), draftId: v.id("teacherRecognitionDrafts"), expectedVersion: v.number() }, handler: removeTeacherDraft })
export const generateProofUploadUrl = mutation({ args: { sessionToken: v.string(), fileName: v.string(), mimeType: v.string() }, handler: createTeacherProofUpload })
```

`saveTeacherDraft` loads the selected active category, overwrites `categoryLabelSnapshot` from the database, verifies ownership/version, validates every R2 ID with `r2StorageIdMatches(storageId, { ownerId: String(user._id), purpose: "teacher-recognition-proof" })`, and uses `ctx.db.system.get` for native Convex storage metadata. It stores the server-observed MIME/size rather than browser values. `removeTeacherDraft` rejects submitted drafts.

- [ ] **Step 5: Add idempotent submit and resubmit paths**

```ts
export const submitDraft = mutation({
  args: {
    sessionToken: v.string(),
    draftId: v.id("teacherRecognitionDrafts"),
    expectedVersion: v.number(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx, args.sessionToken)
    const { draft, form, normalized } = await loadSubmittableDraft(ctx, teacher, args)
    const fingerprint = await fingerprintTeacherRecognition(normalized)
    const replay = await ctx.db.query("oaFormSubmissions")
      .withIndex("by_submitter_idempotency", q => q.eq("submitterId", teacher._id).eq("submissionIdempotencyKey", args.idempotencyKey))
      .first()
    if (replay) {
      if (replay.submissionRequestFingerprint !== fingerprint) throw new Error("同一提交请求标识不能用于不同内容")
      return replay._id
    }
    const now = Date.now()
    const submissionId = await ctx.db.insert("oaFormSubmissions", toOASubmission(form, teacher, normalized, args.idempotencyKey, fingerprint, now))
    const submission = await ctx.db.get(submissionId)
    if (!submission) throw new Error("申报创建失败")
    await startOAWorkflow(ctx, { form, submission, now })
    await ctx.db.patch(draft._id, { submittedSubmissionId: submissionId, version: draft.version + 1, updatedAt: now })
    return submissionId
  },
})
```

`toOASubmission` writes the category label into both `answers.category_label_snapshot` and the immutable `formSnapshot` option list. Add `updateNeedsChanges` that requires ownership, `workflowStatus === "needs_changes"`, exact `expectedVersion`, revalidates proof, patches answers, and calls `resumeOAWorkflow`; it does not re-resolve current group membership.

- [ ] **Step 6: Add teacher history/detail queries**

`listMine` returns drafts plus the current teacher's system-form OA submissions as one discriminated list (`recordType: "draft" | "submission"`). `getMine` returns only the owner row, its sanitized OA timeline, and proof metadata; neither query accepts a teacher ID from the browser.

- [ ] **Step 7: Run tests and backend checks**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: 8 tests PASS.

Run: `npx tsc -p convex/tsconfig.json --noEmit`

Expected: PASS.

- [ ] **Step 8: Commit teacher submission flow**

```bash
git add convex/teacherRecognitions.ts convex/lib/teacherRecognition.ts tests/teacher-recognition-domain.test.ts
git commit -m "feat: add teacher recognition submissions"
```

### Task 4: Add review authorization, private proof access, and approved-only projections

**Files:**

- Modify: `convex/teacherRecognitions.ts`
- Modify: `convex/lib/teacherRecognition.ts`
- Modify: `tests/teacher-recognition-domain.test.ts`

- [ ] **Step 1: Add failing authorization/projection tests**

```ts
import { canReadTeacherRecognitionProof, visibleTeacherRecognitionRows } from "../convex/lib/teacherRecognition.ts"

test("proof is private to owner, snapshotted reviewers, and super admins", () => {
  const input = { submitterId: "teacher", reviewerIds: ["reviewer"] }
  assert.equal(canReadTeacherRecognitionProof({ actorId: "teacher", actorRole: "member", ...input }), true)
  assert.equal(canReadTeacherRecognitionProof({ actorId: "reviewer", actorRole: "member", ...input }), true)
  assert.equal(canReadTeacherRecognitionProof({ actorId: "root", actorRole: "super_admin", ...input }), true)
  assert.equal(canReadTeacherRecognitionProof({ actorId: "admin", actorRole: "admin", ...input }), false)
})

test("public and annual output contains only approved rows", () => {
  const rows = [{ reviewStatus: "approved" }, { reviewStatus: "pending" }, { reviewStatus: "rejected" }]
  assert.deepEqual(visibleTeacherRecognitionRows(rows as never[]), [rows[0]])
})
```

- [ ] **Step 2: Run the tests and verify missing exports**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: FAIL because the proof and approved-only policies are not exported.

- [ ] **Step 3: Implement exact policies**

```ts
export function canReadTeacherRecognitionProof(input: {
  actorId: unknown
  actorRole?: string
  submitterId: unknown
  reviewerIds: readonly unknown[]
}) {
  const actorId = String(input.actorId)
  return input.actorRole === "super_admin"
    || actorId === String(input.submitterId)
    || input.reviewerIds.some(id => String(id) === actorId)
}

export function visibleTeacherRecognitionRows<T extends { reviewStatus?: string }>(rows: readonly T[]) {
  return rows.filter(row => row.reviewStatus === "approved")
}
```

- [ ] **Step 4: Add reviewer and manager queries around immutable OA tasks**

Add `getAccess`, `listReviewQueue`, `getReviewDetail`, and `listForManagement`:

- `getAccess` returns `{ isTeacher, canReview, canManage }`; `canReview` is true when the actor has at least one recognition task or belongs to a currently configured reviewer group; only `super_admin` receives `canManage: true` for all rows.
- `listReviewQueue` reads `oaApprovalTasks.by_user_status_createdAt`, joins only submissions whose form has `systemKey=teacher_recognition`, and returns proof metadata but not URLs.
- `getReviewDetail` authorizes by an OA task for that submission, including completed/skipped historical tasks; it never authorizes by current group membership alone.
- `listForManagement` accepts optional `year`, `teacherQuery`, `categoryId`, and `status`. Super admins receive all authorized rows; other actors receive only rows with their snapshotted task. Annual count cards are computed from the filtered approved rows.

Review actions continue through `oaForms:actOnApprovalTask`, preserving action idempotency, required request-changes comments, and any-one sibling skipping. The recognition review UI must require a non-empty reason for both `request_changes` and `reject`, even though generic OA permits an empty rejection comment.

- [ ] **Step 5: Add proof URL and public teacher-profile queries**

```ts
export const getProofUrl = query({
  args: { sessionToken: v.string(), submissionId: v.id("oaFormSubmissions"), storageId: v.string() },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const { submission, reviewerIds, proofIds } = await loadRecognitionProofContext(ctx, args.submissionId)
    if (!canReadTeacherRecognitionProof({ actorId: actor._id, actorRole: actor.role, submitterId: submission.submitterId, reviewerIds })) throw new Error("无权查看证明材料")
    if (!proofIds.has(args.storageId)) throw new Error("证明材料不属于该申报")
    return await getR2DownloadUrl(args.storageId) ?? await ctx.storage.getUrl(args.storageId as never)
  },
})

export const listPublicForPerson = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const person = await ctx.db.query("institutePeople").withIndex("by_slug", q => q.eq("slug", args.slug.trim())).first()
    if (!person || person.kind !== "teacher" || person.visibility !== "public" || !person.accountUserId) return []
    const form = await getSystemForm(ctx)
    if (!form) return []
    const rows = await ctx.db.query("oaFormSubmissions").withIndex("by_form_submitter_createdAt", q => q.eq("formId", form._id).eq("submitterId", person.accountUserId)).collect()
    return visibleTeacherRecognitionRows(rows).map(row => toPublicTeacherRecognition(fromOAAnswers(row.answers))).sort(comparePublicRecognition)
  },
})
```

- [ ] **Step 6: Verify any-one completion and duplicate-action behavior**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: 10 tests PASS.

Run: `rg -n 'completion: "any"|actionIdempotencyKey|markRemainingStepTasksSkipped' convex/lib/teacherRecognition.ts convex/lib/oaWorkflow.ts convex/oaForms.ts`

Expected: the recognition workflow is `any`; the existing OA action idempotency and sibling-skip paths are present.

- [ ] **Step 7: Commit review and privacy rules**

```bash
git add convex/teacherRecognitions.ts convex/lib/teacherRecognition.ts tests/teacher-recognition-domain.test.ts
git commit -m "feat: secure teacher recognition review"
```

### Task 5: Add canonical client types and hooks

**Files:**

- Create: `src/lib/teacher-recognition.ts`
- Modify (integration owner only): `src/lib/api.ts` after OA hooks
- Test: `tests/teacher-recognition-domain.test.ts`

- [ ] **Step 1: Add the client contract**

```ts
export type TeacherRecognitionStatus = "draft" | "pending" | "needs_changes" | "approved" | "rejected"

export type TeacherRecognitionValue = {
  reportingYear: number
  categoryId: string
  categoryLabel: string
  name: string
  organization: string
  startDate: string
  endDate?: string
  explanation?: string
  proof: Array<{ storageId: string; fileName: string; mimeType: string; size: number }>
}

export type PublicTeacherRecognition = Omit<TeacherRecognitionValue, "categoryId" | "explanation" | "proof">

export const teacherRecognitionStatusLabels: Record<TeacherRecognitionStatus, string> = {
  draft: "草稿",
  pending: "待审核",
  needs_changes: "需补材料",
  approved: "已通过",
  rejected: "已驳回",
}
```

Also export `teacherRecognitionStatusClass`, `formatTeacherRecognitionDateRange`, and `buildTeacherRecognitionExportRows`. The export header is exactly `年度、教师、类别、荣誉/职务/专业服务、机构、开始日期、结束日期、状态、说明、提交时间、审核时间`; formula-leading string cells are prefixed with `'` when the first character is `=`, `+`, `-`, or `@`.

- [ ] **Step 2: Add function references and hooks in `src/lib/api.ts`**

Add references for:

```ts
teacherRecognitions:getConfiguration
teacherRecognitions:setReviewerGroups
teacherRecognitions:upsertCategory
teacherRecognitions:reorderCategories
teacherRecognitions:setCategoryStatus
teacherRecognitions:getAccess
teacherRecognitions:listCategories
teacherRecognitions:listMine
teacherRecognitions:getMine
teacherRecognitions:saveDraft
teacherRecognitions:removeDraft
teacherRecognitions:generateProofUploadUrl
teacherRecognitions:submitDraft
teacherRecognitions:updateNeedsChanges
teacherRecognitions:listReviewQueue
teacherRecognitions:getReviewDetail
teacherRecognitions:listForManagement
teacherRecognitions:getProofUrl
teacherRecognitions:listPublicForPerson
```

Expose hooks named `useTeacherRecognitionConfiguration`, `useSetTeacherRecognitionReviewerGroups`, `useTeacherRecognitionCategories`, `useTeacherRecognitionAccess`, `useMyTeacherRecognitions`, `useTeacherRecognition`, `useSaveTeacherRecognitionDraft`, `useRemoveTeacherRecognitionDraft`, `useGenerateTeacherRecognitionProofUploadUrl`, `useSubmitTeacherRecognitionDraft`, `useUpdateTeacherRecognitionNeedsChanges`, `useTeacherRecognitionReviewQueue`, `useTeacherRecognitionReviewDetail`, `useTeacherRecognitionManagementRows`, `useTeacherRecognitionProofUrl`, and `usePublicTeacherRecognitions`. Every private hook obtains the session only through `useTongClassSessionToken`/`getTongClassStoredSessionToken`; components never call Convex directly.

- [ ] **Step 3: Typecheck hooks**

Run: `npx tsc --noEmit`

Expected: PASS with no mismatched IDs or status unions.

- [ ] **Step 4: Commit the client API**

```bash
git add src/lib/teacher-recognition.ts src/lib/api.ts
git commit -m "feat: expose teacher recognition api"
```

### Task 6: Add reviewer-group-only permission management

**Files:**

- Create: `src/components/teacher-recognition/teacher-recognition-permission-panel.tsx`
- Modify (after news permission commit): `src/components/permissions/platform-permissions-client.tsx`
- Modify: `src/app/platform/permissions/page.tsx`

- [ ] **Step 1: Build the isolated group editor**

The panel uses `useUserGroupScopeOptions`, `useTeacherRecognitionConfiguration`, and `useSetTeacherRecognitionReviewerGroups`. Render one checkbox per user group and one save button:

```tsx
<fieldset className="border-y aia-border-rule">
  <legend className="aia-serif py-3 text-lg font-semibold">审核用户组</legend>
  {groups.map(group => (
    <label key={group.id} className="flex min-h-11 items-center gap-3 border-t aia-border-rule py-3 text-sm">
      <input
        type="checkbox"
        checked={selectedIds.includes(group.id)}
        onChange={() => toggle(group.id)}
        className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]"
      />
      <span className="flex-1">{group.name}</span>
      <span className="aia-mono text-xs aia-text-muted">{group.memberCount} 人</span>
    </label>
  ))}
</fieldset>
```

The save button is disabled for an empty selection and displays `至少选择一个教师奖励审核用户组`. There are no create/manage checkboxes and no individual, role, identity, or research-group picker.

- [ ] **Step 2: Add a dedicated permissions tab**

Extend the local `PermissionCategory` union with `"teacher_recognition"`. Add a tab `{ kicker: "Recognition", label: "教师奖励", description: "仅配置审核用户组；申请资格由教师身份自动决定。" }`. In `PermissionWorkspace`, render `<TeacherRecognitionPermissionPanel />` for this category and keep `PermissionCategoryPanel` for news/events/reimbursement. Do not add `teacher_recognition` to `ContentPermissionCategory` or `contentPermissions`.

- [ ] **Step 3: Update metadata and access text**

Set the page description to `管理新闻、活动、报销与教师奖励审核权限。` Update the super-admin denial text to include teacher rewards. Preserve tab keyboard navigation, `aria-controls`, minimum 44px controls, square borders, serif headings, red active rule, and existing status/error patterns.

- [ ] **Step 4: Run lint and commit**

Run: `npm run lint`

Expected: PASS with zero warnings.

```bash
git add src/components/teacher-recognition/teacher-recognition-permission-panel.tsx src/components/permissions/platform-permissions-client.tsx src/app/platform/permissions/page.tsx
git commit -m "feat: configure teacher recognition review groups"
```

### Task 7: Build the teacher submission and history workspace

**Files:**

- Create: `src/components/teacher-recognition/teacher-recognition-workspace.tsx`
- Create: `src/app/services/teacher-recognitions/page.tsx`
- Modify: `src/app/services/oa/page.tsx`

- [ ] **Step 1: Add the server page and AIA entry point**

```tsx
export const metadata = {
  title: "我的荣誉与专业服务",
  description: "教师荣誉、奖励、学术职务与专业服务申报。",
  robots: { index: false, follow: false },
}

export default function TeacherRecognitionsPage() {
  return <TeacherRecognitionWorkspace />
}
```

Add an OA service-page link titled `教师荣誉与专业服务` with kicker `Recognition`, visible only when `useTeacherRecognitionAccess().isTeacher` is true. The card links to `/services/teacher-recognitions`; it does not surface the protected OA system form in generic `usePublishedOAForms` output.

- [ ] **Step 2: Implement draft editing with exact fields**

Render reporting year, active category, name, organization, start date, optional end date, optional explanation, and required proof. Use the existing upload-target response contract (`uploadUrl`, `method`, `headers`, `storageId`) and accept PDF/PNG/JPEG/DOC/DOCX, at most 5 files, 20MB each. Save uses `expectedVersion`; submit uses `crypto.randomUUID()` as its idempotency key and disables repeated clicks.

```tsx
const canSubmit = Boolean(
  value.reportingYear && value.categoryId && value.name.trim() && value.organization.trim()
  && value.startDate && value.proof.length > 0 && !isSaving,
)
```

If status is `needs_changes`, show the required reviewer comment above the editable fields and call `useUpdateTeacherRecognitionNeedsChanges` with the current workflow version. Approved/rejected/pending submissions are read-only.

- [ ] **Step 3: Add draft/history tabs and status states**

The default `申报记录` view displays newest first, with AIA status badges for draft/pending/needs-changes/approved/rejected. `新建申报` creates local blank state and only creates the server draft on Save. Empty, loading, unauthenticated, and non-teacher states use the existing OA text/border treatment; the non-teacher state says `有且只有教师账号可以发起教师奖励申报`.

- [ ] **Step 4: Verify responsive and keyboard behavior**

Run: `npm run dev`

Expected: `/services/teacher-recognitions` renders at 375px and 1440px; Tab reaches every field, upload/remove, Save, and Submit in visual order; focus uses `aia-focus`; no horizontal overflow; no browser console errors.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint`

Expected: PASS.

```bash
git add src/components/teacher-recognition/teacher-recognition-workspace.tsx src/app/services/teacher-recognitions/page.tsx src/app/services/oa/page.tsx
git commit -m "feat: add teacher recognition workspace"
```

### Task 8: Build reviewer queue, annual management, and server-authorized Excel export

**Files:**

- Create: `src/components/teacher-recognition/teacher-recognition-review-queue.tsx`
- Create: `src/components/teacher-recognition/teacher-recognition-management.tsx`
- Create: `src/app/services/teacher-recognitions/review/page.tsx`
- Create: `src/app/services/teacher-recognitions/manage/page.tsx`
- Create: `src/app/api/teacher-recognitions/export/route.ts`
- Modify: `src/lib/server/simple-xlsx.ts`

- [ ] **Step 1: Make the reusable XLSX builder accept sheet metadata**

Change the signature without changing existing callers:

```ts
export function buildSimpleXlsx(
  rows: XlsxCellValue[][],
  options: { sheetName?: string; title?: string; creator?: string } = {},
) {
  const sheetName = escapeXml((options.sheetName || "学术交流支持申请").slice(0, 31))
  const title = escapeXml(options.title || "学术交流支持申请汇总")
  const creator = escapeXml(options.creator || "Tong Class")
  // use sheetName/title/creator in the three existing XML positions
}
```

The existing academic-exchange export output remains byte-valid and keeps its default sheet name.

- [ ] **Step 2: Build the assigned reviewer queue**

The review page lists only recognition OA tasks returned by `listReviewQueue`. The detail panel shows the structured answers, proof links from `getProofUrl`, and three actions. Approve may omit a comment; request changes and reject require trimmed comments. Every action calls the existing `useReviewOAFormSubmission` with `taskId`, `expectedVersion`, and a fresh idempotency key. After a successful any-one decision, sibling reviewers see the row leave their pending queue and the action buttons disable on stale results.

- [ ] **Step 3: Build management filters and annual counts**

`TeacherRecognitionManagement` binds four filters (`year`, `teacherQuery`, `categoryId`, `status`) to `useTeacherRecognitionManagementRows`. Show counts for approved total and each active category for the selected year. Table columns match the export contract; proof links appear only in authenticated detail, never in list cells. Reviewers see only snapshotted assignments; super admins see all rows.

- [ ] **Step 4: Implement the authenticated Excel route**

```ts
function bearerToken(request: NextRequest) {
  const value = request.headers.get("authorization") || ""
  return value.startsWith("Bearer ") ? value.slice(7).trim() : ""
}

export async function POST(request: NextRequest) {
  const sessionToken = bearerToken(request)
  if (!sessionToken) return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 })
  const filters = await request.json().catch(() => ({}))
  const data = await getConvexHttpClient().query(exportRowsRef, { sessionToken, ...normalizeFilters(filters) } as never)
  const entries = buildSimpleXlsx(buildTeacherRecognitionExportRows(data.rows), {
    sheetName: "教师荣誉与专业服务",
    title: `${data.year || "全部年度"}教师荣誉与专业服务汇总`,
    creator: "AIA",
  })
  const bytes = buildSimpleZip(entries)
  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`教师荣誉与专业服务-${data.year || "全部"}.xlsx`)}`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  })
}
```

The Convex `exportRows` query repeats the same row-level authorization and filters as `listForManagement`; it ignores browser-supplied row contents or selected answers.

- [ ] **Step 5: Verify export authorization and formula escaping**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: tests include formula-leading names (`=cmd`, `+SUM`, `-1+1`, `@A1`) and verify each exported string begins with `'`.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit review, statistics, and export**

```bash
git add src/components/teacher-recognition/teacher-recognition-review-queue.tsx src/components/teacher-recognition/teacher-recognition-management.tsx src/app/services/teacher-recognitions/review/page.tsx src/app/services/teacher-recognitions/manage/page.tsx src/app/api/teacher-recognitions/export/route.ts src/lib/server/simple-xlsx.ts
git commit -m "feat: review and export teacher recognitions"
```

### Task 9: Add the approved-only public teacher-profile timeline

**Files:**

- Create: `src/components/teacher-recognition/teacher-recognition-timeline.tsx`
- Modify: `src/components/institute/live-person-profile.tsx`
- Modify: `src/components/institute/person-profile.tsx`
- Modify (integration owner only): `src/types/institute.ts`

- [ ] **Step 1: Add the public type and timeline contract**

Add `PublicTeacherRecognition` to `src/types/institute.ts` with only `reportingYear`, `categoryLabel`, `name`, `organization`, `startDate`, and optional `endDate`. Do not include IDs, explanation, proof, reviewer, comments, timestamps, or status.

- [ ] **Step 2: Implement the compact AIA timeline**

```tsx
export function TeacherRecognitionTimeline({ items }: { items: readonly PublicTeacherRecognition[] }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="teacher-recognition-title" className="mt-10 border aia-border-rule p-6 sm:p-7">
      <h2 id="teacher-recognition-title" className="aia-serif text-xl font-semibold tracking-tight">荣誉与专业服务</h2>
      <ol className="mt-5 border-t aia-border-rule">
        {items.map((item, index) => (
          <li key={`${item.reportingYear}-${item.name}-${index}`} className="grid gap-2 border-b aia-border-rule py-4 sm:grid-cols-[5rem_1fr]">
            <span className="aia-mono text-xs aia-text-muted">{item.reportingYear}</span>
            <div>
              <p className="font-semibold text-[hsl(var(--aia-ink))]">{item.name}</p>
              <p className="mt-1 text-sm aia-text-muted">{item.organization} · {item.categoryLabel}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 3: Fetch by bound teacher profile and render**

In `LivePersonProfile`, call `usePublicTeacherRecognitions(slug)`. Treat `undefined` as part of the existing loading state. Pass the returned list to `PersonProfile`; only render the timeline when `person.kind === "teacher"`. This relies exclusively on the exact `institutePeople.accountUserId` binding and never matches by teacher name.

- [ ] **Step 4: Verify public privacy**

Run: `rg -n 'proof|storageId|adminNote|reviewer|submitterId' src/components/teacher-recognition/teacher-recognition-timeline.tsx src/types/institute.ts`

Expected: no matches in the public timeline/type additions.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit public output**

```bash
git add src/components/teacher-recognition/teacher-recognition-timeline.tsx src/components/institute/live-person-profile.tsx src/components/institute/person-profile.tsx src/types/institute.ts
git commit -m "feat: show approved teacher recognitions"
```

### Task 10: Complete integrated verification without deployment

**Files:**

- Modify only if verification finds a defect in files already listed above.

- [ ] **Step 1: Run the complete domain suite**

Run: `node --test tests/teacher-recognition-domain.test.ts`

Expected: all tests PASS, including teacher-only authorization, required proof, category snapshots, any-one workflow definition, private proof policy, approved-only projection, stable fingerprints, and Excel escaping.

- [ ] **Step 2: Prove every private endpoint applies its gate**

Run: `rg -n 'export const (getConfiguration|setReviewerGroups|upsertCategory|reorderCategories|setCategoryStatus|listMyDrafts|getMyDraft|saveDraft|removeDraft|generateProofUploadUrl|submitDraft|updateNeedsChanges|listMine|getMine|listReviewQueue|getReviewDetail|listForManagement|getProofUrl|exportRows)' convex/teacherRecognitions.ts`

Expected: every listed function exists.

Run: `rg -n 'requireTeacher\(|requireSuperAdmin\(|requireRecognitionReviewer\(|canReadTeacherRecognitionProof\(' convex/teacherRecognitions.ts`

Expected: mutations and private queries show their teacher, super-admin, reviewer-task, or proof-specific gate; `listPublicForPerson` is the sole anonymous projection and filters approved rows.

- [ ] **Step 3: Run lint, type checks, and production build locally**

Run: `npm run lint`

Expected: PASS with zero warnings.

Run: `npx tsc --noEmit`

Expected: PASS.

Run: `npm run build`

Expected: Convex codegen and Next build PASS. This is a local build only; do not run `npm run start`, `convex deploy`, `--prod`, or any Silverfish command.

- [ ] **Step 4: Perform the workflow smoke test on local development only**

Use local Convex and Next development services. As a super admin, configure one user group; as a non-teacher, verify draft/upload/submit are denied; as a teacher, save and submit with proof; as one of two reviewers, request changes then resubmit and approve; verify the sibling task closes; verify only the approved row appears in management annual counts, XLSX, and the bound public teacher profile. Verify an ordinary admin, unrelated teacher, and unrelated reviewer cannot retrieve the proof URL.

Expected: all authorization, resubmission, any-one, privacy, statistics, and public-profile checks behave as specified with no console errors.

- [ ] **Step 5: Check AIA visual and accessibility consistency**

Inspect permissions, teacher workspace, reviewer queue, management table, and public profile at 375px/768px/1440px. Expected: paper background, ink text, red accent, fine rules, serif headings, mono metadata, square controls, existing status badges, visible focus, semantic headings/fieldsets/tables, linked labels, 44px targets, and no inaccessible hover-only action.

- [ ] **Step 6: Check diff hygiene and forbidden operations**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git diff -- package.json | rg '"scripts"'`

Expected: no output.

Run: `git status --short`

Expected: only intentional feature files remain; no generated `_generated/` files are tracked.

- [ ] **Step 7: Commit verification fixes, if any**

```bash
git add convex src tests
git commit -m "test: verify teacher recognition workflow"
```

Do not create this commit when verification required no file changes.
