import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { createR2UploadTarget, getR2DownloadUrl, getR2ObjectKeyFromStorageId, r2StorageIdMatches } from "./lib/r2"
import {
  advanceOAWorkflow,
  adaptLegacyOAWorkflow,
  completeRequiredOAFormGrants,
  resolveOAWorkflowRecipients,
  resumeOAWorkflow,
  startOAWorkflow,
  userMatchesOAUserScope,
} from "./lib/oaWorkflow"
import { resolveUserIdentityType } from "./lib/userIdentity"
import {
  assertActorCanUseScope,
  describeOAWorkflowScope,
} from "./lib/oaScopeAuthorization"
import { getUserBySession } from "./reviewer/lib"

const MAX_DEFAULT_FILE_BYTES = 20 * 1024 * 1024
const ACADEMIC_EXCHANGE_OA_SLUG = "academic-exchange-reimbursement"

const reviewStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("needs_changes")
)

const formStatusValidator = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))

const fieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("date"),
  v.literal("select"),
  v.literal("radio"),
  v.literal("checkbox"),
  v.literal("file"),
  v.literal("table")
)

const resultFieldTypeValidator = v.union(v.literal("text"), v.literal("number"), v.literal("date"), v.literal("select"))

const optionValidator = v.object({ label: v.string(), value: v.string() })

const tableColumnValidator = v.object({
  id: v.string(),
  label: v.string(),
  type: v.union(v.literal("text"), v.literal("number"), v.literal("date")),
  required: v.optional(v.boolean()),
})

const fieldValidator = v.object({
  id: v.string(),
  type: fieldTypeValidator,
  label: v.string(),
  helpText: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  required: v.optional(v.boolean()),
  options: v.optional(v.array(optionValidator)),
  acceptedMimeTypes: v.optional(v.array(v.string())),
  maxFiles: v.optional(v.number()),
  maxFileSizeMB: v.optional(v.number()),
  maxLength: v.optional(v.number()),
  documentOutput: v.optional(v.object({
    mode: v.union(v.literal("replace"), v.literal("append"), v.literal("mark_choice"), v.literal("repeat_row")),
    multiline: v.optional(v.boolean()),
    preservePrototype: v.optional(v.boolean()),
  })),
  columns: v.optional(v.array(tableColumnValidator)),
})

const resultFieldValidator = v.object({
  id: v.string(),
  label: v.string(),
  type: resultFieldTypeValidator,
  visibleToSubmitter: v.optional(v.boolean()),
  options: v.optional(v.array(optionValidator)),
})

const userIdentityTypeValidator = v.union(
  v.literal("undergrad"),
  v.literal("graduate"),
  v.literal("teacher"),
  v.literal("other"),
)

const userRoleValidator = v.union(
  v.literal("member"),
  v.literal("admin"),
  v.literal("super_admin"),
)

const userScopeValidator = v.object({
  identityTypes: v.optional(v.array(userIdentityTypeValidator)),
  roles: v.optional(v.array(userRoleValidator)),
  userIds: v.optional(v.array(v.id("users"))),
  researchGroupIds: v.optional(v.array(v.id("researchGroups"))),
  userGroupIds: v.optional(v.array(v.id("userGroups"))),
})

const approvalStepValidator = v.object({
  id: v.string(),
  title: v.string(),
  scope: userScopeValidator,
  completion: v.optional(v.union(v.literal("any"), v.literal("all"))),
})

const workflowNodeValidator = v.union(
  v.object({
    id: v.string(),
    type: v.literal("create_form"),
    title: v.string(),
  }),
  v.object({
    id: v.string(),
    type: v.literal("approval"),
    title: v.string(),
    scope: userScopeValidator,
  }),
  v.object({
    id: v.string(),
    type: v.literal("batch_approval"),
    title: v.string(),
    scope: userScopeValidator,
    completion: v.union(v.literal("any"), v.literal("all")),
  }),
  v.object({
    id: v.string(),
    type: v.literal("fill_form"),
    title: v.string(),
    targetFormId: v.id("oaForms"),
    completionRequired: v.optional(v.boolean()),
  }),
  v.object({
    id: v.string(),
    type: v.literal("notification"),
    title: v.string(),
    scope: userScopeValidator,
    message: v.string(),
  }),
)

const workflowDefinitionValidator = v.object({
  version: v.literal(2),
  nodes: v.array(workflowNodeValidator),
})

const approvalActionValidator = v.union(
  v.literal("approve"),
  v.literal("reject"),
  v.literal("request_changes"),
)
const approvalTaskStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("skipped"),
  v.literal("changes_requested"),
)

const formInputValidator = {
  id: v.optional(v.id("oaForms")),
  slug: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  kind: v.optional(v.union(v.literal("form"), v.literal("reimbursement"))),
  visibility: v.optional(v.union(v.literal("members"), v.literal("admins"))),
  status: v.optional(formStatusValidator),
  allowMultipleSubmissions: v.optional(v.boolean()),
  maxSubmissionsPerUser: v.optional(v.number()),
  allowSubmissionEdits: v.optional(v.boolean()),
  openAt: v.optional(v.number()),
  closeAt: v.optional(v.number()),
  fields: v.array(fieldValidator),
  resultFields: v.optional(v.array(resultFieldValidator)),
  resultsVisible: v.optional(v.boolean()),
  // `null` is the explicit, auditable clear operation; omission preserves an
  // existing scope so legacy callers do not accidentally retarget a form.
  targetScope: v.optional(v.union(userScopeValidator, v.null())),
  approvalSteps: v.optional(v.array(approvalStepValidator)),
  workflowDefinition: v.optional(workflowDefinitionValidator),
}

function requireMember(user: any) {
  if (user.isClassMember === false) throw new Error("仅通班成员可访问")
  return user
}

function requireAdmin(user: any) {
  if (user.role !== "admin" && user.role !== "super_admin") throw new Error("需要管理员权限")
  return user
}

function normalizeText(value: string, fallback = "") {
  const trimmed = String(value || "").trim()
  return trimmed || fallback
}

function normalizeOptionalText(value?: string) {
  const trimmed = String(value || "").trim()
  return trimmed || undefined
}

function normalizeSlug(value: string) {
  const slug = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
  if (!slug) throw new Error("请填写表单链接 slug（仅限英文、数字和连字符）")
  return slug
}

function formKind(form: any) {
  return form?.kind === "reimbursement" ? "reimbursement" : "form"
}

function isSystemManagedForm(form: any) {
  return Boolean(form?.systemKey)
}

function assertNotSystemManagedForm(form: any) {
  if (isSystemManagedForm(form)) throw new Error("系统表单只能在对应的专用管理页面中配置")
  return form
}

async function getReimbursementPermission(ctx: any, userId: any) {
  return await ctx.db
    .query("contentPermissions")
    .withIndex("by_category_user", (q: any) => (
      q.eq("category", "reimbursement").eq("userId", userId)
    ))
    .first()
}

async function hasReimbursementRight(
  ctx: any,
  user: any,
  right: "canCreate" | "canManage",
) {
  const permission = await getReimbursementPermission(ctx, user._id)
  return permission?.[right] === true
}

async function requireReimbursementRight(
  ctx: any,
  user: any,
  right: "canCreate" | "canManage",
) {
  if (!await hasReimbursementRight(ctx, user, right)) {
    // 普通管理员不会自动获得报销权限；两个能力只能由平台权限管理显式授予。
    throw new Error(right === "canCreate"
      ? "你没有创建报销表单的权限"
      : "你没有审核与管理报销的权限")
  }
  return user
}

async function currentReimbursementManagerIds(ctx: any) {
  const permissions = await ctx.db
    .query("contentPermissions")
    .withIndex("by_category_user", (q: any) => q.eq("category", "reimbursement"))
    .collect()
  const managerIds = new Set(
    permissions
      .filter((permission: any) => permission.canManage === true)
      .map((permission: any) => String(permission.userId)),
  )
  const users = await ctx.db.query("users").collect()
  const enabledById = new Map(users.map((user: any) => [String(user._id), user.accountStatus !== "disabled"]))
  return [...managerIds]
    .filter((id) => enabledById.get(id) === true)
    .sort()
}

/**
 * Reimbursement review authority always comes from the current platform
 * permission panel. The author may still compose fill-form and notification
 * nodes around that review; only review-node type/scope/completion are replaced
 * server-side.
 */
async function buildCurrentReimbursementWorkflow(ctx: any, source?: any) {
  const managerIds = await currentReimbursementManagerIds(ctx)
  if (managerIds.length === 0) throw new Error("当前没有可用的报销审核人")
  const definition = source?.workflowDefinition?.version === 2
    ? normalizeWorkflowDefinition(source.workflowDefinition)
    : undefined
  const sourceNodes = definition?.nodes || [{
    id: "create_reimbursement",
    type: "create_form",
    title: "创建报销申请",
  }]
  let hasReviewNode = false
  const nodes = sourceNodes.map((node: any) => {
    if (node.type === "approval" || node.type === "batch_approval") {
      hasReviewNode = true
      return {
        ...node,
        type: "batch_approval" as const,
        scope: { userIds: managerIds as any[] },
        completion: "any" as const,
      }
    }
    return node
  })
  if (!hasReviewNode) {
    const usedIds = new Set(nodes.map((node: any) => String(node.id)))
    let reviewNodeId = "review_reimbursement"
    let suffix = 2
    while (usedIds.has(reviewNodeId)) {
      reviewNodeId = `review_reimbursement_${suffix}`
      suffix += 1
    }
    nodes.splice(1, 0, {
      id: reviewNodeId,
      type: "batch_approval" as const,
      title: "报销审核",
      scope: { userIds: managerIds as any[] },
      completion: "any" as const,
    })
  }
  return {
    version: 2 as const,
    nodes,
  }
}

async function syncAcademicExchangeFromOASubmission(
  ctx: any,
  form: any,
  submissionId: any,
  actor: any,
  comment?: string,
) {
  const submission = await ctx.db.get(submissionId)
  if (!submission) throw new Error("学术交流报销 OA 提交不存在")
  if (
    submission.formSlug !== ACADEMIC_EXCHANGE_OA_SLUG
    && form.slug !== ACADEMIC_EXCHANGE_OA_SLUG
  ) return
  const application = await ctx.db
    .query("academicExchangeSupportApplications")
    .withIndex("by_oaSubmissionId", (q: any) => q.eq("oaSubmissionId", submission._id))
    .first()
  if (!application) throw new Error("学术交流报销申请桥接记录不存在")
  if (application.status === "withdrawn") throw new Error("申请已撤回，不能继续审批")
  const status = submission.workflowStatus === "needs_changes"
    ? "needs_changes"
    : submission.workflowStatus === "approved"
      ? "approved"
      : submission.workflowStatus === "rejected"
        ? "rejected"
        : "reviewing"
  const now = Date.now()
  await ctx.db.patch(application._id, {
    status,
    reviewNote: normalizeOptionalText(comment),
    reviewerName: actor.chineseName || actor.englishName || actor.username || actor.email,
    reviewedAt: now,
    updatedAt: now,
  })
}

function uniqueIds(items: Array<{ id: string }>, label: string) {
  const seen = new Set<string>()
  for (const item of items) {
    const id = normalizeText(item.id)
    if (!id) throw new Error(`${label} ID 不能为空`)
    if (seen.has(id)) throw new Error(`${label} ID 不能重复：${id}`)
    seen.add(id)
  }
}

