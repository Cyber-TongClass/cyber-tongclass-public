export type OAFormStatus = "draft" | "published" | "archived"
export type OAFormKind = "form" | "reimbursement"
export type OAReviewStatus = "pending" | "approved" | "rejected" | "needs_changes"
export type OAFieldType = "text" | "textarea" | "number" | "date" | "select" | "radio" | "checkbox" | "file" | "table"
export type OAResultFieldType = "text" | "number" | "date" | "select"

export type OAFormOption = {
  label: string
  value: string
}

export type OATableColumn = {
  id: string
  label: string
  type: "text" | "number" | "date"
  required?: boolean
}

export type OAFormField = {
  id: string
  type: OAFieldType
  label: string
  helpText?: string
  placeholder?: string
  required?: boolean
  options?: OAFormOption[]
  acceptedMimeTypes?: string[]
  maxFiles?: number
  maxFileSizeMB?: number
  columns?: OATableColumn[]
}

export type OAResultField = {
  id: string
  label: string
  type: OAResultFieldType
  visibleToSubmitter?: boolean
  options?: OAFormOption[]
}

export type OAFormLike = {
  title?: string
  slug?: string
  kind?: OAFormKind
  status?: OAFormStatus
  closeAt?: number
  fields: OAFormField[]
  resultFields?: OAResultField[]
}

export type OAFormUpsertPayload = {
  id?: string
  title: string
  slug: string
  description?: string
  category?: string
  kind?: OAFormKind
  visibility?: "members" | "admins"
  status?: OAFormStatus
  allowMultipleSubmissions?: boolean
  maxSubmissionsPerUser?: number
  allowSubmissionEdits?: boolean
  openAt?: number
  closeAt?: number
  fields: OAFormField[]
  resultFields?: OAResultField[]
  resultsVisible?: boolean
}

export type OAFileMetadata = {
  storageId: string
  fileName: string
  mimeType: string
  size: number
}

export type OASubmissionLike = {
  submitterName?: string
  studentId?: string
  reviewStatus: OAReviewStatus
  answers: Record<string, unknown>
  resultValues?: Record<string, unknown>
  submittedAt?: number
}

export const oaReviewStatusLabels: Record<OAReviewStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
  needs_changes: "需补材料",
}

export const oaFormStatusLabels: Record<OAFormStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
}

const PINYIN_MAP: Record<string, string> = {
  奖: "jiang",
  学: "xue",
  金: "jin",
  申: "shen",
  请: "qing",
  学术: "xue-shu",
  术: "shu",
  交: "jiao",
  流: "liu",
  报: "bao",
  销: "xiao",
  表: "biao",
  单: "dan",
  出: "chu",
  国: "guo",
  境: "jing",
  支: "zhi",
  持: "chi",
  项: "xiang",
  目: "mu",
  活: "huo",
  动: "dong",
  费: "fei",
  用: "yong",
  填: "tian",
  写: "xie",
  问: "wen",
  卷: "juan",
  通: "tong",
  班: "ban",
}

function transliterateChinese(input: string) {
  return Array.from(input).map((char) => PINYIN_MAP[char] || " ").join("-")
}

export function normalizeFormSlug(value: string) {
  const ascii = value
    .trim()
    .toLowerCase()
    .replace(/[\u4e00-\u9fff]+/g, (segment) => transliterateChinese(segment))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")

  return ascii || "form"
}

function fieldIdFromLabel(label: string, fallback: string) {
  const normalized = normalizeFormSlug(label).replace(/-/g, "_")
  return normalized === "form" ? fallback : normalized
}

export function createDefaultOAFormDraft(title: string) {
  const normalizedTitle = title.trim() || "新建 OA 表单"
  return {
    title: normalizedTitle,
    slug: normalizeFormSlug(normalizedTitle),
    description: "",
    category: "oa",
    kind: "form" as OAFormKind,
    status: "draft" as OAFormStatus,
    fields: [
      { id: "applicant_name", type: "text" as const, label: "姓名", required: true },
      { id: "reason", type: "textarea" as const, label: "申请说明", required: true },
      {
        id: "attachment",
        type: "file" as const,
        label: "附件",
        required: false,
        acceptedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
        maxFiles: 3,
        maxFileSizeMB: 20,
      },
    ],
    resultFields: [] as OAResultField[],
  }
}

