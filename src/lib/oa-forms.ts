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
  maxLength?: number
  documentOutput?: {
    mode: "replace" | "append" | "mark_choice" | "repeat_row"
    multiline?: boolean
    preservePrototype?: boolean
  }
  columns?: OATableColumn[]
}

export type OAResultField = {
  id: string
  label: string
  type: OAResultFieldType
  visibleToSubmitter?: boolean
  options?: OAFormOption[]
}

// These scopes deliberately stay independent from the legacy Tong Class
// `visibility` flag. When they are absent, the backend retains the original
// Tong Class member gate; an explicitly empty target scope means that an AIA
// administrator intentionally selected all authenticated institute accounts.
export type OAIdentityType = "undergrad" | "graduate" | "teacher" | "other"
export type OAWorkflowRole = "member" | "admin" | "super_admin"

export type OAUserScope = {
  identityTypes?: OAIdentityType[]
  roles?: OAWorkflowRole[]
  userIds?: string[]
  researchGroupIds?: string[]
  userGroupIds?: string[]
}

export type OAApprovalCompletion = "any" | "all"

export type OAApprovalStep = {
  id: string
  title: string
  scope: OAUserScope
  completion: OAApprovalCompletion
}

export type OAWorkflowNode =
  | { id: string; type: "create_form"; title: string }
  | { id: string; type: "approval"; title: string; scope: OAUserScope }
  | { id: string; type: "batch_approval"; title: string; scope: OAUserScope; completion: OAApprovalCompletion }
  | { id: string; type: "fill_form"; title: string; targetFormId: string; completionRequired?: boolean }
  | { id: string; type: "notification"; title: string; scope: OAUserScope; message: string }

export type OAWorkflowDefinition = {
  version: 2
  nodes: OAWorkflowNode[]
}

export type OAFormAccessGrant = {
  formId: string
  userId: string
  sourceSubmissionId: string
  nodeId: string
  workflowVersion: number
  naturalKey: string
  createdAt: number
}

export type OAWorkflowDraftConfig = {
  // `null` is an explicit deletion instruction for an existing AIA scope;
  // `undefined` means the caller left the legacy configuration untouched.
  targetScope?: OAUserScope | null
  approvalSteps?: OAApprovalStep[]
  workflowDefinition?: OAWorkflowDefinition
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
  targetScope?: OAUserScope | null
  approvalSteps?: OAApprovalStep[]
  workflowDefinition?: OAWorkflowDefinition
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
  formSnapshot?: {
    fields?: OAFormField[]
    resultFields?: OAResultField[]
  }
  submittedAt?: number
  workflowDefinitionSnapshot?: OAWorkflowDefinition
  currentWorkflowNodeIndex?: number
  workflowVersion?: number
  workflowError?: string
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

const oaIdentityTypes: OAIdentityType[] = ["undergrad", "graduate", "teacher", "other"]
const oaWorkflowRoles: OAWorkflowRole[] = ["member", "admin", "super_admin"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function uniqueStrings<T extends string>(values: T[]): T[] {
  return [...new Set(values)]
}

function readAllowedStrings<T extends string>(value: unknown, allowed: readonly T[]) {
  if (!Array.isArray(value)) return [] as T[]
  const allowedValues = new Set<string>(allowed)
  return uniqueStrings(value.filter((item): item is T => typeof item === "string" && allowedValues.has(item)))
}

function readUserIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return uniqueStrings(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))
}

/**
 * Keeps an intentionally empty object intact: `{}` represents the explicit
 * institute-wide submitter scope, while `undefined` keeps the legacy Tong
 * Class member behavior.
 */
export function normalizeOAUserScope(value: unknown): OAUserScope | undefined {
  if (!isRecord(value)) return undefined

  const identityTypes = readAllowedStrings(value.identityTypes, oaIdentityTypes)
  const roles = readAllowedStrings(value.roles, oaWorkflowRoles)
  const userIds = readUserIds(value.userIds)
  const researchGroupIds = readUserIds(value.researchGroupIds)
  const userGroupIds = readUserIds(value.userGroupIds)
  const scope: OAUserScope = {}
  if (identityTypes.length > 0) scope.identityTypes = identityTypes
  if (roles.length > 0) scope.roles = roles
  if (userIds.length > 0) scope.userIds = userIds
  if (researchGroupIds.length > 0) scope.researchGroupIds = researchGroupIds
  if (userGroupIds.length > 0) scope.userGroupIds = userGroupIds
  return scope
}

export function hasOAUserScopeRecipients(scope?: OAUserScope) {
  return Boolean(scope?.identityTypes?.length || scope?.roles?.length || scope?.userIds?.length || scope?.researchGroupIds?.length || scope?.userGroupIds?.length)
}