function normalizeUniqueStrings(values: readonly unknown[] | undefined) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values || []) {
    const normalized = String(value || "").trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

/**
 * `undefined` means legacy Tong Class audience; an explicit `{}` means all
 * authenticated AIA accounts. Approval-step scopes intentionally do not allow
 * `{}` so a malformed workflow can never assign every account by accident.
 */
function normalizeUserScope(scope: any, label: string, allowAll = false): any {
  const identityTypes = normalizeUniqueStrings(scope?.identityTypes)
  const roles = normalizeUniqueStrings(scope?.roles)
  const userIdEntries = new Map<string, any>()
  for (const userId of scope?.userIds || []) {
    const normalized = String(userId || "")
    if (normalized) userIdEntries.set(normalized, userId)
  }
  const researchGroupIdEntries = new Map<string, any>()
  for (const researchGroupId of scope?.researchGroupIds || []) {
    const normalized = String(researchGroupId || "")
    if (normalized) researchGroupIdEntries.set(normalized, researchGroupId)
  }
  const userGroupIdEntries = new Map<string, any>()
  for (const userGroupId of scope?.userGroupIds || []) {
    const normalized = String(userGroupId || "")
    if (normalized) userGroupIdEntries.set(normalized, userGroupId)
  }
  const hasCriteria = identityTypes.length > 0
    || roles.length > 0
    || userIdEntries.size > 0
    || researchGroupIdEntries.size > 0
    || userGroupIdEntries.size > 0
  if (!hasCriteria && !allowAll) throw new Error(`${label}至少需要选择一个用户组、角色或账户`)
  return {
    ...(identityTypes.length > 0 ? { identityTypes } : {}),
    ...(roles.length > 0 ? { roles } : {}),
    ...(userIdEntries.size > 0 ? { userIds: [...userIdEntries.values()] } : {}),
    ...(researchGroupIdEntries.size > 0
      ? { researchGroupIds: [...researchGroupIdEntries.values()] }
      : {}),
    ...(userGroupIdEntries.size > 0
      ? { userGroupIds: [...userGroupIdEntries.values()] }
      : {}),
  } as any
}

function normalizeApprovalSteps(steps?: any[]): any {
  if (steps === undefined) return undefined
  const normalized = steps.map((step: any, index: number) => {
    const id = normalizeText(step.id)
    const title = normalizeText(step.title)
    if (!id || !title) throw new Error(`第 ${index + 1} 个审批步骤的 ID 和名称不能为空`)
    return {
      id,
      title,
      scope: normalizeUserScope(step.scope, `审批步骤“${title}”的审批人范围`),
      completion: step.completion === "all" ? "all" as const : "any" as const,
    }
  })
  uniqueIds(normalized, "审批步骤")
  return normalized
}

function normalizeWorkflowDefinition(definition?: any): any {
  if (definition === undefined) return undefined
  if (definition?.version !== 2 || !Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    throw new Error("审批流程必须包含创建表单节点")
  }

  let createNodeCount = 0
  const nodes = definition.nodes.map((node: any, index: number) => {
    const id = normalizeText(node.id)
    const title = normalizeText(node.title)
    if (!id || !title) throw new Error(`第 ${index + 1} 个流程节点的 ID 和名称不能为空`)
    const base = { id, type: node.type, title }
    switch (node.type) {
      case "create_form":
        createNodeCount += 1
        return base
      case "approval":
        return {
          ...base,
          scope: normalizeUserScope(node.scope, `审批节点“${title}”的审批人范围`),
        }
      case "batch_approval":
        if (node.completion !== "any" && node.completion !== "all") {
          throw new Error(`批量审批节点“${title}”必须指定完成方式`)
        }
        return {
          ...base,
          scope: normalizeUserScope(node.scope, `批量审批节点“${title}”的审批人范围`),
          completion: node.completion,
        }
      case "fill_form":
        if (!String(node.targetFormId || "").trim()) {
          throw new Error(`填写节点“${title}”必须选择目标表单`)
        }
        return {
          ...base,
          targetFormId: node.targetFormId,
          completionRequired: node.completionRequired === true,
        }
      case "notification": {
        const message = normalizeText(node.message)
        if (!message) throw new Error(`通知节点“${title}”必须填写通知内容`)
        return {
          ...base,
          scope: normalizeUserScope(node.scope, `通知节点“${title}”的通知范围`),
          message,
        }
      }
      default:
        throw new Error(`第 ${index + 1} 个流程节点类型无效`)
    }
  })
  uniqueIds(nodes, "流程节点")
  if (nodes[0]?.type !== "create_form") throw new Error("审批流程首个节点必须是创建表单")
  if (createNodeCount !== 1) throw new Error("审批流程只能包含一个创建表单节点")
  return { version: 2 as const, nodes }
}

function workflowDefinitionScopes(definition: any) {
  return workflowDefinitionScopedPurposes(definition).map((entry: { scope: any }) => entry.scope)
}

function workflowDefinitionScopedPurposes(definition: any) {
  return (definition?.nodes || []).flatMap((node: any) => {
    if (node.type === "approval" || node.type === "batch_approval") {
      return [{ scope: node.scope, purpose: "workflow_approver" as const }]
    }
    if (node.type === "notification") {
      return [{ scope: node.scope, purpose: "notification" as const }]
    }
    return []
  })
}

async function assertActorCanUseWorkflowScopes(
  ctx: any,
  actor: any,
  definition: any,
  options?: { trustedReviewScope?: boolean },
) {
  for (const entry of workflowDefinitionScopedPurposes(definition)) {
    if (options?.trustedReviewScope && entry.purpose === "workflow_approver") continue
    await assertActorCanUseScope(ctx, actor, entry.scope, entry.purpose)
  }
}

async function assertScopedUsersExist(ctx: any, scopes: Array<any | undefined>) {
  const checked = new Set<string>()
  for (const scope of scopes) {
    for (const userId of scope?.userIds || []) {
      const id = String(userId)
      if (checked.has(id)) continue
      checked.add(id)
      if (!await ctx.db.get(userId)) throw new Error("审批范围包含不存在的账户")
    }
  }
  const checkedGroups = new Set<string>()
  for (const scope of scopes) {
    for (const groupId of scope?.userGroupIds || []) {
      const id = String(groupId)
      if (checkedGroups.has(id)) continue
      checkedGroups.add(id)
      if (!await ctx.db.get(groupId)) throw new Error("范围包含不存在的用户组")
    }
  }
}

async function validateWorkflowFillTargets(ctx: any, actor: any, definition: any) {
  for (const node of definition?.nodes || []) {
    if (node.type !== "fill_form") continue
    const target = await ctx.db.get(node.targetFormId)
    if (!target) throw new Error(`填写节点“${node.title}”的目标表单不存在`)
    if (target.status !== "published" || target.visibility !== "members") {
      throw new Error(`填写节点“${node.title}”的目标表单必须已发布且可填写`)
    }
    if (actor.role !== "super_admin" && !await canUserAccessOAForm(ctx, actor, target)) {
      throw new Error(`填写节点“${node.title}”的目标表单不在当前编辑者的可见范围内`)
    }
  }
}

function workflowReferencesForm(definition: any, formId: any) {
  return Array.isArray(definition?.nodes)
    && definition.nodes.some((node: any) => (
      node?.type === "fill_form"
      && String(node.targetFormId) === String(formId)
    ))
}

async function assertFormIsNotFillTarget(ctx: any, formId: any) {
  const forms = await ctx.db.query("oaForms").collect()
  if (forms.some((form: any) => (
    String(form._id) !== String(formId)
    && workflowReferencesForm(form.workflowDefinition, formId)
  ))) {
    throw new Error("该表单正在被其他 OA 流程的“填写新表单”节点使用，不能删除")
  }

  const submissions = await ctx.db.query("oaFormSubmissions").collect()
  if (submissions.some((submission: any) => (
    (
      submission.workflowStatus === "pending"
      || submission.workflowStatus === "needs_changes"
      || (submission.workflowStatus === undefined && submission.reviewStatus === "pending")
    )
    && workflowReferencesForm(submission.workflowDefinitionSnapshot, formId)
  ))) {
    throw new Error("该表单正在被进行中的 OA 审批引用，不能删除")
  }

  const accessGrant = await ctx.db
    .query("oaFormAccessGrants")
    .withIndex("by_form_user", (index: any) => index.eq("formId", formId))
    .first()
  if (accessGrant) {
    throw new Error("该表单已有流程授予的填写权限，不能删除")
  }
}

/** Publishing re-resolves every dynamic target instead of trusting editor previews. */
async function validateWorkflowForPublication(ctx: any, actor: any, form: any) {
  await assertActorCanPublishFormScopes(ctx, actor, form)
  const definition = form.workflowDefinition?.version === 2
    ? form.workflowDefinition
    : adaptLegacyOAWorkflow(form.approvalSteps || [])
  await validateWorkflowFillTargets(ctx, actor, definition)
  for (const node of definition.nodes || []) {
    if (node.type !== "approval" && node.type !== "batch_approval" && node.type !== "notification") continue
    const recipients = await resolveOAWorkflowRecipients(ctx, node.scope)
    if (node.type === "approval" && recipients.length !== 1) {
      throw new Error(`审批节点“${node.title}”必须恰好解析到一名审批人`)
    }
    if (node.type === "batch_approval" && recipients.length < 1) {
      throw new Error(`批量审批节点“${node.title}”必须至少解析到一名审批人`)
    }
    if (node.type === "notification" && recipients.length < 1) {
      throw new Error(`通知节点“${node.title}”必须至少解析到一名接收人`)
    }
  }
}

async function assertActorCanPublishFormScopes(ctx: any, actor: any, form: any) {
  if (form.targetScope !== undefined) {
    await assertActorCanUseScope(ctx, actor, form.targetScope, "form_audience")
  }
  // Reimbursement approvers are a trusted, server-generated projection of
  // current platform permissions. A form creator does not need authority to
  // address those managers directly.
  const definition = form.workflowDefinition?.version === 2
    ? form.workflowDefinition
    : adaptLegacyOAWorkflow(form.approvalSteps || [])
  await assertActorCanUseWorkflowScopes(ctx, actor, definition, {
    trustedReviewScope: formKind(form) === "reimbursement",
  })
}

function assertCanConfigureAIAWorkflow(admin: any, changesWorkflowConfiguration: boolean) {
  if (changesWorkflowConfiguration && admin.role !== "super_admin") {
    throw new Error("只有超级管理员可以配置研究院 OA 作用域和审批流程")
  }
}

function sanitizeField(field: any) {
  const id = normalizeText(field.id)
  const label = normalizeText(field.label)
  if (!id || !label) throw new Error("字段 ID 和名称不能为空")
  if (["select", "radio", "checkbox"].includes(field.type) && (!field.options || field.options.length === 0)) {
    throw new Error(`${label} 至少需要一个选项`)
  }
  if (field.type === "table") {
    if (!field.columns || field.columns.length === 0) throw new Error(`${label} 至少需要一列`)
    uniqueIds(field.columns, `${label}列`)
  }
  return {
    id,
    type: field.type,
    label,
    helpText: normalizeOptionalText(field.helpText),
    placeholder: normalizeOptionalText(field.placeholder),
    required: Boolean(field.required),
    options: field.options?.map((option: any) => ({ label: normalizeText(option.label), value: normalizeText(option.value) })).filter((option: any) => option.label && option.value),
    acceptedMimeTypes: field.acceptedMimeTypes?.map((type: string) => normalizeText(type).toLowerCase()).filter(Boolean),
    maxFiles: field.maxFiles && field.maxFiles > 0 ? Math.floor(field.maxFiles) : undefined,
    maxFileSizeMB: field.maxFileSizeMB && field.maxFileSizeMB > 0 ? field.maxFileSizeMB : undefined,
    maxLength: field.maxLength && field.maxLength > 0 ? Math.floor(field.maxLength) : undefined,
    documentOutput: field.documentOutput ? {
      mode: field.documentOutput.mode,
      multiline: Boolean(field.documentOutput.multiline),
      preservePrototype: Boolean(field.documentOutput.preservePrototype),
    } : undefined,
    columns: field.columns?.map((column: any) => ({
      id: normalizeText(column.id),
      label: normalizeText(column.label),
      type: column.type,
      required: Boolean(column.required),
    })),
  }
}

function sanitizeResultField(field: any) {
  const id = normalizeText(field.id)
  const label = normalizeText(field.label)
  if (!id || !label) throw new Error("结果字段 ID 和名称不能为空")
  return {
    id,
    label,
    type: field.type,
    visibleToSubmitter: Boolean(field.visibleToSubmitter),
    options: field.options?.map((option: any) => ({ label: normalizeText(option.label), value: normalizeText(option.value) })).filter((option: any) => option.label && option.value),
  }
}

function isEmpty(value: unknown) {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}

function allowedOptionValues(field: any) {
  return new Set((field.options || []).map((option: any) => option.value))
}

function validateFileAnswer(field: any, value: unknown) {
  const files = Array.isArray(value) ? value : []
  const errors: string[] = []
  const maxFiles = field.maxFiles || 1
  const maxBytes = (field.maxFileSizeMB || 20) * 1024 * 1024
  const accepted = new Set((field.acceptedMimeTypes || []).map((type: string) => type.toLowerCase()))
  if (field.required && files.length === 0) errors.push(`请上传${field.label}`)
  if (files.length > maxFiles) errors.push(`${field.label}最多上传 ${maxFiles} 个文件`)
  for (const file of files as any[]) {
    const size = Number(file?.size)
    const mimeType = String(file?.mimeType || "").toLowerCase()
    if (!file?.storageId || !file?.fileName || !mimeType || !Number.isFinite(size) || size <= 0) {
      errors.push(`${field.label}文件信息不完整`)
      continue
    }
    if (accepted.size > 0 && !accepted.has(mimeType)) errors.push(`${field.label}不支持该文件类型`)
    if (size > maxBytes) errors.push(`${field.label}单个文件不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
  }
  return errors
}

function validateTableAnswer(field: any, value: unknown) {
  if (!Array.isArray(value)) return field.required ? [`请至少填写一行${field.label}`] : []
  if (field.required && value.length === 0) return [`请至少填写一行${field.label}`]
  const errors: string[] = []
  for (let rowIndex = 0; rowIndex < value.length; rowIndex += 1) {
    const row = value[rowIndex] && typeof value[rowIndex] === "object" ? value[rowIndex] as Record<string, unknown> : {}
    for (const column of field.columns || []) {
      const cell = row[column.id]
      if (column.required && isEmpty(cell)) errors.push(`${field.label}第 ${rowIndex + 1} 行请填写${column.label}`)
      if (!isEmpty(cell) && column.type === "number" && (typeof cell !== "number" || !Number.isFinite(cell))) {
        errors.push(`${field.label}第 ${rowIndex + 1} 行${column.label}必须是数字`)
      }
    }
  }
  return errors
}

async function normalizeFileAnswers(ctx: any, field: any, value: unknown, ownerId: string) {
  const files = Array.isArray(value) ? value : []
  const maxBytes = (field.maxFileSizeMB || 20) * 1024 * 1024
  const accepted = new Set((field.acceptedMimeTypes || []).map((type: string) => type.toLowerCase()))
  const normalized = []
  for (const file of files as any[]) {
    const storageId = String(file.storageId || "")
    const r2Key = getR2ObjectKeyFromStorageId(storageId)
    let actualSize = Number(file.size)
    let actualMimeType = String(file.mimeType || "").toLowerCase()
    if (r2Key) {
      if (!r2StorageIdMatches(storageId, { ownerId, purpose: "oa-form-attachment" })) {
        throw new Error(`${field.label}上传凭证无效`)
      }
    } else {
      const storageDoc = await ctx.db.system.get(file.storageId as any)
      if (!storageDoc) throw new Error(`${field.label}文件不存在或上传未完成`)
      actualSize = Number((storageDoc as any).size ?? file.size)
      actualMimeType = String((storageDoc as any).contentType || file.mimeType || "").toLowerCase()
    }
    if (accepted.size > 0 && !accepted.has(actualMimeType)) throw new Error(`${field.label}不支持该文件类型`)
    if (!Number.isFinite(actualSize) || actualSize <= 0 || actualSize > maxBytes) {
      throw new Error(`${field.label}单个文件不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
    }
    normalized.push({
      storageId,
      fileName: normalizeText(file.fileName, "未命名文件"),
      mimeType: actualMimeType,
      size: actualSize,
    })
  }
  return normalized
}

async function normalizeAnswers(ctx: any, form: any, answers: Record<string, unknown>, ownerId: string) {
  const fieldIds = new Set((form.fields || []).map((field: any) => field.id))
  const unknownField = Object.keys(answers || {}).find((key) => !fieldIds.has(key))
  if (unknownField) throw new Error(`未知字段：${unknownField}`)

  const errors: string[] = []
  const normalized: Record<string, unknown> = {}
  for (const field of form.fields || []) {
    const value = answers[field.id]
    if (field.type === "file") {
      errors.push(...validateFileAnswer(field, value))
      if (errors.length === 0) normalized[field.id] = await normalizeFileAnswers(ctx, field, value, ownerId)
      continue
    }
    if (field.type === "table") {
      errors.push(...validateTableAnswer(field, value))
      normalized[field.id] = Array.isArray(value) ? value : []
      continue
    }
    if (field.required && isEmpty(value)) {
      errors.push(`请填写${field.label}`)
      continue
    }
    if (isEmpty(value)) continue
    if (field.maxLength && typeof value === "string" && value.length > field.maxLength) {
      errors.push(`${field.label}不能超过 ${field.maxLength} 个字符`)
    }
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) errors.push(`${field.label}必须是数字`)
    if (["select", "radio"].includes(field.type) && field.options?.length) {
      const allowed = allowedOptionValues(field)
      if (typeof value !== "string" || !allowed.has(value)) errors.push(`${field.label}不是有效选项`)
    }
    if (field.type === "checkbox" && field.options?.length) {
      const allowed = allowedOptionValues(field)
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.has(item))) errors.push(`${field.label}包含无效选项`)
    }
    normalized[field.id] = value
  }
  if (errors.length > 0) throw new Error(errors[0])
  return normalized
}