export function createDefaultReimbursementFormDraft(title: string) {
  const normalizedTitle = title.trim() || "新建报销申请"
  return {
    title: normalizedTitle,
    slug: normalizeFormSlug(normalizedTitle),
    description: "请填写报销事项、金额明细并上传相关票据，管理员会审核并在需要时要求补充材料。",
    category: "reimbursement",
    kind: "reimbursement" as OAFormKind,
    status: "draft" as OAFormStatus,
    fields: [
      { id: "applicant_name", type: "text" as const, label: "申请人姓名", required: true },
      { id: "project_name", type: "text" as const, label: "项目/活动名称", required: true },
      { id: "invoice_title", type: "text" as const, label: "发票抬头", required: true },
      {
        id: "expense_items",
        type: "table" as const,
        label: "报销明细",
        required: true,
        columns: [
          { id: "item", label: "开支项目", type: "text" as const, required: true },
          { id: "amount", label: "金额", type: "number" as const, required: true },
          { id: "note", label: "备注", type: "text" as const, required: false },
        ],
      },
      {
        id: "receipts",
        type: "file" as const,
        label: "票据/证明材料",
        required: true,
        acceptedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
        maxFiles: 8,
        maxFileSizeMB: 20,
      },
      { id: "supplement_note", type: "textarea" as const, label: "补充说明", required: false },
    ],
    resultFields: [
      { id: "approved_amount", label: "核定金额", type: "number" as const, visibleToSubmitter: true },
      { id: "payment_status", label: "打款状态", type: "text" as const, visibleToSubmitter: true },
    ] as OAResultField[],
    resultsVisible: true,
  }
}

export function getOAFormKind(form?: { kind?: string } | null): OAFormKind {
  return form?.kind === "reimbursement" ? "reimbursement" : "form"
}

export function toOAFormUpsertPayload(draft: Record<string, unknown>): OAFormUpsertPayload {
  const id = typeof draft.id === "string" ? draft.id : typeof draft._id === "string" ? draft._id : undefined
  const title = typeof draft.title === "string" && draft.title.trim() ? draft.title : "未命名表单"
  const slug = normalizeFormSlug(typeof draft.slug === "string" ? draft.slug : title)
  const fields = Array.isArray(draft.fields) ? draft.fields as OAFormField[] : []
  const resultFields = Array.isArray(draft.resultFields) ? draft.resultFields as OAResultField[] : []
  const payload: OAFormUpsertPayload = {
    title,
    slug,
    description: typeof draft.description === "string" ? draft.description : "",
    category: typeof draft.category === "string" ? draft.category : "",
    kind: draft.kind === "reimbursement" ? "reimbursement" : "form",
    visibility: draft.visibility === "admins" ? "admins" : "members",
    status: draft.status === "published" || draft.status === "archived" ? draft.status : "draft",
    allowMultipleSubmissions: typeof draft.allowMultipleSubmissions === "boolean" ? draft.allowMultipleSubmissions : true,
    fields,
    resultFields,
    resultsVisible: Boolean(draft.resultsVisible),
  }
  if (id) payload.id = id
  if (typeof draft.maxSubmissionsPerUser === "number" && Number.isInteger(draft.maxSubmissionsPerUser) && draft.maxSubmissionsPerUser > 0) {
    payload.maxSubmissionsPerUser = draft.maxSubmissionsPerUser
  }
  if (typeof draft.allowSubmissionEdits === "boolean") payload.allowSubmissionEdits = draft.allowSubmissionEdits
  if (typeof draft.openAt === "number" && Number.isFinite(draft.openAt)) payload.openAt = draft.openAt
  if (typeof draft.closeAt === "number" && Number.isFinite(draft.closeAt)) payload.closeAt = draft.closeAt
  return payload
}

export function validateOAFormDraftForSave(draft: Record<string, unknown>) {
  const errors: string[] = []
  if (typeof draft.category !== "string" || !draft.category.trim()) errors.push("请填写分类")
  if (!Array.isArray(draft.fields) || draft.fields.length === 0) errors.push("至少需要一个字段")
  if (typeof draft.maxSubmissionsPerUser === "number" && (!Number.isInteger(draft.maxSubmissionsPerUser) || draft.maxSubmissionsPerUser <= 0)) {
    errors.push("提交次数限制必须是正整数")
  }
  return errors
}

export function isOAFormCollecting(form: { status?: OAFormStatus | string; closeAt?: number }, now = Date.now()) {
  return form.status === "published" && (!form.closeAt || form.closeAt >= now)
}

