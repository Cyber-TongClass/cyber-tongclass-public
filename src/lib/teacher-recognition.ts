export type TeacherRecognitionStatus =
  | "draft"
  | "pending"
  | "needs_changes"
  | "approved"
  | "rejected"

export type TeacherRecognitionProof = {
  storageId: string
  fileName: string
  mimeType: string
  size: number
}

export type TeacherRecognitionValue = {
  reportingYear: number
  categoryId: string
  categoryLabel: string
  name: string
  organization: string
  startDate: string
  endDate?: string
  explanation?: string
  proof: TeacherRecognitionProof[]
}

export type PublicTeacherRecognition = Omit<
  TeacherRecognitionValue,
  "categoryId" | "explanation" | "proof"
>

export const teacherRecognitionStatusLabels: Record<TeacherRecognitionStatus, string> = {
  draft: "草稿",
  pending: "待审核",
  needs_changes: "需补材料",
  approved: "已通过",
  rejected: "已驳回",
}

export const teacherRecognitionStatusClass: Record<TeacherRecognitionStatus, string> = {
  draft: "border-slate-300 bg-slate-50 text-slate-700",
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  needs_changes: "border-orange-300 bg-orange-50 text-orange-800",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  rejected: "border-red-300 bg-red-50 text-red-800",
}

export function getTeacherRecognitionStatusLabel(status: unknown) {
  return typeof status === "string" && status in teacherRecognitionStatusLabels
    ? teacherRecognitionStatusLabels[status as TeacherRecognitionStatus]
    : "未知状态"
}

export function formatTeacherRecognitionDateRange(startDate: string, endDate?: string) {
  const start = String(startDate ?? "").trim()
  const end = String(endDate ?? "").trim()
  if (!start) return end || "—"
  return end ? `${start} — ${end}` : `${start} 起`
}

export function escapeTeacherRecognitionSpreadsheetCell(value: unknown) {
  if (value == null) return ""
  if (typeof value !== "string") return value
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

export type TeacherRecognitionExportRow = {
  reportingYear: number
  teacherName: string
  categoryLabel: string
  name: string
  organization: string
  startDate: string
  endDate?: string
  reviewStatus: string
  explanation?: string
  submittedAt?: number | string
  reviewedAt?: number | string
}

function formatExportTimestamp(value: number | string | undefined) {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().replace("T", " ").slice(0, 19)
}

export const TEACHER_RECOGNITION_EXPORT_HEADERS = [
  "年度",
  "教师",
  "类别",
  "荣誉/职务/专业服务",
  "机构",
  "开始日期",
  "结束日期",
  "状态",
  "说明",
  "提交时间",
  "审核时间",
] as const

export function buildTeacherRecognitionExportRows(rows: readonly TeacherRecognitionExportRow[]) {
  const body = rows.map((row) => [
    row.reportingYear,
    row.teacherName,
    row.categoryLabel,
    row.name,
    row.organization,
    row.startDate,
    row.endDate ?? "",
    getTeacherRecognitionStatusLabel(row.reviewStatus),
    row.explanation ?? "",
    formatExportTimestamp(row.submittedAt),
    formatExportTimestamp(row.reviewedAt),
  ].map(escapeTeacherRecognitionSpreadsheetCell))

  return [[...TEACHER_RECOGNITION_EXPORT_HEADERS], ...body]
}