function assertFormOpen(form: any) {
  const now = Date.now()
  if (form.status !== "published") throw new Error("表单尚未发布")
  if (form.visibility !== "members") throw new Error("该表单不面向成员开放")
  if (form.openAt && form.openAt > now) throw new Error("表单尚未开始")
  if (form.closeAt && form.closeAt < now) throw new Error("表单已截止")
}

async function userResearchGroupId(ctx: any, userId: any) {
  const assignment = await ctx.db
    .query("studentResearchGroupAssignments")
    .withIndex("by_studentUserId", (index: any) => index.eq("studentUserId", userId))
    .first()
  return assignment?.researchGroupId
}

async function userUserGroupIds(ctx: any, userId: any) {
  const memberships = await ctx.db
    .query("userGroupMemberships")
    .withIndex("by_userId", (index: any) => index.eq("userId", userId))
    .collect()
  return new Set<string>(memberships.map((membership: any) => String(membership.groupId)))
}

async function hasOAFormAccessGrant(ctx: any, userId: any, formId: any) {
  const grant = await ctx.db
    .query("oaFormAccessGrants")
    .withIndex("by_form_user", (index: any) => index.eq("formId", formId).eq("userId", userId))
    .first()
  return Boolean(grant)
}

async function assertUserCanAccessOAForm(ctx: any, user: any, form: any) {
  if (form.visibility !== "members") throw new Error("该表单不面向成员开放")
  if (await hasOAFormAccessGrant(ctx, user._id, form._id)) return
  if (!form.targetScope) {
    requireMember(user)
    return
  }
  const [researchGroupId, userGroupIds] = await Promise.all([
    userResearchGroupId(ctx, user._id),
    userUserGroupIds(ctx, user._id),
  ])
  if (!userMatchesOAUserScope(user, form.targetScope, researchGroupId, userGroupIds)) throw new Error("无权访问该研究院 OA 表单")
}

async function canUserAccessOAForm(ctx: any, user: any, form: any) {
  try {
    await assertUserCanAccessOAForm(ctx, user, form)
    return true
  } catch {
    return false
  }
}

function isAIAWorkflowForm(form: any) {
  return form?.targetScope !== undefined
    || form?.workflowDefinition !== undefined
    || (Array.isArray(form?.approvalSteps) && form.approvalSteps.length > 0)
}

function assertCanManageAIAWorkflowForm(admin: any, form: any) {
  if (isAIAWorkflowForm(form) && admin.role !== "super_admin") {
    throw new Error("只有超级管理员可以查看或管理研究院 OA 流程")
  }
}

/** Removes all audience and approver routing rules from submitter-facing DTOs. */
function toPublishedOAForm(form: any) {
  const {
    targetScope: _targetScope,
    approvalSteps: _approvalSteps,
    workflowDefinition: _workflowDefinition,
    ...publicForm
  } = form
  return publicForm
}

function collectAttachmentStorageIds(form: any, answers: any) {
  const ids = new Set<string>()
  if (!answers || typeof answers !== "object") return ids
  for (const field of form.fields || []) {
    if (field.type !== "file") continue
    const value = answers[field.id]
    if (!Array.isArray(value)) continue
    for (const item of value as any[]) {
      if (item?.storageId) ids.add(String(item.storageId))
    }
  }
  return ids
}

function buildFormSnapshot(form: any) {
  return {
    title: form.title,
    ...(form.description === undefined ? {} : { description: form.description }),
    fields: form.fields,
    ...(form.allowSubmissionEdits === undefined ? {} : { allowSubmissionEdits: form.allowSubmissionEdits }),
    ...(form.resultFields === undefined ? {} : { resultFields: form.resultFields }),
    ...(form.resultsVisible === undefined ? {} : { resultsVisible: form.resultsVisible }),
  }
}

function serializeSubmission(form: any, submission: any, viewer: "owner" | "admin") {
  let resultValues = submission.resultValues
  if (viewer !== "admin") {
    if (!form.resultsVisible) {
      resultValues = undefined
    } else {
      const visibleIds = new Set((form.resultFields || []).filter((field: any) => field.visibleToSubmitter).map((field: any) => field.id))
      resultValues = Object.fromEntries(Object.entries(submission.resultValues || {}).filter(([key]) => visibleIds.has(key)))
    }
  }
  // Approval snapshots contain assignee scopes, including explicit account
  // IDs. Submitters only need progress state, never internal routing data.
  const {
    approvalStepsSnapshot: _approvalStepsSnapshot,
    workflowDefinitionSnapshot: _workflowDefinitionSnapshot,
    ...safeSubmission
  } = submission
  return viewer === "admin"
    ? { ...submission, resultValues }
    : { ...safeSubmission, resultValues }
}

export const listPublished = query({
  args: {
    sessionToken: v.optional(v.string()),
    category: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("form"), v.literal("reimbursement"))),
    includePast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const rows = args.includePast
      ? await ctx.db.query("oaForms").withIndex("by_updatedAt").order("desc").collect()
      : await ctx.db.query("oaForms").withIndex("by_status_category", (q) => q.eq("status", "published")).order("desc").collect()
    const now = Date.now()
    const access = await Promise.all(rows.map((form) => canUserAccessOAForm(ctx, user, form)))
    return rows
      .filter((form) => !isSystemManagedForm(form))
      .filter((form, index) => form.visibility === "members" && access[index])
      .filter((form) => args.includePast ? (form.status === "published" || form.status === "archived") : form.status === "published")
      .filter((form) => !args.kind || formKind(form) === args.kind)
      .filter((form) => !args.category || form.category === args.category)
      .filter((form) => !form.openAt || form.openAt <= now)
      .filter((form) => args.includePast || !form.closeAt || form.closeAt >= now)
      .map(toPublishedOAForm)
  },
})

export const getPublishedBySlug = query({
  args: { sessionToken: v.optional(v.string()), slug: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const form = await ctx.db.query("oaForms").withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug))).first()
    if (!form || isSystemManagedForm(form) || (form.status !== "published" && form.status !== "archived")) return null
    if (!await canUserAccessOAForm(ctx, user, form)) return null
    const now = Date.now()
    if (form.openAt && form.openAt > now) return null
    return toPublishedOAForm(form)
  },
})

export const adminList = query({
  args: { sessionToken: v.optional(v.string()), kind: v.optional(v.union(v.literal("form"), v.literal("reimbursement"))) },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const rows = await ctx.db.query("oaForms").withIndex("by_updatedAt").order("desc").collect()
    const nonSystemRows = rows.filter((form) => !isSystemManagedForm(form))
    const visibleRows = admin.role === "super_admin" ? nonSystemRows : nonSystemRows.filter((form) => !isAIAWorkflowForm(form))
    return args.kind ? visibleRows.filter((form) => formKind(form) === args.kind) : visibleRows
  },
})

export const adminGet = query({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaForms") },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.id)
    if (!form) return null
    assertNotSystemManagedForm(form)
    assertCanManageAIAWorkflowForm(admin, form)
    return form
  },
})