export function splitOAFormsByCollectionStatus<T extends { status?: OAFormStatus | string; closeAt?: number }>(forms: T[], now = Date.now()) {
  return forms.reduce<{ collecting: T[]; past: T[] }>((groups, form) => {
    if (isOAFormCollecting(form, now)) groups.collecting.push(form)
    else if (form.status === "archived" || (form.status === "published" && Boolean(form.closeAt) && form.closeAt! < now)) groups.past.push(form)
    return groups
  }, { collecting: [], past: [] })
}

function isEmptyValue(value: unknown) {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}

function optionValues(field: OAFormField) {
  return new Set((field.options || []).map((option) => option.value))
}

function validateScalarAnswer(field: OAFormField, value: unknown) {
  if (isEmptyValue(value)) return []

  if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    return [`${field.label}必须是数字`]
  }

  if ((field.type === "select" || field.type === "radio") && field.options?.length) {
    const allowed = optionValues(field)
    if (typeof value !== "string" || !allowed.has(value)) return [`${field.label}不是有效选项`]
  }

  if (field.type === "checkbox" && field.options?.length) {
    const allowed = optionValues(field)
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.has(item))) {
      return [`${field.label}包含无效选项`]
    }
  }

  return []
}

function validateTableAnswer(field: OAFormField, value: unknown) {
  const errors: string[] = []
  if (!Array.isArray(value)) {
    return field.required ? [`请至少填写一行${field.label}`] : []
  }
  if (field.required && value.length === 0) {
    return [`请至少填写一行${field.label}`]
  }

  const columns = field.columns || []
  value.forEach((row, rowIndex) => {
    const rowObject = row && typeof row === "object" ? row as Record<string, unknown> : {}
    columns.forEach((column) => {
      const cell = rowObject[column.id]
      if (column.required && isEmptyValue(cell)) {
        errors.push(`${field.label}第 ${rowIndex + 1} 行请填写${column.label}`)
      }
      if (!isEmptyValue(cell) && column.type === "number" && (typeof cell !== "number" || !Number.isFinite(cell))) {
        errors.push(`${field.label}第 ${rowIndex + 1} 行${column.label}必须是数字`)
      }
    })
  })
  return errors
}

export function validateOAFileMetadata(field: OAFormField, value: unknown) {
  const files = Array.isArray(value) ? value as OAFileMetadata[] : []
  const errors: string[] = []
  const maxFiles = field.maxFiles || 1
  const maxFileSizeMB = field.maxFileSizeMB || 20
  const acceptedMimeTypes = new Set((field.acceptedMimeTypes || []).map((type) => type.toLowerCase()))

  if (field.required && files.length === 0) {
    errors.push(`请上传${field.label}`)
  }

  if (files.length > maxFiles) {
    errors.push(`${field.label}最多上传 ${maxFiles} 个文件`)
  }

  for (const file of files) {
    const size = Number(file?.size)
    const mimeType = String(file?.mimeType || "").toLowerCase()
    if (!file?.storageId || !file?.fileName || !mimeType || !Number.isFinite(size) || size <= 0) {
      errors.push(`${field.label}文件信息不完整`)
      continue
    }
    if (acceptedMimeTypes.size > 0 && !acceptedMimeTypes.has(mimeType)) {
      errors.push(`${field.label}不支持该文件类型`)
    }
    if (size > maxFileSizeMB * 1024 * 1024) {
      errors.push(`${field.label}单个文件不能超过 ${maxFileSizeMB}MB`)
    }
  }

  return [...new Set(errors)]
}

export function validateOAFormAnswers(form: OAFormLike, answers: Record<string, unknown>) {
  const errors: string[] = []
  for (const field of form.fields || []) {
    const value = answers[field.id]
    if (field.type === "table") {
      errors.push(...validateTableAnswer(field, value))
      continue
    }
    if (field.type === "file") {
      errors.push(...validateOAFileMetadata(field, value))
      continue
    }
    if (field.required && isEmptyValue(value)) {
      errors.push(`请填写${field.label}`)
      continue
    }
    errors.push(...validateScalarAnswer(field, value))
  }
  return errors
}

export function normalizeOAFormAnswers(form: OAFormLike, answers: Record<string, unknown>) {
  const fieldIds = new Set((form.fields || []).map((field) => field.id))
  const unknownField = Object.keys(answers || {}).find((key) => !fieldIds.has(key))
  if (unknownField) {
    throw new Error(`未知字段：${unknownField}`)
  }
  const errors = validateOAFormAnswers(form, answers)
  if (errors.length > 0) throw new Error(errors[0])
  return Object.fromEntries((form.fields || []).map((field) => [field.id, answers?.[field.id]]))
}

