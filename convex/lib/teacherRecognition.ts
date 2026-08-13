export const TEACHER_RECOGNITION_SYSTEM_KEY = "teacher_recognition" as const
export const TEACHER_RECOGNITION_FORM_SLUG = "teacher-recognition-and-service" as const
export const TEACHER_RECOGNITION_MAX_PROOF_BYTES = 20 * 1024 * 1024
export const TEACHER_RECOGNITION_MAX_PROOF_FILES = 5

export const TEACHER_RECOGNITION_PROOF_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

export const DEFAULT_TEACHER_RECOGNITION_CATEGORIES = [
  { key: "reviewer", label: "期刊或会议审稿人" },
  { key: "area_chair", label: "领域主席" },
  { key: "program_committee", label: "程序委员会" },
  { key: "editorial_board", label: "编委" },
  { key: "academic_society_role", label: "学术组织职务" },
  { key: "award_or_honor", label: "奖项与荣誉" },
  { key: "other", label: "其他" },
] as const

export const teacherRecognitionStatusLabels = {
  draft: "草稿",
  pending: "待审核",
  needs_changes: "需补材料",
  approved: "已通过",
  rejected: "已驳回",
} as const

export type TeacherRecognitionStatus = keyof typeof teacherRecognitionStatusLabels

export const teacherRecognitionStatusTransitions: Readonly<
  Record<TeacherRecognitionStatus, readonly TeacherRecognitionStatus[]>
> = {
  draft: ["pending"],
  pending: ["needs_changes", "approved", "rejected"],
  needs_changes: ["pending"],
  approved: [],
  rejected: [],
}

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

export type TeacherRecognitionCategoryInput = {
  key: unknown
  label: unknown
  sortOrder: unknown
  status?: unknown
}

const REQUIRED_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CATEGORY_KEY_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/
const UNSAFE_FILE_NAME_PATTERN = /[\0/\\]/

function requiredText(value: unknown, message: string, maxLength = 240) {
  const text = String(value ?? "").trim()
  if (!text) throw new Error(message)
  if (text.length > maxLength) throw new Error(`${message}（最多 ${maxLength} 个字符）`)
  return text
}

function optionalText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim()
  if (!text) return undefined
  if (text.length > maxLength) throw new Error(`内容最多 ${maxLength} 个字符`)
  return text
}

function normalizedDate(value: unknown, message: string) {
  const date = requiredText(value, message, 10)
  if (!REQUIRED_DATE_PATTERN.test(date)) throw new Error(message)
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(message)
  }
  return date
}

/** Applicant eligibility is identity-based; access roles never imply teacher status. */
export function assertTeacherRecognitionApplicant(user: {
  identityType?: unknown
  role?: unknown
}) {
  if (user.identityType !== "teacher") {
    throw new Error("仅教师账号可以申报教师荣誉与专业服务")
  }
}

export function validateTeacherRecognitionProof(
  input: TeacherRecognitionProof,
): TeacherRecognitionProof {
  const storageId = requiredText(input.storageId, "证明材料上传凭证无效", 1000)
  const fileName = requiredText(input.fileName, "证明材料文件名无效", 255)
  if (UNSAFE_FILE_NAME_PATTERN.test(fileName) || fileName === "." || fileName === "..") {
    throw new Error("证明材料文件名无效")
  }

  const mimeType = requiredText(input.mimeType, "不支持该证明材料类型", 200).toLowerCase()
  if (!(TEACHER_RECOGNITION_PROOF_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new Error("不支持该证明材料类型")
  }

  const size = Number(input.size)
  if (!Number.isSafeInteger(size) || size <= 0 || size > TEACHER_RECOGNITION_MAX_PROOF_BYTES) {
    throw new Error("单个证明材料不能超过 20MB，且文件不能为空")
  }

  return { storageId, fileName, mimeType, size }
}

export function normalizeTeacherRecognitionDraft(input: TeacherRecognitionDraftValue) {
  const reportingYear = Number(input.reportingYear)
  if (!Number.isInteger(reportingYear) || reportingYear < 1900 || reportingYear > 2200) {
    throw new Error("申报年度无效")
  }
  const categoryId = requiredText(input.categoryId, "请选择申报类别", 200)
  const categoryLabel = requiredText(input.categoryLabel, "类别快照无效", 80)
  const name = requiredText(input.name, "请填写荣誉、职务或专业服务名称")
  const organization = requiredText(input.organization, "请填写授予或任职机构")
  const startDate = normalizedDate(input.startDate, "请选择有效的开始日期")
  const rawEndDate = String(input.endDate ?? "").trim()
  const endDate = rawEndDate ? normalizedDate(rawEndDate, "请选择有效的结束日期") : undefined
  if (endDate && endDate < startDate) throw new Error("结束日期不能早于开始日期")

  if (!Array.isArray(input.proof) || input.proof.length === 0) {
    throw new Error("请上传证明材料")
  }
  if (input.proof.length > TEACHER_RECOGNITION_MAX_PROOF_FILES) {
    throw new Error(`证明材料最多上传 ${TEACHER_RECOGNITION_MAX_PROOF_FILES} 个文件`)
  }
  const proof = input.proof.map(validateTeacherRecognitionProof)
  const explanation = optionalText(input.explanation, 2000)

  return {
    reportingYear,
    categoryId,
    categoryLabel,
    name,
    organization,
    startDate,
    ...(endDate ? { endDate } : {}),
    ...(explanation ? { explanation } : {}),
    proof,
  }
}

export function normalizeReviewerUserGroupIds(values: readonly unknown[]) {
  const ids = [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
  if (ids.length === 0) throw new Error("至少选择一个教师奖励审核用户组")
  return ids
}

export function normalizeTeacherRecognitionCategories(
  categories: readonly TeacherRecognitionCategoryInput[],
) {
  const seenKeys = new Set<string>()
  return categories
    .map((category, sourceIndex) => {
      const key = requiredText(category.key, "类别标识不能为空", 80).toLowerCase()
      if (!CATEGORY_KEY_PATTERN.test(key)) throw new Error("类别标识格式无效")
      if (seenKeys.has(key)) throw new Error("类别标识不能重复")
      seenKeys.add(key)
      const label = requiredText(category.label, "类别名称不能为空", 80)
      const sortOrder = Number(category.sortOrder)
      if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) throw new Error("类别排序值无效")
      const rawStatus = category.status ?? "active"
      if (rawStatus !== "active" && rawStatus !== "retired") throw new Error("类别状态无效")
      const status = rawStatus as "active" | "retired"
      return { key, label, sortOrder, status, sourceIndex }
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.sourceIndex - right.sourceIndex)
    .map(({ sourceIndex: _sourceIndex, ...category }) => category)
}

export function buildTeacherRecognitionSystemForm(
  reviewerUserGroupIds: readonly unknown[],
) {
  const normalizedReviewerIds = normalizeReviewerUserGroupIds(reviewerUserGroupIds)
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
          scope: { userGroupIds: normalizedReviewerIds },
          completion: "any" as const,
        },
      ],
    },
  }
}