export const adminUpsert = mutation({
  args: { sessionToken: v.optional(v.string()), ...formInputValidator },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const now = Date.now()
    const slug = normalizeSlug(args.slug)
    const fields = args.fields.map(sanitizeField)
    uniqueIds(fields, "字段")
    if (fields.length === 0) throw new Error("至少需要一个字段")
    const category = normalizeOptionalText(args.category)
    if (!category) throw new Error("请填写分类")
    const maxSubmissionsPerUser = args.maxSubmissionsPerUser && Number.isInteger(args.maxSubmissionsPerUser) && args.maxSubmissionsPerUser > 0
      ? Math.floor(args.maxSubmissionsPerUser)
      : undefined
    const resultFields = (args.resultFields || []).map(sanitizeResultField)
    uniqueIds(resultFields, "结果字段")
    const existingById = args.id ? await ctx.db.get(args.id) : null
    if (existingById) assertNotSystemManagedForm(existingById)
    if (existingById) assertCanManageAIAWorkflowForm(admin, existingById)
    const requestedKind: "form" | "reimbursement" = existingById
      ? formKind(existingById)
      : args.kind === "reimbursement" ? "reimbursement" : "form"
    if (requestedKind === "reimbursement") {
      await requireReimbursementRight(ctx, admin, "canCreate")
    }
    const existingBySlug = await ctx.db.query("oaForms").withIndex("by_slug", (q) => q.eq("slug", slug)).first()
    if (existingBySlug && (!args.id || String(existingBySlug._id) !== String(args.id))) {
      throw new Error("该 slug 已被其他表单使用")
    }
    const hasTargetScopeChange = args.targetScope !== undefined
    const hasWorkflowConfigurationChange = hasTargetScopeChange
      || args.approvalSteps !== undefined
      || args.workflowDefinition !== undefined
    assertCanConfigureAIAWorkflow(admin, hasWorkflowConfigurationChange)
    const shouldClearTargetScope = args.targetScope === null
    const requestedTargetScope = args.targetScope === undefined || args.targetScope === null
      ? undefined
      : normalizeUserScope(args.targetScope, "申请对象范围", true)
    const requestedApprovalSteps = requestedKind === "reimbursement"
      ? []
      : normalizeApprovalSteps(args.approvalSteps)
    const requestedWorkflowDefinition = requestedKind === "reimbursement"
      ? await buildCurrentReimbursementWorkflow(ctx, args)
      : normalizeWorkflowDefinition(args.workflowDefinition)
    if (requestedWorkflowDefinition) {
      await validateWorkflowFillTargets(ctx, admin, requestedWorkflowDefinition)
    }
    await assertScopedUsersExist(ctx, [
      requestedTargetScope,
      ...(requestedApprovalSteps || []).map((step: any) => step.scope),
      ...workflowDefinitionScopes(requestedWorkflowDefinition),
    ])
    await assertActorCanUseScope(ctx, admin, requestedTargetScope, "form_audience")
    for (const step of requestedApprovalSteps || []) {
      await assertActorCanUseScope(ctx, admin, step.scope, "workflow_approver")
    }
    await assertActorCanUseWorkflowScopes(ctx, admin, requestedWorkflowDefinition, {
      trustedReviewScope: requestedKind === "reimbursement",
    })
    const patch = {
      slug,
      title: normalizeText(args.title, "未命名表单"),
      description: normalizeOptionalText(args.description),
      category,
      kind: requestedKind,
      visibility: args.visibility || "members",
      status: args.status || "draft",
      allowMultipleSubmissions: args.allowMultipleSubmissions ?? true,
      maxSubmissionsPerUser,
      allowSubmissionEdits: Boolean(args.allowSubmissionEdits),
      openAt: args.openAt,
      closeAt: args.closeAt,
      fields,
      resultFields,
      resultsVisible: Boolean(args.resultsVisible),
      ...(shouldClearTargetScope
        ? { targetScope: undefined }
        : requestedTargetScope !== undefined
          ? { targetScope: requestedTargetScope }
        : existingById?.targetScope !== undefined ? { targetScope: existingById.targetScope } : {}),
      ...(requestedApprovalSteps !== undefined
        ? { approvalSteps: requestedApprovalSteps }
        : existingById?.approvalSteps !== undefined ? { approvalSteps: existingById.approvalSteps } : {}),
      ...(requestedWorkflowDefinition !== undefined
        ? { workflowDefinition: requestedWorkflowDefinition }
        : existingById?.workflowDefinition !== undefined
          ? { workflowDefinition: existingById.workflowDefinition }
          : {}),
      updatedBy: admin._id,
      publishedAt: args.status === "published" ? (existingById?.publishedAt || now) : existingById?.publishedAt,
      updatedAt: now,
    }
    if (patch.status === "published") {
      await validateWorkflowForPublication(ctx, admin, { ...existingById, ...patch })
    }
    if (args.id) {
      await ctx.db.patch(args.id, patch)
      return args.id
    }
    return await ctx.db.insert("oaForms", {
      ...patch,
      createdBy: admin._id,
      createdAt: now,
    })
  },
})

export const adminSetStatus = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaForms"), status: formStatusValidator },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.id)
    if (!form) throw new Error("表单不存在")
    assertNotSystemManagedForm(form)
    assertCanManageAIAWorkflowForm(admin, form)
    const reimbursementWorkflow = formKind(form) === "reimbursement"
      ? await buildCurrentReimbursementWorkflow(ctx, form)
      : undefined
    const publishableForm = reimbursementWorkflow
      ? { ...form, workflowDefinition: reimbursementWorkflow, approvalSteps: [] }
      : form
    if (args.status === "published") await validateWorkflowForPublication(ctx, admin, publishableForm)
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(reimbursementWorkflow
        ? { workflowDefinition: reimbursementWorkflow, approvalSteps: [] }
        : {}),
      updatedBy: admin._id,
      publishedAt: args.status === "published" ? now : undefined,
      updatedAt: now,
    })
    return args.id
  },
})

export const adminSetPinned = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaForms"), pinned: v.boolean() },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    if (admin.role !== "super_admin") throw new Error("只有超级管理员可以置顶表单")
    const form = await ctx.db.get(args.id)
    if (!form) throw new Error("表单不存在")
    assertNotSystemManagedForm(form)
    assertCanManageAIAWorkflowForm(admin, form)
    const now = Date.now()
    await ctx.db.patch(args.id, {
      pinnedAt: args.pinned ? now : undefined,
      updatedBy: admin._id,
      updatedAt: now,
    })
    return args.id
  },
})

export const adminRemove = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id("oaForms") },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.id)
    if (!form) throw new Error("表单不存在")
    assertNotSystemManagedForm(form)
    assertCanManageAIAWorkflowForm(admin, form)
    const existingSubmission = await ctx.db
      .query("oaFormSubmissions")
      .withIndex("by_form_createdAt", (q) => q.eq("formId", args.id))
      .first()
    if (existingSubmission) throw new Error("已有提交记录的表单不能删除，请改为归档")
    await assertFormIsNotFillTarget(ctx, args.id)
    await ctx.db.delete(args.id)
    return args.id
  },
})

/* ------------------------------------------------------------------ */
/* Teacher form publishing                                             */
/* ------------------------------------------------------------------ */

function requireTeacher(user: any) {
  if (resolveUserIdentityType(user) !== "teacher") throw new Error("仅教师账号可以发布表单")
  return user
}

function requireFormManager(user: any) {
  if (user.role === "super_admin") return user
  if (resolveUserIdentityType(user) !== "teacher") {
    throw new Error("仅教师或超级管理员可以管理表单")
  }
  return user
}

function assertCanManageForm(manager: any, form: any) {
  if (!form) throw new Error("表单不存在")
  if (manager.role === "super_admin") return form
  if (String(form.createdBy) !== String(manager._id)) {
    throw new Error("只能管理自己创建的表单")
  }
  return form
}

async function requireManageSurfaceActor(ctx: any, user: any) {
  if (user.role === "super_admin" || resolveUserIdentityType(user) === "teacher") return user
  if (await hasReimbursementRight(ctx, user, "canCreate")) return user
  throw new Error("仅教师、报销表单创建者或超级管理员可以管理表单")
}

async function assertCanManageFormWithRights(ctx: any, manager: any, form: any) {
  if (!form) throw new Error("表单不存在")
  if (formKind(form) === "reimbursement") {
    await requireReimbursementRight(ctx, manager, "canCreate")
    if (manager.role !== "super_admin" && String(form.createdBy) !== String(manager._id)) {
      throw new Error("只能管理自己创建的报销表单")
    }
    return form
  }
  requireFormManager(manager)
  return assertCanManageForm(manager, form)
}

/** Teachers only ever see and mutate forms they created themselves. */
function assertOwnForm(teacher: any, form: any) {
  if (!form) throw new Error("表单不存在")
  if (String(form.createdBy) !== String(teacher._id)) throw new Error("只能管理自己创建的表单")
  return form
}

export const teacherList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const isSuperAdmin = user.role === "super_admin"
    if (!isSuperAdmin) requireTeacher(user)
    const all = await ctx.db.query("oaForms").withIndex("by_updatedAt").order("desc").collect()
    const rows = (isSuperAdmin
      ? all
      : all.filter((form) => String(form.createdBy) === String(user._id)))
      .filter((form) => !isSystemManagedForm(form))
    const nameCache = new Map<string, string>()
    return await Promise.all(rows.map(async (form) => {
      const submissions = await ctx.db
        .query("oaFormSubmissions")
        .withIndex("by_form_createdAt", (q) => q.eq("formId", form._id))
        .collect()
      let createdByName = nameCache.get(String(form.createdBy))
      if (!createdByName) {
        const creator = await ctx.db.get(form.createdBy)
        createdByName = creator
          ? (creator.chineseName || creator.englishName || creator.username || "未知账号")
          : "未知账号"
        nameCache.set(String(form.createdBy), createdByName)
      }
      return {
        ...form,
        createdByName,
        submissionCount: submissions.length,
        pendingSubmissionCount: submissions.filter((submission) => submission.reviewStatus === "pending").length,
      }
    }))
  },
})

export const teacherGet = query({
  args: { sessionToken: v.string(), id: v.id("oaForms") },
  handler: async (ctx, args) => {
    const teacher = requireTeacher(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.id)
    if (!form) return null
    assertNotSystemManagedForm(form)
    assertOwnForm(teacher, form)
    return form
  },
})

/**
 * Teacher-owned form create/update. Every teacher form is an institute-scoped
 * form: the teacher must name its audience explicitly, and may optionally
 * design a multi-step approval workflow (each step needs its own approvers).
 */
export const teacherUpsert = mutation({
  args: { sessionToken: v.string(), ...formInputValidator },
  handler: async (ctx, args) => {
    const teacher = requireTeacher(await getUserBySession(ctx, args.sessionToken))
    const now = Date.now()
    const slug = normalizeSlug(args.slug)
    const fields = args.fields.map(sanitizeField)
    uniqueIds(fields, "字段")
    if (fields.length === 0) throw new Error("至少需要一个字段")
    const category = normalizeOptionalText(args.category) || "教学服务"
    const maxSubmissionsPerUser = args.maxSubmissionsPerUser && Number.isInteger(args.maxSubmissionsPerUser) && args.maxSubmissionsPerUser > 0
      ? Math.floor(args.maxSubmissionsPerUser)
      : undefined
    const existingById = args.id ? await ctx.db.get(args.id) : null
    if (existingById) assertNotSystemManagedForm(existingById)
    if (existingById) assertOwnForm(teacher, existingById)
    const existingBySlug = await ctx.db.query("oaForms").withIndex("by_slug", (q) => q.eq("slug", slug)).first()
    if (existingBySlug && (!args.id || String(existingBySlug._id) !== String(args.id))) {
      throw new Error("该 slug 已被其他表单使用")
    }
    if (!args.targetScope) throw new Error("请指定表单可见范围")
    const targetScope = normalizeUserScope(args.targetScope, "表单可见范围")
    const approvalSteps = normalizeApprovalSteps(args.approvalSteps ?? [])
    const requestedWorkflowDefinition = normalizeWorkflowDefinition(args.workflowDefinition)
    if (requestedWorkflowDefinition) {
      await validateWorkflowFillTargets(ctx, teacher, requestedWorkflowDefinition)
    }
    await assertScopedUsersExist(ctx, [
      targetScope,
      ...(approvalSteps || []).map((step: any) => step.scope),
      ...workflowDefinitionScopes(requestedWorkflowDefinition),
    ])
    await assertActorCanUseScope(ctx, teacher, targetScope, "form_audience")
    for (const step of approvalSteps || []) {
      await assertActorCanUseScope(ctx, teacher, step.scope, "workflow_approver")
    }
    await assertActorCanUseWorkflowScopes(ctx, teacher, requestedWorkflowDefinition)
    const patch = {
      slug,
      title: normalizeText(args.title, "未命名表单"),
      description: normalizeOptionalText(args.description),
      category,
      kind: "form" as const,
      visibility: "members" as const,
      status: args.status || "draft",
      allowMultipleSubmissions: args.allowMultipleSubmissions ?? true,
      maxSubmissionsPerUser,
      allowSubmissionEdits: Boolean(args.allowSubmissionEdits),
      openAt: args.openAt,
      closeAt: args.closeAt,
      fields,
      resultFields: [],
      resultsVisible: false,
      targetScope,
      approvalSteps,
      ...(requestedWorkflowDefinition !== undefined
        ? { workflowDefinition: requestedWorkflowDefinition }
        : existingById?.workflowDefinition !== undefined
          ? { workflowDefinition: existingById.workflowDefinition }
          : {}),
      updatedBy: teacher._id,
      publishedAt: args.status === "published" ? (existingById?.publishedAt || now) : existingById?.publishedAt,
      updatedAt: now,
    }
    if (patch.status === "published") {
      await validateWorkflowForPublication(ctx, teacher, { ...existingById, ...patch })
    }
    if (args.id) {
      await ctx.db.patch(args.id, patch)
      return args.id
    }
    return await ctx.db.insert("oaForms", {
      ...patch,
      createdBy: teacher._id,
      createdAt: now,
    })
  },
})