export function collectOAFormAttachmentStorageIds(form: OAFormLike, answers: Record<string, unknown>) {
  const ids = new Set<string>()
  for (const field of form.fields || []) {
    if (field.type !== "file") continue
    const files = Array.isArray(answers?.[field.id]) ? answers[field.id] as OAFileMetadata[] : []
    for (const file of files) {
      if (file?.storageId) ids.add(String(file.storageId))
    }
  }
  return ids
}

function escapeCsvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function formatCsvAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("; ")
  }
  if (value && typeof value === "object") return JSON.stringify(value)
  return value ?? ""
}

export function serializeOAFormSubmissionsToCsv(form: Pick<OAFormLike, "fields" | "resultFields">, submissions: OASubmissionLike[]) {
  const resultFields = form.resultFields || []
  const headers = [
    "提交人",
    "学号",
    "状态",
    "提交时间",
    ...(form.fields || []).map((field) => field.label),
    ...resultFields.map((field) => field.label),
  ]
  const lines = [headers.map(escapeCsvValue).join(",")]

  for (const submission of submissions) {
    const row = [
      submission.submitterName || "",
      submission.studentId || "",
      oaReviewStatusLabels[submission.reviewStatus] || submission.reviewStatus,
      submission.submittedAt ? new Date(submission.submittedAt).toISOString() : "",
      ...(form.fields || []).map((field) => formatCsvAnswer(submission.answers?.[field.id])),
      ...resultFields.map((field) => formatCsvAnswer(submission.resultValues?.[field.id])),
    ]
    lines.push(row.map(escapeCsvValue).join(","))
  }

  return lines.join("\n")
}

function splitDelimitedLine(line: string, delimiter: "," | "\t") {
  if (delimiter === "\t") return line.split("\t").map((cell) => cell.trim())
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\""
      index += 1
      continue
    }
    if (char === "\"") {
      inQuotes = !inQuotes
      continue
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export function parseOAResultBatchText(text: string, resultFields: OAResultField[]) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const delimiter: "," | "\t" = lines[0].includes("\t") ? "\t" : ","
  const headers = splitDelimitedLine(lines[0], delimiter)
  const fieldById = new Map(resultFields.map((field) => [field.id, field]))
  const reviewStatuses = new Set(Object.keys(oaReviewStatusLabels))

  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter)
    const row: { submissionId?: string; studentId?: string; reviewStatus?: OAReviewStatus; resultValues: Record<string, unknown> } = { resultValues: {} }
    headers.forEach((header, index) => {
      const value = cells[index] ?? ""
      if (!value) return
      if (header === "submissionId") row.submissionId = value
      else if (header === "studentId") row.studentId = value
      else if (header === "reviewStatus") {
        if (reviewStatuses.has(value)) row.reviewStatus = value as OAReviewStatus
      } else {
        const field = fieldById.get(header)
        if (!field) return
        row.resultValues[header] = field.type === "number" ? Number(value) : value
      }
    })
    return row
  }).filter((row) => row.submissionId || row.studentId)
}

export function createFieldFromPalette(type: OAFieldType, label?: string): OAFormField {
  const fieldLabel = label || fieldTypeLabels[type]
  const id = fieldIdFromLabel(fieldLabel, `${type}_${Date.now().toString(36)}`)
  const base: OAFormField = { id, type, label: fieldLabel, required: false }
  if (type === "select" || type === "radio" || type === "checkbox") {
    base.options = [
      { label: "选项一", value: "option_1" },
      { label: "选项二", value: "option_2" },
    ]
  }
  if (type === "file") {
    base.acceptedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
    base.maxFiles = 1
    base.maxFileSizeMB = 20
  }
  if (type === "table") {
    base.columns = [
      { id: "item", label: "项目", type: "text", required: true },
      { id: "amount", label: "金额", type: "number", required: true },
    ]
  }
  return base
}

export const fieldTypeLabels: Record<OAFieldType, string> = {
  text: "单行填空",
  textarea: "多行填空",
  number: "数字",
  date: "日期",
  select: "下拉选择",
  radio: "单选",
  checkbox: "多选",
  file: "文件上传",
  table: "明细表格",
}

export function createDefaultResultField(label = "结果"): OAResultField {
  return {
    id: fieldIdFromLabel(label, "result"),
    label,
    type: "text",
    visibleToSubmitter: true,
  }
}