export function normalizeOAApprovalSteps(value: unknown): OAApprovalStep[] | undefined {
  if (!Array.isArray(value)) return undefined

  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return []
    const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
    if (!id) return []
    const title = typeof candidate.title === "string" && candidate.title.trim()
      ? candidate.title.trim()
      : `第 ${index + 1} 级审批`
    return [{
      id,
      title,
      scope: normalizeOAUserScope(candidate.scope) || {},
      completion: candidate.completion === "all" ? "all" : "any",
    }]
  })
}

const DEFAULT_CREATE_FORM_NODE: OAWorkflowNode = {
  id: "create_form",
  type: "create_form",
  title: "创建表单",
}

export function validateOAWorkflowDefinition(value: unknown): asserts value is OAWorkflowDefinition {
  if (!isRecord(value) || value.version !== 2 || !Array.isArray(value.nodes)) {
    throw new Error("审批流程必须使用 V2 定义")
  }
  if (value.nodes.length === 0) {
    throw new Error("审批流程必须包含创建表单节点")
  }

  const ids = new Set<string>()
  let createNodeCount = 0
  for (const [index, candidate] of value.nodes.entries()) {
    if (!isRecord(candidate)) throw new Error(`第 ${index + 1} 个流程节点无效`)
    const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
    const title = typeof candidate.title === "string" ? candidate.title.trim() : ""
    if (!id) throw new Error(`请填写第 ${index + 1} 个节点 ID`)
    if (ids.has(id)) throw new Error("流程节点 ID 不能重复")
    ids.add(id)
    if (!title) throw new Error(`请填写第 ${index + 1} 个节点名称`)

    switch (candidate.type) {
      case "create_form":
        createNodeCount += 1
        break
      case "approval":
        if (!hasOAUserScopeRecipients(normalizeOAUserScope(candidate.scope))) {
          throw new Error(`请为第 ${index + 1} 个审批节点选择审批对象`)
        }
        break
      case "batch_approval":
        if (!hasOAUserScopeRecipients(normalizeOAUserScope(candidate.scope))) {
          throw new Error(`请为第 ${index + 1} 个批量审批节点选择审批对象`)
        }
        if (candidate.completion !== "any" && candidate.completion !== "all") {
          throw new Error(`请为第 ${index + 1} 个批量审批节点选择完成方式`)
        }
        break
      case "fill_form":
        if (typeof candidate.targetFormId !== "string" || !candidate.targetFormId.trim()) {
          throw new Error(`请为第 ${index + 1} 个填写节点选择目标表单`)
        }
        break
      case "notification":
        if (!hasOAUserScopeRecipients(normalizeOAUserScope(candidate.scope))) {
          throw new Error(`请为第 ${index + 1} 个通知节点选择通知对象`)
        }
        if (typeof candidate.message !== "string" || !candidate.message.trim()) {
          throw new Error(`请填写第 ${index + 1} 个通知节点的通知内容`)
        }
        break
      default:
        throw new Error(`第 ${index + 1} 个流程节点类型无效`)
    }
  }

  if (value.nodes[0]?.type !== "create_form") {
    throw new Error("审批流程首个节点必须是创建表单")
  }
  if (createNodeCount !== 1) {
    throw new Error("审批流程只能包含一个创建表单节点")
  }
}