export const teacherSetStatus = mutation({
  args: { sessionToken: v.string(), id: v.id("oaForms"), status: formStatusValidator },
  handler: async (ctx, args) => {
    const teacher = requireTeacher(await getUserBySession(ctx, args.sessionToken))
    const form = assertNotSystemManagedForm(assertOwnForm(teacher, await ctx.db.get(args.id)))
    if (args.status === "published") await validateWorkflowForPublication(ctx, teacher, form)
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedBy: teacher._id,
      publishedAt: args.status === "published" ? (form.publishedAt || now) : form.publishedAt,
      updatedAt: now,
    })
    return args.id
  },
})

export const teacherRemove = mutation({
  args: { sessionToken: v.string(), id: v.id("oaForms") },
  handler: async (ctx, args) => {
    const teacher = requireTeacher(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.id)
    assertNotSystemManagedForm(form)
    assertOwnForm(teacher, form)
    const existingSubmission = await ctx.db
      .query("oaFormSubmissions")
      .withIndex("by_form_createdAt", (q) => q.eq("formId", args.id))
      .first()
    if (existingSubmission) throw new Error("已有提交记录的表单不能删除，请改为归档")
    await assertFormIsNotFillTarget(ctx, args.id)
    await ctx.db.delete(args.id)
    return args.id
  },
})

/** Read-only submissions to a teacher-owned form, newest first. */
export const teacherListSubmissions = query({
  args: { sessionToken: v.string(), formId: v.id("oaForms"), status: v.optional(reviewStatusValidator), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const teacher = requireTeacher(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    assertOwnForm(teacher, form)
    const rows = args.status
      ? await ctx.db.query("oaFormSubmissions").withIndex("by_form_status_createdAt", (q) => q.eq("formId", args.formId).eq("reviewStatus", args.status!)).order("desc").collect()
      : await ctx.db.query("oaFormSubmissions").withIndex("by_form_createdAt", (q) => q.eq("formId", args.formId)).order("desc").collect()
    const queryText = normalizeOptionalText(args.search)?.toLowerCase()
    if (!queryText) return rows
    return rows.filter((row) => [row.submitterName, row.studentId, row.submitterEmail].some((value) => String(value || "").toLowerCase().includes(queryText)))
  },
})

/* ------------------------------------------------------------------ */
/* Canonical teacher / super-administrator form management             */
/* ------------------------------------------------------------------ */

export const manageList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const manager = await requireManageSurfaceActor(ctx, await getUserBySession(ctx, args.sessionToken))
    const all = await ctx.db.query("oaForms").withIndex("by_updatedAt").order("desc").collect()
    const nonSystemRows = all.filter((form) => !isSystemManagedForm(form))
    const rows = manager.role === "super_admin"
      ? nonSystemRows
      : resolveUserIdentityType(manager) === "teacher"
        ? nonSystemRows.filter((form) => String(form.createdBy) === String(manager._id))
        : nonSystemRows.filter((form) => (
            String(form.createdBy) === String(manager._id)
            && formKind(form) === "reimbursement"
          ))
    const nameCache = new Map<string, string>()
    return await Promise.all(rows.map(async (form) => {
      const submissions = await ctx.db
        .query("oaFormSubmissions")
        .withIndex("by_form_createdAt", (q) => q.eq("formId", form._id))
        .collect()
      let createdByName = nameCache.get(String(form.createdBy))
      if (!createdByName) {
        const creator = await ctx.db.get(form.createdBy)
        createdByName = creator
          ? (creator.chineseName || creator.englishName || creator.username || "未知账号")
          : "未知账号"
        nameCache.set(String(form.createdBy), createdByName)
      }
      return {
        ...form,
        createdByName,
        submissionCount: submissions.length,
        pendingSubmissionCount: submissions.filter((submission) => submission.reviewStatus === "pending").length,
      }
    }))
  },
})

/** Minimal server-authorized target list for fill-form workflow nodes. */
export const listEditorVisibleTargets = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const manager = await requireManageSurfaceActor(ctx, await getUserBySession(ctx, args.sessionToken))
    const rows = await ctx.db.query("oaForms").withIndex("by_updatedAt").order("desc").collect()
    const candidates = rows.filter((form) => !isSystemManagedForm(form) && form.status === "published" && form.visibility === "members")
    const access = manager.role === "super_admin"
      ? []
      : await Promise.all(candidates.map((form) => canUserAccessOAForm(ctx, manager, form)))
    return candidates
      .filter((_form, index) => manager.role === "super_admin" || access[index])
      .map((form) => ({
        id: String(form._id),
        title: form.title,
        status: form.status,
        kind: formKind(form),
      }))
  },
})

export const manageGet = query({
  args: { sessionToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const manager = await requireManageSurfaceActor(ctx, await getUserBySession(ctx, args.sessionToken))
    const normalizedId = ctx.db.normalizeId("oaForms", args.id)
    if (!normalizedId) return null
    const form = await ctx.db.get(normalizedId)
    if (!form) return null
    assertNotSystemManagedForm(form)
    await assertCanManageFormWithRights(ctx, manager, form)
    return form
  },
})

export const manageUpsert = mutation({
  args: { sessionToken: v.string(), ...formInputValidator },
  handler: async (ctx, args) => {
    const manager = await getUserBySession(ctx, args.sessionToken)
    const existingById = args.id ? await ctx.db.get(args.id) : null
    if (existingById) assertNotSystemManagedForm(existingById)
    const requestedKind: "form" | "reimbursement" = existingById
      ? formKind(existingById)
      : args.kind === "reimbursement" ? "reimbursement" : "form"
    if (requestedKind === "reimbursement") {
      await requireReimbursementRight(ctx, manager, "canCreate")
      if (existingById) await assertCanManageFormWithRights(ctx, manager, existingById)
    } else {
      requireFormManager(manager)
      if (existingById) assertCanManageForm(manager, existingById)
    }
    const now = Date.now()
    const slug = normalizeSlug(args.slug)
    const fields = args.fields.map(sanitizeField)
    uniqueIds(fields, "字段")
    if (fields.length === 0) throw new Error("至少需要一个字段")
    const category = normalizeOptionalText(args.category) || "教学服务"
    const maxSubmissionsPerUser = args.maxSubmissionsPerUser
      && Number.isInteger(args.maxSubmissionsPerUser)
      && args.maxSubmissionsPerUser > 0
      ? Math.floor(args.maxSubmissionsPerUser)
      : undefined
    const existingBySlug = await ctx.db
      .query("oaForms")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
    if (existingBySlug && (!args.id || String(existingBySlug._id) !== String(args.id))) {
      throw new Error("该 slug 已被其他表单使用")
    }
    if (!args.targetScope) throw new Error("请指定表单可见范围")
    const targetScope = normalizeUserScope(args.targetScope, "表单可见范围")
    const approvalSteps = requestedKind === "reimbursement"
      ? []
      : normalizeApprovalSteps(args.approvalSteps ?? [])
    const requestedWorkflowDefinition = requestedKind === "reimbursement"
      ? await buildCurrentReimbursementWorkflow(ctx, args)
      : normalizeWorkflowDefinition(args.workflowDefinition)
    if (requestedWorkflowDefinition) {
      await validateWorkflowFillTargets(ctx, manager, requestedWorkflowDefinition)
    }
    await assertScopedUsersExist(ctx, [
      targetScope,
      ...(approvalSteps || []).map((step: any) => step.scope),
      ...workflowDefinitionScopes(requestedWorkflowDefinition),
    ])
    await assertActorCanUseScope(ctx, manager, targetScope, "form_audience")
    for (const step of approvalSteps || []) {
      await assertActorCanUseScope(ctx, manager, step.scope, "workflow_approver")
    }
    await assertActorCanUseWorkflowScopes(ctx, manager, requestedWorkflowDefinition, {
      trustedReviewScope: requestedKind === "reimbursement",
    })
    const patch = {
      slug,
      title: normalizeText(args.title, "未命名表单"),
      description: normalizeOptionalText(args.description),
      category,
      kind: requestedKind,
      visibility: "members" as const,
      status: args.status || "draft",
      allowMultipleSubmissions: args.allowMultipleSubmissions ?? true,
      maxSubmissionsPerUser,
      allowSubmissionEdits: Boolean(args.allowSubmissionEdits),
      openAt: args.openAt,
      closeAt: args.closeAt,
      fields,
      resultFields: existingById?.resultFields || [],
      resultsVisible: Boolean(existingById?.resultsVisible),
      targetScope,
      approvalSteps,
      ...(requestedWorkflowDefinition !== undefined
        ? { workflowDefinition: requestedWorkflowDefinition }
        : existingById?.workflowDefinition !== undefined
          ? { workflowDefinition: existingById.workflowDefinition }
          : {}),
      updatedBy: manager._id,
      publishedAt: args.status === "published"
        ? (existingById?.publishedAt || now)
        : existingById?.publishedAt,
      updatedAt: now,
    }
    if (patch.status === "published") {
      await validateWorkflowForPublication(ctx, manager, { ...existingById, ...patch })
    }
    if (args.id) {
      await ctx.db.patch(args.id, patch)
      return args.id
    }
    return await ctx.db.insert("oaForms", {
      ...patch,
      createdBy: manager._id,
      createdAt: now,
    })
  },
})

export const manageSetStatus = mutation({
  args: { sessionToken: v.string(), id: v.id("oaForms"), status: formStatusValidator },
  handler: async (ctx, args) => {
    const manager = await requireManageSurfaceActor(ctx, await getUserBySession(ctx, args.sessionToken))
    const form = await assertCanManageFormWithRights(ctx, manager, await ctx.db.get(args.id))
    assertNotSystemManagedForm(form)
    const reimbursementWorkflow = formKind(form) === "reimbursement"
      ? await buildCurrentReimbursementWorkflow(ctx, form)
      : undefined
    const publishableForm = reimbursementWorkflow
      ? { ...form, workflowDefinition: reimbursementWorkflow, approvalSteps: [] }
      : form
    if (args.status === "published") await validateWorkflowForPublication(ctx, manager, publishableForm)
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(reimbursementWorkflow
        ? { workflowDefinition: reimbursementWorkflow, approvalSteps: [] }
        : {}),
      updatedBy: manager._id,
      publishedAt: args.status === "published" ? (form.publishedAt || now) : form.publishedAt,
      updatedAt: now,
    })
    return args.id
  },
})

export const manageSetPinned = mutation({
  args: { sessionToken: v.string(), id: v.id("oaForms"), pinned: v.boolean() },
  handler: async (ctx, args) => {
    const manager = requireFormManager(await getUserBySession(ctx, args.sessionToken))
    if (manager.role !== "super_admin") throw new Error("只有超级管理员可以置顶表单")
    const form = await ctx.db.get(args.id)
    assertNotSystemManagedForm(form)
    assertCanManageForm(manager, form)
    const now = Date.now()
    await ctx.db.patch(args.id, {
      pinnedAt: args.pinned ? now : undefined,
      updatedBy: manager._id,
      updatedAt: now,
    })
    return args.id
  },
})

