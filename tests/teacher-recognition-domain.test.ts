import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_TEACHER_RECOGNITION_CATEGORIES,
  assertTeacherRecognitionApplicant,
  buildTeacherRecognitionAnnualStats,
  buildTeacherRecognitionSystemForm,
  canTransitionTeacherRecognitionStatus,
  canReadTeacherRecognitionProof,
  fingerprintTeacherRecognition,
  normalizeReviewerUserGroupIds,
  normalizeTeacherRecognitionCategories,
  normalizeTeacherRecognitionDraft,
  teacherRecognitionStatusLabels,
  toPublicTeacherRecognition,
  validateTeacherRecognitionProof,
  visibleTeacherRecognitionRows,
} from "../convex/lib/teacherRecognition.ts"
import {
  buildTeacherRecognitionExportRows,
  escapeTeacherRecognitionSpreadsheetCell,
  formatTeacherRecognitionDateRange,
  getTeacherRecognitionStatusLabel,
} from "../src/lib/teacher-recognition.ts"

const proof = {
  storageId: "r2:teacher-recognition-proof/2026/08/u/file-proof.pdf",
  fileName: "证明.pdf",
  mimeType: "application/pdf",
  size: 1024,
}

const draft = {
  reportingYear: 2026,
  categoryId: "category-1",
  categoryLabel: "领域主席",
  name: "ACL Area Chair",
  organization: "ACL",
  startDate: "2026-01-01",
  explanation: "  负责主会审稿组织  ",
  proof: [proof],
}

test("only an explicit teacher identity may apply", () => {
  assert.doesNotThrow(() =>
    assertTeacherRecognitionApplicant({ identityType: "teacher", role: "member" }),
  )
  for (const identityType of ["undergrad", "graduate", "other", undefined]) {
    assert.throws(
      () => assertTeacherRecognitionApplicant({ identityType, role: "member" }),
      /仅教师账号可以申报教师荣誉与专业服务/,
    )
  }
})

test("normalization snapshots category and trims optional explanation", () => {
  assert.throws(
    () => normalizeTeacherRecognitionDraft({ ...draft, proof: [] }),
    /请上传证明材料/,
  )
  assert.throws(
    () => normalizeTeacherRecognitionDraft({ ...draft, endDate: "2025-12-31" }),
    /结束日期不能早于开始日期/,
  )

  assert.deepEqual(normalizeTeacherRecognitionDraft(draft), {
    reportingYear: 2026,
    categoryId: "category-1",
    categoryLabel: "领域主席",
    name: "ACL Area Chair",
    organization: "ACL",
    startDate: "2026-01-01",
    explanation: "负责主会审稿组织",
    proof: [proof],
  })
})

test("proof accepts only safe documented formats and bounded metadata", () => {
  assert.doesNotThrow(() => validateTeacherRecognitionProof(proof))
  assert.throws(
    () => validateTeacherRecognitionProof({ ...proof, mimeType: "application/octet-stream" }),
    /不支持该证明材料类型/,
  )
  assert.throws(
    () => validateTeacherRecognitionProof({ ...proof, size: 20 * 1024 * 1024 + 1 }),
    /不能超过 20MB/,
  )
  assert.throws(
    () => validateTeacherRecognitionProof({ ...proof, fileName: "../secret.pdf" }),
    /文件名无效/,
  )
})