export function normalizeOAWorkflowDefinition(
  value: unknown,
  legacyApprovalSteps?: unknown,
): OAWorkflowDefinition {
  if (value !== undefined && value !== null) {
    validateOAWorkflowDefinition(value)
    return {
      version: 2,
      nodes: value.nodes.map((node) => {
        const base = { id: node.id.trim(), type: node.type, title: node.title.trim() }
        switch (node.type) {
          case "create_form":
            return base
          case "approval":
            return { ...base, scope: normalizeOAUserScope(node.scope) || {} }
          case "batch_approval":
            return { ...base, scope: normalizeOAUserScope(node.scope) || {}, completion: node.completion }
          case "fill_form":
            return {
              ...base,
              targetFormId: node.targetFormId.trim(),
              completionRequired: node.completionRequired === true,
            }
          case "notification":
            return {
              ...base,
              scope: normalizeOAUserScope(node.scope) || {},
              message: node.message.trim(),
            }
        }
      }) as OAWorkflowNode[],
    }
  }

  const legacy = (normalizeOAApprovalSteps(legacyApprovalSteps) || [])
    .filter((step) => hasOAUserScopeRecipients(step.scope))
  const usedIds = new Set([DEFAULT_CREATE_FORM_NODE.id])
  const legacyNodes = legacy.map<OAWorkflowNode>((step) => {
    let id = step.id
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${step.id}_${suffix}`
      suffix += 1
    }
    usedIds.add(id)
    return {
      id,
      type: "batch_approval",
      title: step.title,
      scope: step.scope,
      completion: step.completion === "all" ? "all" : "any",
    }
  })
  return {
    version: 2,
    nodes: [
      { ...DEFAULT_CREATE_FORM_NODE },
      ...legacyNodes,
    ],
  }
}

export function getOAWorkflowDraftConfig(draft: Record<string, unknown>): OAWorkflowDraftConfig {
  const config: OAWorkflowDraftConfig = {}
  if (Object.prototype.hasOwnProperty.call(draft, "targetScope")) {
    if (draft.targetScope === null) {
      config.targetScope = null
    } else {
      const targetScope = normalizeOAUserScope(draft.targetScope)
      if (targetScope !== undefined) config.targetScope = targetScope
    }
  }
  if (Object.prototype.hasOwnProperty.call(draft, "approvalSteps")) {
    const approvalSteps = normalizeOAApprovalSteps(draft.approvalSteps)
    if (approvalSteps !== undefined) config.approvalSteps = approvalSteps
  }
  if (
    Object.prototype.hasOwnProperty.call(draft, "workflowDefinition")
    && draft.workflowDefinition !== undefined
  ) {
    config.workflowDefinition = normalizeOAWorkflowDefinition(draft.workflowDefinition)
  }
  return config
}

export function createOAApprovalStep(index: number): OAApprovalStep {
  const uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id: `approval_step_${index + 1}_${uniquePart}`,
    title: `第 ${index + 1} 级审批`,
    scope: {},
    completion: "any",
  }
}

export function validateOAWorkflowDraftConfig(config: OAWorkflowDraftConfig) {
  const errors: string[] = []
  for (const [index, step] of (config.approvalSteps || []).entries()) {
    if (!step.title.trim()) errors.push(`请填写第 ${index + 1} 个审批步骤名称`)
    if (!hasOAUserScopeRecipients(step.scope)) errors.push(`请为第 ${index + 1} 个审批步骤选择审批对象`)
  }
  return errors
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
  const workflow = getOAWorkflowDraftConfig(draft)
  if (workflow.targetScope !== undefined) payload.targetScope = workflow.targetScope
  if (workflow.approvalSteps !== undefined) payload.approvalSteps = workflow.approvalSteps
  if (workflow.workflowDefinition !== undefined) payload.workflowDefinition = workflow.workflowDefinition
  return payload
}

export function validateOAFormDraftForSave(draft: Record<string, unknown>) {
  const errors: string[] = []
  if (typeof draft.category !== "string" || !draft.category.trim()) errors.push("请填写分类")
  if (!Array.isArray(draft.fields) || draft.fields.length === 0) errors.push("至少需要一个字段")
  if (typeof draft.maxSubmissionsPerUser === "number" && (!Number.isInteger(draft.maxSubmissionsPerUser) || draft.maxSubmissionsPerUser <= 0)) {
    errors.push("提交次数限制必须是正整数")
  }
  if (typeof draft.openAt === "number" && typeof draft.closeAt === "number" && draft.closeAt <= draft.openAt) {
    errors.push("截止时间必须晚于开放时间")
  }
  if (Array.isArray(draft.resultFields)) {
    const emptyResult = (draft.resultFields as OAResultField[]).find((field) => !field.id.trim() || !field.label.trim())
    if (emptyResult) errors.push("请完整填写审核结果字段")
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
  const collectHistoricalFields = <T extends { id: string; label: string }>(
    currentFields: T[],
    snapshotSelector: (submission: OASubmissionLike) => T[] | undefined,
  ) => {
    const byId = new Map<string, { field: T; labels: Set<string> }>()
    for (const fields of [currentFields, ...submissions.map((submission) => snapshotSelector(submission) || [])]) {
      for (const field of fields) {
        const existing = byId.get(field.id)
        if (existing) existing.labels.add(field.label)
        else byId.set(field.id, { field, labels: new Set([field.label]) })
      }
    }
    return [...byId.values()].map(({ field, labels }) => ({
      ...field,
      label: [...labels].join(" / "),
    }))
  }
  const fields = collectHistoricalFields(form.fields || [], (submission) => submission.formSnapshot?.fields)
  const resultFields = collectHistoricalFields(form.resultFields || [], (submission) => submission.formSnapshot?.resultFields)
  const headers = [
    "提交人",
    "学号",
    "状态",
    "提交时间",
    ...fields.map((field) => field.label),
    ...resultFields.map((field) => field.label),
  ]
  const lines = [headers.map(escapeCsvValue).join(",")]

  for (const submission of submissions) {
    const row = [
      submission.submitterName || "",
      submission.studentId || "",
      oaReviewStatusLabels[submission.reviewStatus] || submission.reviewStatus,
      submission.submittedAt ? new Date(submission.submittedAt).toISOString() : "",
      ...fields.map((field) => formatCsvAnswer(submission.answers?.[field.id])),
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