export const manageRemove = mutation({
  args: { sessionToken: v.string(), id: v.id("oaForms") },
  handler: async (ctx, args) => {
    const manager = await requireManageSurfaceActor(ctx, await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.id)
    assertNotSystemManagedForm(form)
    await assertCanManageFormWithRights(ctx, manager, form)
    const existingSubmission = await ctx.db
      .query("oaFormSubmissions")
      .withIndex("by_form_createdAt", (q) => q.eq("formId", args.id))
      .first()
    if (existingSubmission) throw new Error("已有提交记录的表单不能删除，请改为归档")
    await assertFormIsNotFillTarget(ctx, args.id)
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const manageListSubmissions = query({
  args: {
    sessionToken: v.string(),
    formId: v.id("oaForms"),
    status: v.optional(reviewStatusValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const manager = await requireManageSurfaceActor(ctx, await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    await assertCanManageFormWithRights(ctx, manager, form)
    if (formKind(form) === "reimbursement") {
      await requireReimbursementRight(ctx, manager, "canManage")
    }
    const rows = args.status
      ? await ctx.db
        .query("oaFormSubmissions")
        .withIndex("by_form_status_createdAt", (q) => q.eq("formId", args.formId).eq("reviewStatus", args.status!))
        .order("desc")
        .collect()
      : await ctx.db
        .query("oaFormSubmissions")
        .withIndex("by_form_createdAt", (q) => q.eq("formId", args.formId))
        .order("desc")
        .collect()
    const queryText = normalizeOptionalText(args.search)?.toLowerCase()
    if (!queryText) return rows
    return rows.filter((row) => [row.submitterName, row.studentId, row.submitterEmail]
      .some((value) => String(value || "").toLowerCase().includes(queryText)))
  },
})

export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upload URLs are ownership-bound. A target-scope AIA user may need one
    // before the browser sends a form ID, so membership is checked at submit.
    const user = await getUserBySession(ctx, args.sessionToken)
    const r2Target = await createR2UploadTarget({
      purpose: "oa-form-attachment",
      ownerId: String(user._id),
      fileName: args.fileName,
      contentType: args.mimeType,
    })
    if (r2Target) return r2Target
    return await ctx.storage.generateUploadUrl()
  },
})

export const submit = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    formId: v.id("oaForms"),
    answers: v.any(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const form = await ctx.db.get(args.formId)
    if (!form) throw new Error("表单不存在")
    await assertUserCanAccessOAForm(ctx, user, form)
    assertFormOpen(form)
    const idempotencyKey = String(args.idempotencyKey || "").trim()
    if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("提交请求标识无效")
    const answers = args.answers && typeof args.answers === "object" ? args.answers as Record<string, unknown> : {}
    const normalizedAnswers = await normalizeAnswers(ctx, form, answers, String(user._id))
    const submissionRequestFingerprint = JSON.stringify({
      formId: String(form._id),
      answers: normalizedAnswers,
      documentTemplateVersionId: form.activeDocumentTemplateVersionId
        ? String(form.activeDocumentTemplateVersionId)
        : null,
    })
    const replay = await ctx.db
      .query("oaFormSubmissions")
      .withIndex("by_submitter_idempotency", (q) => q.eq("submitterId", user._id).eq("submissionIdempotencyKey", idempotencyKey))
      .first()
    if (replay) {
      if (replay.submissionRequestFingerprint !== submissionRequestFingerprint) {
        throw new Error("同一提交请求标识不能用于不同内容")
      }
      return replay._id
    }
    const maxSubmissionsPerUser = Number(form.maxSubmissionsPerUser)
    const submissionLimit = Number.isInteger(maxSubmissionsPerUser) && maxSubmissionsPerUser > 0
      ? Math.floor(maxSubmissionsPerUser)
      : form.allowMultipleSubmissions === false ? 1 : undefined
    if (submissionLimit) {
      const existing = await ctx.db
        .query("oaFormSubmissions")
        .withIndex("by_form_submitter_createdAt", (q) => q.eq("formId", form._id).eq("submitterId", user._id))
        .collect()
      if (existing.length >= submissionLimit) throw new Error(`该表单每人最多提交 ${submissionLimit} 次`)
    }
    // Resolve the current panel before inserting so a temporarily
    // unreviewable reimbursement request cannot leave a partial submission.
    const runtimeForm = formKind(form) === "reimbursement"
      ? {
        ...form,
        workflowDefinition: await buildCurrentReimbursementWorkflow(ctx, form),
        approvalSteps: [],
      }
      : form
    const now = Date.now()
    const submissionId = await ctx.db.insert("oaFormSubmissions", {
      formId: form._id,
      formSlug: form.slug,
      submitterId: user._id,
      submitterName: user.chineseName || user.englishName || user.username || user.email,
      studentId: user.studentId,
      submitterEmail: user.email,
      answers: normalizedAnswers,
      formSnapshot: buildFormSnapshot(form),
      documentTemplateVersionId: form.activeDocumentTemplateVersionId,
      reviewStatus: "pending",
      submissionIdempotencyKey: idempotencyKey,
      submissionRequestFingerprint,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const submission = await ctx.db.get(submissionId)
    if (!submission) throw new Error("提交创建失败")
    await startOAWorkflow(ctx, { form: runtimeForm, submission, now })
    await completeRequiredOAFormGrants(ctx, {
      formId: form._id,
      userId: user._id,
      targetSubmissionId: submissionId,
      now,
    })
    return submissionId
  },
})

export const updateSubmission = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("oaFormSubmissions"),
    answers: v.any(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.id)
    if (!submission || String(submission.submitterId) !== String(user._id)) throw new Error("无权修改该提交")
    const form = await ctx.db.get(submission.formId)
    if (!form) throw new Error("表单不存在")
    const hasWorkflow = submission.workflowStatus !== undefined || Array.isArray(submission.approvalStepsSnapshot)
    if (hasWorkflow) {
      if (submission.formSlug === ACADEMIC_EXCHANGE_OA_SLUG || form.slug === ACADEMIC_EXCHANGE_OA_SLUG) {
        throw new Error("请在学术交流申请页面补充材料")
      }
      if (submission.workflowStatus !== "needs_changes") {
        throw new Error("已进入审批流程的提交仅可在要求补充材料时修改")
      }
      const workflowVersion = submission.workflowVersion ?? 1
      if (args.expectedVersion !== workflowVersion) {
        throw new Error("OA_WORKFLOW_VERSION_CONFLICT")
      }
    } else {
      await assertUserCanAccessOAForm(ctx, user, form)
      if (!form.allowSubmissionEdits) {
        throw new Error("该表单不允许修改提交内容")
      }
    }
    if (!hasWorkflow) assertFormOpen(form)
    const answers = args.answers && typeof args.answers === "object" ? args.answers as Record<string, unknown> : {}
    const validationForm = submission.formSnapshot && typeof submission.formSnapshot === "object"
      ? submission.formSnapshot
      : form
    const normalizedAnswers = await normalizeAnswers(ctx, validationForm, answers, String(user._id))
    const now = Date.now()
    await ctx.db.patch(args.id, {
      answers: normalizedAnswers,
      ...(!submission.formSnapshot ? { formSnapshot: buildFormSnapshot(form) } : {}),
      reviewStatus: "pending",
      updatedAt: now,
    })
    if (hasWorkflow) {
      await resumeOAWorkflow(ctx, {
        form,
        submission,
        actorUserId: user._id,
        now,
      })
    }
    return args.id
  },
})

export const listMine = query({
  args: { sessionToken: v.optional(v.string()), formId: v.optional(v.id("oaForms")) },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const rows = args.formId
      ? await ctx.db.query("oaFormSubmissions").withIndex("by_form_submitter_createdAt", (q) => q.eq("formId", args.formId!).eq("submitterId", user._id)).order("desc").collect()
      : await ctx.db.query("oaFormSubmissions").withIndex("by_submitter_createdAt", (q) => q.eq("submitterId", user._id)).order("desc").collect()
    return await Promise.all(rows.map(async (row) => {
      const form = await ctx.db.get(row.formId)
      const snapshot = row.formSnapshot && typeof row.formSnapshot === "object" ? row.formSnapshot : undefined
      const presentationForm = snapshot || form
      const serialized = presentationForm ? serializeSubmission(presentationForm, row, "owner") : row
      const formTitle = snapshot?.title || form?.title
      return {
        ...serialized,
        ...(formTitle ? { formTitle } : {}),
        allowSubmissionEdits: Boolean(snapshot?.allowSubmissionEdits ?? form?.allowSubmissionEdits),
      }
    }))
  },
})

/**
 * Returns a submitter-safe projection of the complete immutable workflow.
 * Future nodes are included, routing IDs stay server-only, pending scopes are
 * represented by selector labels, and completed reviews expose only actors
 * who actually made a decision.
 */
export const listMineApprovalHistory = query({
  args: { sessionToken: v.optional(v.string()), submissionId: v.id("oaFormSubmissions") },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || String(submission.submitterId) !== String(user._id)) return null

    const form = await ctx.db.get(submission.formId)
    const rawSteps = submission.workflowDefinitionSnapshot?.version === 2
      ? submission.workflowDefinitionSnapshot.nodes
      : Array.isArray(submission.approvalStepsSnapshot)
        ? submission.approvalStepsSnapshot
        : form?.workflowDefinition?.nodes || form?.approvalSteps || []
    const steps = rawSteps.map((node: any) => node.type ? node : {
      ...node,
      type: "batch_approval",
      completion: node.completion === "all" ? "all" : "any",
    })
    const events = await ctx.db
      .query("oaApprovalEvents")
      .withIndex("by_submission_createdAt", (index) => index.eq("submissionId", submission._id))
      .order("asc")
      .collect()
    const tasks = await ctx.db
      .query("oaApprovalTasks")
      .withIndex("by_submission_step", (index) => index.eq("submissionId", submission._id))
      .collect()
    const taskActors = new Map<string, any>()
    await Promise.all(tasks.map(async (task: any) => {
      const reviewer = await ctx.db.get(task.userId)
      taskActors.set(String(task._id), reviewer)
    }))
    const actorName = (actor: any, fallback = "系统") => actor
      ? actor.chineseName || actor.englishName || actor.username || actor.email
      : fallback
    const currentNodeIndex = submission.currentWorkflowNodeIndex ?? submission.currentApprovalStep ?? 0
    const currentVersion = submission.workflowVersion ?? 1

    return await Promise.all(steps.map(async (node: any, stepIndex: number) => {
      const nodeEvents = events.filter((event: any) =>
        event.stepIndex === stepIndex && (!event.stepId || event.stepId === node.id))
      const nodeTasks = tasks.filter((branch: any) =>
        branch.stepIndex === stepIndex && branch.stepId === node.id)
      const isApproval = node.type === "approval" || node.type === "batch_approval"
      const completionEvent = [...nodeEvents].reverse().find((event: any) =>
        event.action === "step_completed"
        || (event.action === "form_access_granted" && node.completionRequired !== true)
        || event.action === "notification_sent")
      const rejectionEvent = [...nodeEvents].reverse().find((event: any) => event.action === "rejected")
      const changesEvent = [...nodeEvents].reverse().find((event: any) => event.action === "changes_requested")
      const pauseEvent = [...nodeEvents].reverse().find((event: any) => event.action === "workflow_paused")
      const latestStarted = [...nodeEvents].reverse().find((event: any) => event.action === "step_started")
      const active = stepIndex === currentNodeIndex
        && (submission.workflowStatus === "pending" || submission.workflowStatus === "needs_changes")

      let state: "completed" | "active" | "waiting" | "rejected" | "needs_changes" | "paused" = "waiting"
      if (pauseEvent && active) state = "paused"
      else if (rejectionEvent) state = "rejected"
      else if (changesEvent && active && submission.workflowStatus === "needs_changes") state = "needs_changes"
      else if (completionEvent || stepIndex < currentNodeIndex) state = "completed"
      else if (active) state = "active"
      else if (node.type === "create_form" && submission.submittedAt) state = "completed"

      const decisions = isApproval
        ? nodeTasks
          .filter((branch: any) =>
            branch.status === "approved"
            || branch.status === "rejected"
            || branch.status === "changes_requested")
          .sort((left: any, right: any) => (left.actedAt ?? left.createdAt) - (right.actedAt ?? right.createdAt))
          .map((branch: any) => {
            const reviewer = taskActors.get(String(branch._id))
            return {
              taskId: String(branch._id),
              reviewerName: actorName(reviewer, "审批人"),
              status: branch.status,
              workflowVersion: branch.workflowVersion ?? 1,
              ...(branch.comment ? { comment: branch.comment } : {}),
              ...(branch.actedAt !== undefined ? { actedAt: branch.actedAt } : {}),
            }
          })
        : []
      const scopeLabels = node.scope
        ? formKind(form) === "reimbursement" && isApproval
          ? ["报销审核与管理权人员"]
          : await describeOAWorkflowScope(ctx, node.scope)
        : []
      const exposeScopeLabels = !isApproval
        || decisions.length === 0
        || state === "active"
        || state === "waiting"
      const targetForm: any = node.type === "fill_form" ? await ctx.db.get(node.targetFormId) : null

      return {
        kind: "workflow_node" as const,
        nodeId: String(node.id),
        nodeType: node.type,
        nodeTitle: String(node.title || "流程节点"),
        stepIndex,
        state,
        workflowVersion: currentVersion,
        ...(exposeScopeLabels && scopeLabels.length > 0 ? { scopeLabels } : {}),
        ...(decisions.length > 0 ? { decisions } : {}),
        ...(node.type === "fill_form"
          ? {
              targetFormTitle: targetForm?.title || "目标表单（已停用）",
              completionRequired: node.completionRequired === true,
            }
          : {}),
        ...(node.type === "create_form" ? { operatorName: submission.submitterName || "提交人" } : {}),
        ...(latestStarted?.createdAt !== undefined ? { startedAt: latestStarted.createdAt } : {}),
        ...(completionEvent?.createdAt !== undefined
          ? { completedAt: completionEvent.createdAt }
          : node.type === "create_form" ? { completedAt: submission.submittedAt } : {}),
        ...(pauseEvent?.comment ? { comment: pauseEvent.comment } : {}),
      }
    }))
  },
})