test("system form is teacher-scoped and any-one reviewed", () => {
  const form = buildTeacherRecognitionSystemForm(["group-b", "group-a", "group-b"])
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

test("reviewer groups and configured categories normalize deterministically", () => {
  assert.deepEqual(normalizeReviewerUserGroupIds(["b", "a", "b"]), ["a", "b"])
  assert.throws(
    () => normalizeReviewerUserGroupIds([]),
    /至少选择一个教师奖励审核用户组/,
  )
  assert.deepEqual(
    DEFAULT_TEACHER_RECOGNITION_CATEGORIES.map((item) => item.key),
    [
      "reviewer",
      "area_chair",
      "program_committee",
      "editorial_board",
      "academic_society_role",
      "award_or_honor",
      "other",
    ],
  )
  assert.deepEqual(
    normalizeTeacherRecognitionCategories([
      { key: " award ", label: " 奖项 ", sortOrder: 3, status: "active" },
      { key: "reviewer", label: "审稿人", sortOrder: 1, status: "retired" },
    ]).map((item) => item.key),
    ["reviewer", "award"],
  )
})

test("submission fingerprint is stable for equivalent normalized content", async () => {
  const first = await fingerprintTeacherRecognition({
    ...draft,
    proof: [proof, { ...proof, storageId: "z", fileName: "z.pdf" }],
  })
  const replay = await fingerprintTeacherRecognition({
    ...draft,
    proof: [{ ...proof, storageId: "z", fileName: "z.pdf" }, proof],
  })
  assert.equal(first, replay)
  assert.notEqual(first, await fingerprintTeacherRecognition({ ...draft, name: "ACL 2027" }))
})

test("status labels cover the workflow and reject unknown values", () => {
  assert.deepEqual(Object.keys(teacherRecognitionStatusLabels), [
    "draft",
    "pending",
    "needs_changes",
    "approved",
    "rejected",
  ])
  assert.equal(getTeacherRecognitionStatusLabel("needs_changes"), "需补材料")
  assert.equal(getTeacherRecognitionStatusLabel("unknown"), "未知状态")
  assert.equal(canTransitionTeacherRecognitionStatus("draft", "pending"), true)
  assert.equal(canTransitionTeacherRecognitionStatus("pending", "needs_changes"), true)
  assert.equal(canTransitionTeacherRecognitionStatus("needs_changes", "pending"), true)
  assert.equal(canTransitionTeacherRecognitionStatus("approved", "pending"), false)
})

test("proof is private to owner, snapshotted reviewers, and super admins", () => {
  const input = { submitterId: "teacher", reviewerIds: ["reviewer"] }
  assert.equal(canReadTeacherRecognitionProof({ actorId: "teacher", actorRole: "member", ...input }), true)
  assert.equal(canReadTeacherRecognitionProof({ actorId: "reviewer", actorRole: "member", ...input }), true)
  assert.equal(canReadTeacherRecognitionProof({ actorId: "root", actorRole: "super_admin", ...input }), true)
  assert.equal(canReadTeacherRecognitionProof({ actorId: "admin", actorRole: "admin", ...input }), false)
})

test("public projection contains no proof, comments, explanation, or user ids", () => {
  const projected = toPublicTeacherRecognition({
    ...draft,
    endDate: "2026-07-02",
    adminNote: "private",
    submitterId: "teacher-1",
  })
  assert.deepEqual(projected, {
    reportingYear: 2026,
    categoryLabel: "领域主席",
    name: "ACL Area Chair",
    organization: "ACL",
    startDate: "2026-01-01",
    endDate: "2026-07-02",
  })
})

test("public and annual output contains only approved rows", () => {
  const rows = [
    { reviewStatus: "approved", reportingYear: 2026, categoryLabel: "领域主席" },
    { reviewStatus: "approved", reportingYear: 2025, categoryLabel: "奖项与荣誉" },
    { reviewStatus: "pending", reportingYear: 2026, categoryLabel: "领域主席" },
    { reviewStatus: "rejected", reportingYear: 2026, categoryLabel: "领域主席" },
  ]
  assert.deepEqual(visibleTeacherRecognitionRows(rows), [rows[0], rows[1]])
  assert.deepEqual(buildTeacherRecognitionAnnualStats(rows), {
    approvedTotal: 2,
    byYear: [
      { reportingYear: 2026, count: 1 },
      { reportingYear: 2025, count: 1 },
    ],
    byCategory: [
      { categoryLabel: "奖项与荣誉", count: 1 },
      { categoryLabel: "领域主席", count: 1 },
    ],
  })
})

test("client date and export helpers are deterministic and formula-safe", () => {
  assert.equal(formatTeacherRecognitionDateRange("2026-01-01", "2026-02-02"), "2026-01-01 — 2026-02-02")
  assert.equal(formatTeacherRecognitionDateRange("2026-01-01"), "2026-01-01 起")
  assert.equal(escapeTeacherRecognitionSpreadsheetCell("=HYPERLINK(\"bad\")"), "'=HYPERLINK(\"bad\")")

  const exportRows = buildTeacherRecognitionExportRows([
    {
      reportingYear: 2026,
      teacherName: "+张老师",
      categoryLabel: "领域主席",
      name: "ACL Area Chair",
      organization: "ACL",
      startDate: "2026-01-01",
      reviewStatus: "approved",
      explanation: "说明",
      submittedAt: 1_786_089_600_000,
      reviewedAt: 1_786_176_000_000,
    },
  ])
  assert.deepEqual(exportRows[0], [
    "年度", "教师", "类别", "荣誉/职务/专业服务", "机构", "开始日期", "结束日期",
    "状态", "说明", "提交时间", "审核时间",
  ])
  assert.equal(exportRows[1][1], "'+张老师")
  assert.equal(exportRows[1][7], "已通过")
})