function canonicalTeacherRecognition(value: TeacherRecognitionDraftValue) {
  const normalized = normalizeTeacherRecognitionDraft(value)
  return {
    reportingYear: normalized.reportingYear,
    categoryId: normalized.categoryId,
    categoryLabel: normalized.categoryLabel,
    name: normalized.name,
    organization: normalized.organization,
    startDate: normalized.startDate,
    ...(normalized.endDate ? { endDate: normalized.endDate } : {}),
    ...(normalized.explanation ? { explanation: normalized.explanation } : {}),
    proof: [...normalized.proof].sort((left, right) =>
      left.storageId.localeCompare(right.storageId)
      || left.fileName.localeCompare(right.fileName),
    ),
  }
}

export async function fingerprintTeacherRecognition(value: TeacherRecognitionDraftValue) {
  const canonical = JSON.stringify(canonicalTeacherRecognition(value))
  const bytes = new TextEncoder().encode(canonical)
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function canTransitionTeacherRecognitionStatus(
  from: TeacherRecognitionStatus,
  to: TeacherRecognitionStatus,
) {
  return teacherRecognitionStatusTransitions[from].includes(to)
}

export function canReadTeacherRecognitionProof(input: {
  actorId: unknown
  actorRole?: string
  submitterId: unknown
  reviewerIds: readonly unknown[]
}) {
  const actorId = String(input.actorId)
  return input.actorRole === "super_admin"
    || actorId === String(input.submitterId)
    || input.reviewerIds.some((reviewerId) => String(reviewerId) === actorId)
}

export function visibleTeacherRecognitionRows<T extends { reviewStatus?: string }>(
  rows: readonly T[],
) {
  return rows.filter((row) => row.reviewStatus === "approved")
}

export function toPublicTeacherRecognition(source: {
  reportingYear: number
  categoryLabel: string
  name: string
  organization: string
  startDate: string
  endDate?: string
  [key: string]: unknown
}) {
  return {
    reportingYear: source.reportingYear,
    categoryLabel: source.categoryLabel,
    name: source.name,
    organization: source.organization,
    startDate: source.startDate,
    ...(source.endDate ? { endDate: source.endDate } : {}),
  }
}

export function buildTeacherRecognitionAnnualStats<T extends {
  reviewStatus?: string
  reportingYear: number
  categoryLabel: string
}>(rows: readonly T[]) {
  const visibleRows = visibleTeacherRecognitionRows(rows)
  const years = new Map<number, number>()
  const categories = new Map<string, number>()
  for (const row of visibleRows) {
    years.set(row.reportingYear, (years.get(row.reportingYear) ?? 0) + 1)
    categories.set(row.categoryLabel, (categories.get(row.categoryLabel) ?? 0) + 1)
  }
  return {
    approvedTotal: visibleRows.length,
    byYear: [...years].map(([reportingYear, count]) => ({ reportingYear, count }))
      .sort((left, right) => right.reportingYear - left.reportingYear),
    byCategory: [...categories].map(([categoryLabel, count]) => ({ categoryLabel, count }))
      .sort((left, right) => left.categoryLabel.localeCompare(right.categoryLabel, "zh-CN")),
  }
}