function workflowStepForTask(form: any, submission: any, task: any) {
  const steps = submission.workflowDefinitionSnapshot?.version === 2
    ? submission.workflowDefinitionSnapshot.nodes
    : Array.isArray(submission.approvalStepsSnapshot)
      ? submission.approvalStepsSnapshot
      : form.workflowDefinition?.nodes || form.approvalSteps || []
  const step = steps[task.stepIndex]
  return step && step.id === task.stepId ? step : null
}

function toApprovalInboxRow(form: any, submission: any, task: any) {
  const step = workflowStepForTask(form, submission, task)
  const sourceFields = Array.isArray(submission.formSnapshot?.fields)
    ? submission.formSnapshot.fields
    : Array.isArray(form.fields) ? form.fields : []
  const formFields = sourceFields.map((field: any) => ({
    id: String(field.id || ""),
    label: String(field.label || field.id || "未命名字段"),
    type: String(field.type || "text"),
  }))
  return {
    // This deliberately mirrors the minimal submission fields the AIA
    // approval UI needs, without exposing submitter name, ID, or email.
    _id: submission._id,
    formId: submission.formId,
    formSlug: submission.formSlug,
    formTitle: form.title,
    submittedAt: submission.submittedAt,
    answers: submission.answers,
    formFields,
    reviewStatus: submission.reviewStatus,
    ...(submission.adminNote ? { adminNote: submission.adminNote } : {}),
    ...(submission.workflowStatus ? { workflowStatus: submission.workflowStatus } : {}),
    ...(submission.currentApprovalStep !== undefined ? { currentApprovalStep: submission.currentApprovalStep } : {}),
    workflowVersion: submission.workflowVersion ?? 1,
    taskId: task._id,
    taskStatus: task.status,
    ...(task.actedAt !== undefined ? { taskActedAt: task.actedAt } : {}),
    ...(task.comment ? { taskComment: task.comment } : {}),
    ...(step?.id ? { nodeId: step.id } : {}),
    ...(step?.title ? { nodeTitle: step.title } : {}),
    approvalStep: step ? {
      id: step.id,
      title: step.title,
      index: task.stepIndex,
      completion: step.completion === "all" ? "all" : "any",
    } : undefined,
  }
}

async function approvalBranchesForTask(ctx: any, task: any) {
  const tasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (index: any) =>
      index.eq("submissionId", task.submissionId).eq("stepIndex", task.stepIndex))
    .collect()
  let branches = tasks.filter((branch: any) =>
    branch.stepId === task.stepId
    && (branch.workflowVersion ?? 1) === (task.workflowVersion ?? 1))
  const submission = await ctx.db.get(task.submissionId)
  const form = submission ? await ctx.db.get(submission.formId) : null
  if (formKind(form) === "reimbursement") {
    const allowedReviewerIds = new Set(await currentReimbursementManagerIds(ctx))
    branches = branches.filter((branch: any) => allowedReviewerIds.has(String(branch.userId)))
  }
  return await Promise.all(branches.map(async (branch: any) => {
    const reviewer = await ctx.db.get(branch.userId)
    return {
      taskId: String(branch._id),
      reviewerName: reviewer
        ? reviewer.chineseName || reviewer.englishName || reviewer.username || reviewer.email
        : "审批人",
      status: branch.status,
      ...(branch.comment ? { comment: branch.comment } : {}),
      ...(branch.actedAt !== undefined ? { actedAt: branch.actedAt } : {}),
    }
  }))
}

async function listApprovalTasksForUser(ctx: any, user: any, status?: "pending" | "approved" | "rejected" | "skipped" | "changes_requested") {
  const rows = status
    ? await ctx.db
      .query("oaApprovalTasks")
      .withIndex("by_user_status_createdAt", (index: any) => index.eq("userId", user._id).eq("status", status))
      .order("desc")
      .collect()
    : await ctx.db
      .query("oaApprovalTasks")
      .withIndex("by_user_status_createdAt", (index: any) => index.eq("userId", user._id))
      .order("desc")
      .collect()
  return Promise.all(rows.map(async (task: any) => {
    const submission = await ctx.db.get(task.submissionId)
    const form = submission ? await ctx.db.get(submission.formId) : null
    if (!submission || !form) return null
    if (
      formKind(form) === "reimbursement"
      && !await hasReimbursementRight(ctx, user, "canManage")
    ) return null
    return { task, submission, form }
  }))
}

/** Lists task records for the current account without submitter identity data. */
export const listMyApprovalTasks = query({
  args: {
    sessionToken: v.optional(v.string()),
    status: v.optional(approvalTaskStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const records = (await listApprovalTasksForUser(ctx, user, args.status)).filter(Boolean) as Array<any>
    return records.map(({ task, submission, form }) => ({
      taskId: task._id,
      status: task.status,
      createdAt: task.createdAt,
      ...(task.actedAt !== undefined ? { actedAt: task.actedAt } : {}),
      ...(task.comment ? { comment: task.comment } : {}),
      submission: toApprovalInboxRow(form, submission, task),
    }))
  },
})

/** A convenient submission-shaped pending queue for the AIA approval console. */
export const listMyApprovalInbox = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const records = (await listApprovalTasksForUser(ctx, user, "pending")).filter(Boolean) as Array<any>
    return records
      .filter(({ task, submission }) => submission.workflowStatus === "pending" && submission.currentApprovalStep === task.stepIndex)
      .map(({ task, submission, form }) => toApprovalInboxRow(form, submission, task))
  },
})

/**
 * Permission-driven reimbursement review follows the current management
 * panel. Claiming on inbox entry makes already-pending submissions available
 * to managers who were previously omitted (including the applicant) and to
 * managers granted access after the node was activated.
 */
export const ensureMyReimbursementApprovalTasks = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    await requireReimbursementRight(ctx, user, "canManage")
    const submissions = await ctx.db.query("oaFormSubmissions").collect()
    const now = Date.now()
    let created = 0

    for (const submission of submissions) {
      if (submission.workflowStatus !== "pending") continue
      const form = await ctx.db.get(submission.formId)
      if (!form || formKind(form) !== "reimbursement") continue
      const stepIndex = submission.currentWorkflowNodeIndex ?? submission.currentApprovalStep ?? 0
      const definition = submission.workflowDefinitionSnapshot?.version === 2
        ? submission.workflowDefinitionSnapshot
        : form.workflowDefinition
      const node = definition?.nodes?.[stepIndex]
      if (!node || (node.type !== "approval" && node.type !== "batch_approval")) continue
      const workflowVersion = submission.workflowVersion ?? 1
      const currentTasks = await ctx.db
        .query("oaApprovalTasks")
        .withIndex("by_submission_user", (index: any) => (
          index.eq("submissionId", submission._id).eq("userId", user._id)
        ))
        .collect()
      if (currentTasks.some((task: any) => (
        task.stepIndex === stepIndex && (task.workflowVersion ?? 1) === workflowVersion
      ))) continue

      const naturalKey = `oa:task:${String(submission._id)}:${String(node.id)}:${workflowVersion}:${String(user._id)}`
      const existingByKey = await ctx.db
        .query("oaApprovalTasks")
        .withIndex("by_naturalKey", (index: any) => index.eq("naturalKey", naturalKey))
        .first()
      if (existingByKey) continue
      await ctx.db.insert("oaApprovalTasks", {
        submissionId: submission._id,
        formId: form._id,
        stepIndex,
        stepId: String(node.id),
        userId: user._id,
        status: "pending",
        workflowVersion,
        naturalKey,
        createdAt: now,
        updatedAt: now,
      })
      created += 1
    }
    return { created }
  },
})

/** Returns one task and only the application fields that its assignee may review. */
export const getMyApprovalTask = query({
  args: { sessionToken: v.optional(v.string()), taskId: v.id("oaApprovalTasks") },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const task = await ctx.db.get(args.taskId)
    if (!task || String(task.userId) !== String(user._id)) return null
    const submission = await ctx.db.get(task.submissionId)
    const form = submission ? await ctx.db.get(submission.formId) : null
    if (!submission || !form) return null
    if (formKind(form) === "reimbursement" && !await hasReimbursementRight(ctx, user, "canManage")) {
      return null
    }
    return {
      ...toApprovalInboxRow(form, submission, task),
      branches: await approvalBranchesForTask(ctx, task),
    }
  },
})

export const actOnApprovalTask = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    taskId: v.id("oaApprovalTasks"),
    action: approvalActionValidator,
    comment: v.optional(v.string()),
    expectedVersion: v.number(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const task = await ctx.db.get(args.taskId)
    if (!task || String(task.userId) !== String(actor._id)) throw new Error("无权处理该审批任务")
    const submission = await ctx.db.get(task.submissionId)
    if (!submission) throw new Error("审批任务关联的提交不存在")
    const form = await ctx.db.get(submission.formId)
    if (!form) throw new Error("审批任务关联的表单不存在")
    if (
      formKind(form) !== "reimbursement"
      && String(task.userId) === String(submission.submitterId)
    ) {
      throw new Error("申请人不能审批自己的提交")
    }
    const idempotencyKey = String(args.idempotencyKey || "").trim()
    if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("审批请求标识无效")
    const comment = String(args.comment || "").trim().slice(0, 2000) || undefined
    const actionRequestFingerprint = JSON.stringify({
      action: args.action,
      comment: comment || "",
      expectedVersion: args.expectedVersion,
    })
    if (task.actionIdempotencyKey === idempotencyKey) {
      if (task.actionRequestFingerprint !== actionRequestFingerprint) {
        return { updated: false, reason: "idempotency_conflict" }
      }
      return task.actionResult || { updated: false, reason: "already_handled" }
    }
    if (task.status !== "pending") return { updated: false, reason: "task_not_pending" }
    if (!form || (submission.workflowStatus === undefined && !Array.isArray(submission.approvalStepsSnapshot))) {
      throw new Error("审批任务关联的流程不存在")
    }
    if (formKind(form) === "reimbursement") {
      await requireReimbursementRight(ctx, actor, "canManage")
    }
    const currentVersion = submission.workflowVersion ?? 1
    if (args.expectedVersion !== currentVersion || (task.workflowVersion ?? 1) !== currentVersion) {
      return { updated: false, reason: "stale_version", currentVersion }
    }
    const workflowResult = await advanceOAWorkflow(ctx, {
      form,
      submission,
      task,
      actor,
      action: args.action,
      comment,
      expectedVersion: args.expectedVersion,
      now: Date.now(),
    })
    const noOpReasons = new Set(["workflow_not_pending", "task_version_stale", "task_not_current"])
    const result = workflowResult.advanced === false
      && typeof workflowResult.reason === "string"
      && noOpReasons.has(workflowResult.reason)
      ? { updated: false, reason: workflowResult.reason, currentVersion }
      : { updated: true, ...workflowResult }
    await syncAcademicExchangeFromOASubmission(
      ctx,
      form,
      submission._id,
      actor,
      comment,
    )
    await ctx.db.patch(task._id, {
      actionIdempotencyKey: idempotencyKey,
      actionRequestFingerprint,
      actionResult: result,
    })
    return result
  },
})

async function genericNotificationHref(ctx: any, recipient: any, notification: any) {
  if (notification.kind === "oa_workflow") {
    const submission = await ctx.db.get(notification.resourceId)
    if (!submission) return "/services/oa/my"
    if (String(submission.submitterId) === String(recipient._id)) {
      if (submission.formSlug === ACADEMIC_EXCHANGE_OA_SLUG) {
        const application = await ctx.db
          .query("academicExchangeSupportApplications")
          .withIndex("by_oaSubmissionId", (index: any) => index.eq("oaSubmissionId", submission._id))
          .first()
        if (application) {
          const detailHref = `/services/oa/reimbursements/academic-exchange/${String(application._id)}`
          return application.status === "needs_changes" ? `${detailHref}/edit` : detailHref
        }
      }
      return `/services/oa/submissions/${String(submission._id)}`
    }
    const tasks = await ctx.db
      .query("oaApprovalTasks")
      .withIndex("by_submission_user", (index: any) => index.eq("submissionId", submission._id).eq("userId", recipient._id))
      .collect()
    const task = tasks.find((task: any) =>
      task.status === "pending"
      && (task.workflowVersion ?? 1) === (submission.workflowVersion ?? 1)
      && task.stepIndex === (submission.currentWorkflowNodeIndex ?? submission.currentApprovalStep))
    return task ? `/services/oa/approvals/${String(task._id)}` : "/services/oa/my"
  }

  if (notification.kind === "content_review") {
    const submission = await ctx.db.get(notification.resourceId)
    if (!submission || (submission.category !== "news" && submission.category !== "events")) {
      return "/portal/list"
    }
    return `/class-work/${submission.category}/submissions/${String(submission._id)}`
  }

  const application = await ctx.db.get(notification.resourceId)
  if (!application || String(application.applicantUserId) === String(recipient._id)) {
    return application
      ? `/services/coffee-talk/my/${String(application._id)}`
      : "/services/coffee-talk/my"
  }
  const teacher = await ctx.db.get(application.assignedTeacherPersonId)
  if (
    teacher?.kind === "teacher"
    && teacher.accountUserId !== undefined
    && String(teacher.accountUserId) === String(recipient._id)
  ) {
    return `/services/coffee-talk/manage/${String(application._id)}`
  }
  return `/services/coffee-talk/my/${String(application._id)}`
}

/** Unified, recipient-authorized AIA inbox for Coffee Talk and OA workflow notices. */
export const listMyNotifications = query({
  args: { sessionToken: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // The global AIA shell can render before a stale browser token is cleared.
    // Match Coffee Talk's signed-out behavior instead of failing navigation.
    let user: any
    try {
      user = await getUserBySession(ctx, args.sessionToken)
    } catch {
      return []
    }
    const limit = Math.max(1, Math.min(Math.floor(args.limit || 30), 500))
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (index: any) => index.eq("userId", user._id))
      .order("desc")
      .take(limit)
    return Promise.all(notifications.map(async (notification: any) => ({
      id: String(notification._id),
      kind: notification.kind,
      category: notification.kind === "oa_workflow"
        ? "approval"
        : notification.kind === "content_review"
          ? "class-work"
          : "coffee-talk",
      type: notification.kind === "oa_workflow"
        ? "approval_task"
        : notification.kind === "content_review"
          ? "content_review"
          : "coffee_talk",
      title: notification.title,
      body: notification.body,
      ...(notification.readAt !== undefined ? { readAt: notification.readAt } : {}),
      ...(notification.archivedAt !== undefined ? { archivedAt: notification.archivedAt } : {}),
      createdAt: notification.createdAt,
      href: await genericNotificationHref(ctx, user, notification),
    })))
  },
})

export const markMyNotificationRead = mutation({
  args: { sessionToken: v.optional(v.string()), notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const notification = await ctx.db.get(args.notificationId)
    if (!notification || String(notification.userId) !== String(user._id) || notification.readAt !== undefined) {
      return { updated: false }
    }
    await ctx.db.patch(args.notificationId, { readAt: Date.now() })
    return { updated: true }
  },
})

export const archiveMyNotification = mutation({
  args: { sessionToken: v.optional(v.string()), notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const notification = await ctx.db.get(args.notificationId)
    if (!notification || String(notification.userId) !== String(user._id) || notification.archivedAt !== undefined) {
      return { updated: false }
    }
    const now = Date.now()
    await ctx.db.patch(args.notificationId, {
      archivedAt: now,
      ...(notification.readAt === undefined ? { readAt: now } : {}),
    })
    return { updated: true }
  },
})

export const markAllMyNotificationsRead = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (index: any) => index.eq("userId", user._id))
      .collect()
    const unread = notifications.filter((notification: any) => notification.readAt === undefined)
    if (unread.length === 0) return { updatedCount: 0 }
    const now = Date.now()
    await Promise.all(unread.map((notification: any) => ctx.db.patch(notification._id, { readAt: now })))
    return { updatedCount: unread.length }
  },
})

export const adminListSubmissions = query({
  args: { sessionToken: v.optional(v.string()), formId: v.id("oaForms"), status: v.optional(reviewStatusValidator), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    if (!form) throw new Error("表单不存在")
    assertCanManageAIAWorkflowForm(admin, form)
    const rows = args.status
      ? await ctx.db.query("oaFormSubmissions").withIndex("by_form_status_createdAt", (q) => q.eq("formId", args.formId).eq("reviewStatus", args.status!)).order("desc").collect()
      : await ctx.db.query("oaFormSubmissions").withIndex("by_form_createdAt", (q) => q.eq("formId", args.formId)).order("desc").collect()
    const queryText = normalizeOptionalText(args.search)?.toLowerCase()
    if (!queryText) return rows
    return rows.filter((row) => [row.submitterName, row.studentId, row.submitterEmail].some((value) => String(value || "").toLowerCase().includes(queryText)))
  },
})

export const adminReviewSubmission = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("oaFormSubmissions"),
    reviewStatus: reviewStatusValidator,
    adminNote: v.optional(v.string()),
    resultValues: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.id)
    if (!submission) throw new Error("提交不存在")
    const form = await ctx.db.get(submission.formId)
    if (!form) throw new Error("表单不存在")
    if (
      formKind(form) !== "reimbursement"
      && String(submission.submitterId) === String(actor._id)
    ) {
      throw new Error("申请人不能审批自己的提交")
    }
    if (formKind(form) === "reimbursement") {
      await requireReimbursementRight(ctx, actor, "canManage")
    }
    const now = Date.now()
    // A configured workflow is never mutable through the legacy admin status
    // control. The actor must own a current stored task, even if they are an
    // administrator, so ordered approval cannot be bypassed.
    if (submission.workflowStatus !== undefined || Array.isArray(submission.approvalStepsSnapshot)) {
      if (!["approved", "rejected", "needs_changes"].includes(args.reviewStatus)) {
        throw new Error("审批流程只能执行同意、驳回或要求补充材料")
      }
      const tasks = await ctx.db
        .query("oaApprovalTasks")
        .withIndex("by_submission_user", (index: any) => index.eq("submissionId", submission._id).eq("userId", actor._id))
        .collect()
      const task = tasks.find((item: any) => item.status === "pending" && item.stepIndex === submission.currentApprovalStep)
      if (!task) throw new Error("当前账号没有可处理的审批任务")
      const workflowResult = await advanceOAWorkflow(ctx, {
        form,
        submission,
        task,
        actor,
        action: args.reviewStatus === "approved"
          ? "approve"
          : args.reviewStatus === "needs_changes" ? "request_changes" : "reject",
        comment: args.adminNote,
        now,
      })
      await syncAcademicExchangeFromOASubmission(
        ctx,
        form,
        submission._id,
        actor,
        args.adminNote,
      )
      return workflowResult
    }

    const admin = requireAdmin(actor)
    assertCanManageAIAWorkflowForm(admin, form)
    await ctx.db.patch(args.id, {
      reviewStatus: args.reviewStatus,
      adminNote: normalizeOptionalText(args.adminNote),
      reviewerId: admin._id,
      reviewerName: admin.chineseName || admin.englishName || admin.username || admin.email,
      reviewedAt: now,
      resultValues: args.resultValues,
      updatedAt: now,
    })
    return args.id
  },
})

export const getAttachmentUrl = query({
  args: { sessionToken: v.optional(v.string()), submissionId: v.id("oaFormSubmissions"), storageId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionToken)
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) return null
    const form = await ctx.db.get(submission.formId)
    if (!form) return null
    if (
      formKind(form) === "reimbursement"
      && String(submission.submitterId) !== String(user._id)
    ) {
      await requireReimbursementRight(ctx, user, "canManage")
    }
    const isAdmin = user.role === "admin" || user.role === "super_admin"
    const isSubmitter = String(submission.submitterId) === String(user._id)
    const approvalTasks = !isSubmitter
      ? await ctx.db
        .query("oaApprovalTasks")
        .withIndex("by_submission_user", (index: any) => index.eq("submissionId", submission._id).eq("userId", user._id))
        .collect()
      : []
    const isCurrentAssignee = approvalTasks.some((task: any) => (
      task.status === "pending" && task.stepIndex === submission.currentApprovalStep
    ))
    const hasWorkflow = submission.workflowStatus !== undefined || Array.isArray(submission.approvalStepsSnapshot)
    const isLegacyAdmin = isAdmin && !hasWorkflow && (!isAIAWorkflowForm(form) || user.role === "super_admin")
    // Creating a reimbursement definition is deliberately separate from
    // reviewing applicants' financial records and attachments.
    const isFormOwner = formKind(form) !== "reimbursement"
      && String(form.createdBy) === String(user._id)
    if (!isSubmitter && !isCurrentAssignee && !isLegacyAdmin && !isFormOwner) throw new Error("无权访问该附件")
    const snapshot = submission.formSnapshot && typeof submission.formSnapshot === "object" ? submission.formSnapshot : form
    if (!collectAttachmentStorageIds(snapshot, submission.answers).has(args.storageId)) throw new Error("附件不属于该提交")
    const r2Url = await getR2DownloadUrl(args.storageId)
    if (r2Url) return r2Url
    return await ctx.storage.getUrl(args.storageId as any)
  },
})

export const adminExportSubmissions = query({
  args: { sessionToken: v.optional(v.string()), formId: v.id("oaForms") },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    if (!form) throw new Error("表单不存在")
    assertCanManageAIAWorkflowForm(admin, form)
    const rows = await ctx.db.query("oaFormSubmissions").withIndex("by_form_createdAt", (q) => q.eq("formId", args.formId)).order("desc").collect()
    return { form, rows }
  },
})

export const adminUpdateResultConfig = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    formId: v.id("oaForms"),
    resultFields: v.array(resultFieldValidator),
    resultsVisible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    if (!form) throw new Error("表单不存在")
    assertCanManageAIAWorkflowForm(admin, form)
    const resultFields = args.resultFields.map(sanitizeResultField)
    uniqueIds(resultFields, "结果字段")
    await ctx.db.patch(args.formId, {
      resultFields,
      resultsVisible: args.resultsVisible,
      updatedBy: admin._id,
      updatedAt: Date.now(),
    })
    return args.formId
  },
})

export const adminBatchUpdateResults = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    formId: v.id("oaForms"),
    rows: v.array(v.object({
      submissionId: v.optional(v.id("oaFormSubmissions")),
      studentId: v.optional(v.string()),
      reviewStatus: v.optional(reviewStatusValidator),
      resultValues: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getUserBySession(ctx, args.sessionToken))
    const form = await ctx.db.get(args.formId)
    if (!form) throw new Error("表单不存在")
    assertCanManageAIAWorkflowForm(admin, form)
    const now = Date.now()
    let updated = 0
    let skippedWorkflow = 0
    for (const row of args.rows) {
      let submission = row.submissionId ? await ctx.db.get(row.submissionId) : null
      if (!submission && row.studentId) {
        submission = await ctx.db.query("oaFormSubmissions").withIndex("by_form_studentId", (q) => q.eq("formId", args.formId).eq("studentId", row.studentId!)).first()
      }
      if (!submission || String(submission.formId) !== String(args.formId)) continue
      if (submission.workflowStatus !== undefined || Array.isArray(submission.approvalStepsSnapshot)) {
        skippedWorkflow += 1
        continue
      }
      await ctx.db.patch(submission._id, {
        reviewStatus: row.reviewStatus || submission.reviewStatus,
        resultValues: row.resultValues,
        updatedAt: now,
      })
      updated += 1
    }
    return { updated, skippedWorkflow }
  },
})
