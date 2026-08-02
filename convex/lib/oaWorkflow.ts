import { resolveUserIdentityType } from "./userIdentity"

type OAUserScope = {
  identityTypes?: readonly string[]
  roles?: readonly string[]
  userIds?: readonly unknown[]
  researchGroupIds?: readonly unknown[]
  userGroupIds?: readonly unknown[]
}

type OAApprovalStep = {
  id: string
  title: string
  scope: OAUserScope
  completion?: "any" | "all"
}

type OAWorkflowNode =
  | { id: string; type: "create_form"; title: string }
  | { id: string; type: "approval"; title: string; scope: OAUserScope }
  | { id: string; type: "batch_approval"; title: string; scope: OAUserScope; completion: "any" | "all" }
  | { id: string; type: "fill_form"; title: string; targetFormId: unknown }
  | { id: string; type: "notification"; title: string; scope: OAUserScope; message: string }

type OAWorkflowDefinition = { version: 2; nodes: OAWorkflowNode[] }
type OAWorkflowAction = "approve" | "reject" | "request_changes"
type OAEventAction =
  | "workflow_started"
  | "step_started"
  | "approved"
  | "rejected"
  | "step_completed"
  | "workflow_approved"
  | "workflow_rejected"
  | "changes_requested"
  | "workflow_changes_requested"
  | "resubmitted"
  | "form_access_granted"
  | "notification_sent"
  | "workflow_paused"

function normalizedId(value: unknown) {
  return String(value)
}

function normalizedComment(value?: string) {
  const comment = String(value || "").trim()
  return comment ? comment.slice(0, 2000) : undefined
}

function snapshotScope(scope: OAUserScope) {
  return {
    ...(scope.identityTypes?.length ? { identityTypes: [...scope.identityTypes] } : {}),
    ...(scope.roles?.length ? { roles: [...scope.roles] } : {}),
    ...(scope.userIds?.length ? { userIds: [...scope.userIds] } : {}),
    ...(scope.researchGroupIds?.length ? { researchGroupIds: [...scope.researchGroupIds] } : {}),
    ...(scope.userGroupIds?.length ? { userGroupIds: [...scope.userGroupIds] } : {}),
  }
}

function snapshotSteps(steps: readonly OAApprovalStep[]): OAApprovalStep[] {
  return steps.map((step) => ({
    id: String(step.id),
    title: String(step.title),
    scope: snapshotScope(step.scope || {}),
    completion: step.completion === "all" ? "all" : "any",
  }))
}

/** Stable compatibility adapter for every form that predates workflow V2. */
export function adaptLegacyOAWorkflow(steps?: readonly OAApprovalStep[]): OAWorkflowDefinition {
  const used = new Set(["create_form"])
  const uniqueId = (candidate: unknown) => {
    const base = String(candidate || "approval")
    let id = base
    let suffix = 2
    while (used.has(id)) id = `${base}_${suffix++}`
    used.add(id)
    return id
  }
  const nodes: OAWorkflowNode[] = [{ id: "create_form", type: "create_form", title: "创建表单" }]
  for (const step of steps || []) {
    const scope = snapshotScope(step.scope || {})
    if (Object.keys(scope).length === 0) continue
    // Legacy steps always targeted a scope, not a single explicit reviewer.
    // Preserve their historical any/all semantics as a batch node.
    nodes.push({
      id: uniqueId(step.id),
      type: "batch_approval",
      title: String(step.title),
      scope,
      completion: step.completion === "all" ? "all" : "any",
    })
  }
  return { version: 2, nodes }
}

function snapshotDefinition(form: any): OAWorkflowDefinition {
  if (form?.workflowDefinition?.version === 2 && Array.isArray(form.workflowDefinition.nodes)) {
    return {
      version: 2,
      nodes: form.workflowDefinition.nodes.map((node: any) => ({
        ...node,
        id: String(node.id),
        title: String(node.title),
        ...(node.scope ? { scope: snapshotScope(node.scope) } : {}),
      })),
    }
  }
  return adaptLegacyOAWorkflow(snapshotSteps(form?.approvalSteps || []))
}

function workflowDefinition(form: any, submission: any): OAWorkflowDefinition {
  if (submission?.workflowDefinitionSnapshot?.version === 2) return submission.workflowDefinitionSnapshot
  return snapshotDefinition(form)
}

function workflowNodeForTask(form: any, submission: any, task: any) {
  const definition = workflowDefinition(form, submission)
  const node = definition.nodes[task.stepIndex]
  return node && node.id === task.stepId ? node : undefined
}

function stepPolicy(node: OAWorkflowNode) {
  return node.type === "batch_approval" && node.completion === "all" ? "all" : "any"
}

/** A configured scope is a union. An explicit empty scope means all AIA accounts. */
export function userMatchesOAUserScope(user: any, scope?: OAUserScope, researchGroupId?: unknown, userGroupIdsOfUser?: ReadonlySet<string>) {
  if (!scope) return false
  const userIds = new Set((scope.userIds || []).map(normalizedId))
  const identityTypes = new Set((scope.identityTypes || []).map(String))
  const roles = new Set((scope.roles || []).map(String))
  const researchGroupIds = new Set((scope.researchGroupIds || []).map(normalizedId))
  const userGroupIds = new Set((scope.userGroupIds || []).map(normalizedId))
  if (userIds.size === 0 && identityTypes.size === 0 && roles.size === 0 && researchGroupIds.size === 0 && userGroupIds.size === 0) return true
  const inUserGroup = userGroupIdsOfUser !== undefined
    && [...userGroupIds].some((groupId) => userGroupIdsOfUser.has(groupId))
  return userIds.has(normalizedId(user._id))
    || identityTypes.has(resolveUserIdentityType(user))
    || roles.has(String(user.role))
    || (researchGroupId !== undefined && researchGroupIds.has(normalizedId(researchGroupId)))
    || inUserGroup
}

export async function loadOAUserScopeContext(ctx: any, userId: unknown) {
  const assignment = await ctx.db
    .query("studentResearchGroupAssignments")
    .withIndex("by_studentUserId", (q: any) => q.eq("studentUserId", userId))
    .first()
  const memberships = await ctx.db
    .query("userGroupMemberships")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .collect()
  return {
    researchGroupId: assignment?.researchGroupId,
    userGroupIds: new Set(memberships.map((membership: any) => normalizedId(membership.groupId))),
  }
}

/** Resolves scopes at node activation, never at editor render time. */
export async function resolveOAWorkflowRecipients(ctx: any, scope: OAUserScope) {
  const users = await ctx.db.query("users").collect()
  const assignments = await ctx.db.query("studentResearchGroupAssignments").collect()
  const groupByStudentId = new Map(assignments.map((assignment: any) => [normalizedId(assignment.studentUserId), assignment.researchGroupId]))
  const memberships = await ctx.db.query("userGroupMemberships").collect()
  const groupsByUserId = new Map<string, Set<string>>()
  for (const membership of memberships as any[]) {
    const key = normalizedId(membership.userId)
    if (!groupsByUserId.has(key)) groupsByUserId.set(key, new Set())
    groupsByUserId.get(key)!.add(normalizedId(membership.groupId))
  }
  return users
    .filter((user: any) =>
      user.accountStatus !== "disabled"
      && userMatchesOAUserScope(
        user,
        scope,
        groupByStudentId.get(normalizedId(user._id)),
        groupsByUserId.get(normalizedId(user._id)),
      ))
    .sort((left: any, right: any) => normalizedId(left._id).localeCompare(normalizedId(right._id)))
}

export function hasOAWorkflow(form: any) {
  return (form?.workflowDefinition?.version === 2 && form.workflowDefinition.nodes?.length > 0)
    || (Array.isArray(form?.approvalSteps) && form.approvalSteps.length > 0)
}

async function appendOAWorkflowEvent(ctx: any, input: {
  submissionId: any
  formId: any
  stepIndex?: number
  stepId?: string
  nodeType?: string
  workflowVersion?: number
  actorUserId?: any
  action: OAEventAction
  comment?: string
  createdAt: number
}) {
  await ctx.db.insert("oaApprovalEvents", {
    submissionId: input.submissionId,
    formId: input.formId,
    ...(input.stepIndex !== undefined ? { stepIndex: input.stepIndex } : {}),
    ...(input.stepId !== undefined ? { stepId: input.stepId } : {}),
    ...(input.nodeType !== undefined ? { nodeType: input.nodeType } : {}),
    ...(input.workflowVersion !== undefined ? { workflowVersion: input.workflowVersion } : {}),
    ...(input.actorUserId !== undefined ? { actorUserId: input.actorUserId } : {}),
    action: input.action,
    ...(input.comment ? { comment: input.comment } : {}),
    createdAt: input.createdAt,
  })
}

export async function notifyOAWorkflowRecipients(ctx: any, input: {
  recipientUserIds: readonly unknown[]
  submissionId: any
  title: string
  body: string
  createdAt: number
  naturalKey: string
}) {
  const uniqueRecipientIds = [...new Set(input.recipientUserIds.map(normalizedId))]
  await Promise.all(uniqueRecipientIds.map(async (userId) => {
    const naturalKey = `${input.naturalKey}:${userId}`
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_naturalKey", (index: any) => index.eq("naturalKey", naturalKey))
      .first()
    if (existing) return
    await ctx.db.insert("notifications", {
      userId: userId as any,
      kind: "oa_workflow",
      title: input.title,
      body: input.body,
      resourceType: "oa_workflow",
      resourceId: input.submissionId,
      naturalKey,
      createdAt: input.createdAt,
    })
  }))
}

async function resolvePriorOAWorkflowReviewers(ctx: any, input: {
  submission: any
  nodeIndex: number
  workflowVersion: number
}) {
  const tasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (index: any) =>
      index.eq("submissionId", input.submission._id).eq("stepIndex", input.nodeIndex))
    .collect()
  const priorVersions = tasks
    .map((task: any) => task.workflowVersion ?? 1)
    .filter((version: number) => version < input.workflowVersion)
  if (priorVersions.length === 0) return []
  const priorVersion = Math.max(...priorVersions)
  const priorReviewerIds = [...new Set(tasks
    .filter((task: any) => (task.workflowVersion ?? 1) === priorVersion)
    .map((task: any) => normalizedId(task.userId)))]
  const reviewers = await Promise.all(priorReviewerIds.map((userId) => ctx.db.get(userId as any)))
  return reviewers
    .filter((user: any) => user && user.accountStatus !== "disabled")
    .sort((left: any, right: any) => normalizedId(left._id).localeCompare(normalizedId(right._id)))
}

async function resolveCurrentReimbursementReviewers(ctx: any) {
  const [permissions, users] = await Promise.all([
    ctx.db
      .query("contentPermissions")
      .withIndex("by_category_user", (index: any) => index.eq("category", "reimbursement"))
      .collect(),
    ctx.db.query("users").collect(),
  ])
  const managerIds = new Set(permissions
    .filter((permission: any) => permission.canManage === true)
    .map((permission: any) => normalizedId(permission.userId)))
  return users
    .filter((user: any) =>
      user.accountStatus !== "disabled"
      && managerIds.has(normalizedId(user._id)))
    .sort((left: any, right: any) => normalizedId(left._id).localeCompare(normalizedId(right._id)))
}

async function activateReviewNode(ctx: any, input: {
  form: any
  submission: any
  node: Extract<OAWorkflowNode, { type: "approval" | "batch_approval" }>
  nodeIndex: number
  now: number
  workflowVersion: number
}) {
  const formKind = input.form?.kind === "reimbursement" ? "reimbursement" : "form"
  const resolvedRecipients = formKind === "reimbursement"
    ? await resolveCurrentReimbursementReviewers(ctx)
    : input.workflowVersion > 1
      ? await resolvePriorOAWorkflowReviewers(ctx, input)
      : await resolveOAWorkflowRecipients(ctx, input.node.scope)
  const recipients = formKind === "reimbursement"
    ? resolvedRecipients
    : resolvedRecipients.filter(
      (recipient: any) => normalizedId(recipient._id) !== normalizedId(input.submission.submitterId),
    )
  if (input.node.type === "approval" && recipients.length !== 1) {
    throw new Error(`审批节点“${input.node.title}”必须恰好一名审批人`)
  }
  if (input.node.type === "batch_approval" && recipients.length < 1) {
    throw new Error(`批量审批节点“${input.node.title}”必须至少一名审批人`)
  }

  let created = 0
  for (const recipient of recipients) {
    const naturalKey = `oa:task:${normalizedId(input.submission._id)}:${input.node.id}:${input.workflowVersion}:${normalizedId(recipient._id)}`
    const existingByKey = await ctx.db
      .query("oaApprovalTasks")
      .withIndex("by_naturalKey", (index: any) => index.eq("naturalKey", naturalKey))
      .first()
    if (existingByKey) continue
    const legacyDuplicates = await ctx.db
      .query("oaApprovalTasks")
      .withIndex("by_submission_step", (index: any) => index.eq("submissionId", input.submission._id).eq("stepIndex", input.nodeIndex))
      .collect()
    if (legacyDuplicates.some((task: any) =>
      normalizedId(task.userId) === normalizedId(recipient._id)
      && (task.workflowVersion ?? 1) === input.workflowVersion)) continue
    await ctx.db.insert("oaApprovalTasks", {
      submissionId: input.submission._id,
      formId: input.form._id,
      stepIndex: input.nodeIndex,
      stepId: input.node.id,
      userId: recipient._id,
      status: "pending",
      workflowVersion: input.workflowVersion,
      naturalKey,
      createdAt: input.now,
      updatedAt: input.now,
    })
    created += 1
  }
  await appendOAWorkflowEvent(ctx, {
    submissionId: input.submission._id,
    formId: input.form._id,
    stepIndex: input.nodeIndex,
    stepId: input.node.id,
    nodeType: input.node.type,
    workflowVersion: input.workflowVersion,
    action: "step_started",
    createdAt: input.now,
  })
  await notifyOAWorkflowRecipients(ctx, {
    recipientUserIds: recipients.map((recipient: any) => recipient._id),
    submissionId: input.submission._id,
    title: `待审批：${input.form.title}`,
    body: `“${input.form.title}”有一项待处理的 OA 审批。`,
    createdAt: input.now,
    naturalKey: `oa:${normalizedId(input.submission._id)}:node:${input.node.id}:version:${input.workflowVersion}`,
  })
  return { created: created > 0, recipientCount: recipients.length }
}

async function pauseWorkflow(ctx: any, input: {
  form: any
  submission: any
  node: OAWorkflowNode
  nodeIndex: number
  workflowVersion: number
  message: string
  now: number
}) {
  await ctx.db.patch(input.submission._id, {
    workflowError: input.message,
    currentWorkflowNodeIndex: input.nodeIndex,
    currentApprovalStep: input.nodeIndex,
    updatedAt: input.now,
  })
  await appendOAWorkflowEvent(ctx, {
    submissionId: input.submission._id,
    formId: input.form._id,
    stepIndex: input.nodeIndex,
    stepId: input.node.id,
    nodeType: input.node.type,
    workflowVersion: input.workflowVersion,
    action: "workflow_paused",
    comment: input.message,
    createdAt: input.now,
  })
  return { blocked: true, reason: "workflow_paused" as const, workflowError: input.message }
}

/**
 * Executes create/fill/notification nodes synchronously and in order. A review
 * node creates its immutable task set and blocks. Retrying the function is safe
 * because tasks, grants, and notifications all use deterministic natural keys.
 */
export async function runWorkflowUntilBlocked(ctx: any, input: {
  form: any
  submission: any
  startNodeIndex: number
  now: number
  workflowVersion: number
}) {
  const definition = workflowDefinition(input.form, input.submission)
  for (let nodeIndex = input.startNodeIndex; nodeIndex < definition.nodes.length; nodeIndex += 1) {
    const node = definition.nodes[nodeIndex]
    await ctx.db.patch(input.submission._id, {
      currentWorkflowNodeIndex: nodeIndex,
      currentApprovalStep: nodeIndex,
      workflowError: undefined,
      updatedAt: input.now,
    })

    switch (node.type) {
      case "create_form":
        await appendOAWorkflowEvent(ctx, {
          submissionId: input.submission._id,
          formId: input.form._id,
          stepIndex: nodeIndex,
          stepId: node.id,
          nodeType: node.type,
          workflowVersion: input.workflowVersion,
          action: "step_completed",
          createdAt: input.now,
        })
        break

      case "fill_form": {
        const target = await ctx.db.get(node.targetFormId)
        if (!target || target.status !== "published" || target.visibility !== "members") {
          return await pauseWorkflow(ctx, {
            ...input,
            node,
            nodeIndex,
            message: `目标表单“${node.title}”不存在、未发布或已停用`,
          })
        }
        const naturalKey = `oa:grant:${normalizedId(input.submission._id)}:${node.id}:${input.workflowVersion}`
        const existing = await ctx.db
          .query("oaFormAccessGrants")
          .withIndex("by_naturalKey", (index: any) => index.eq("naturalKey", naturalKey))
          .first()
        if (!existing) {
          await ctx.db.insert("oaFormAccessGrants", {
            formId: target._id,
            userId: input.submission.submitterId,
            sourceSubmissionId: input.submission._id,
            nodeId: node.id,
            workflowVersion: input.workflowVersion,
            naturalKey,
            createdAt: input.now,
          })
          await appendOAWorkflowEvent(ctx, {
            submissionId: input.submission._id,
            formId: input.form._id,
            stepIndex: nodeIndex,
            stepId: node.id,
            nodeType: node.type,
            workflowVersion: input.workflowVersion,
            action: "form_access_granted",
            createdAt: input.now,
          })
        }
        break
      }

      case "notification": {
        const recipients = await resolveOAWorkflowRecipients(ctx, node.scope)
        if (recipients.length === 0) {
          return await pauseWorkflow(ctx, {
            ...input,
            node,
            nodeIndex,
            message: `通知节点“${node.title}”没有可用接收人`,
          })
        }
        await notifyOAWorkflowRecipients(ctx, {
          recipientUserIds: recipients.map((recipient: any) => recipient._id),
          submissionId: input.submission._id,
          title: node.title,
          body: node.message,
          createdAt: input.now,
          naturalKey: `oa:${normalizedId(input.submission._id)}:notification:${node.id}:version:${input.workflowVersion}`,
        })
        await appendOAWorkflowEvent(ctx, {
          submissionId: input.submission._id,
          formId: input.form._id,
          stepIndex: nodeIndex,
          stepId: node.id,
          nodeType: node.type,
          workflowVersion: input.workflowVersion,
          action: "notification_sent",
          createdAt: input.now,
        })
        break
      }

      case "approval":
      case "batch_approval": {
        try {
          const activation = await activateReviewNode(ctx, {
            form: input.form,
            submission: input.submission,
            node,
            nodeIndex,
            now: input.now,
            workflowVersion: input.workflowVersion,
          })
          return { blocked: true, reason: "approval" as const, nodeIndex, ...activation }
        } catch (error) {
          return await pauseWorkflow(ctx, {
            ...input,
            node,
            nodeIndex,
            message: error instanceof Error ? error.message : "审批节点无法激活",
          })
        }
      }
    }
  }

  await completeOAWorkflow(ctx, {
    form: input.form,
    submission: { ...input.submission, workflowVersion: input.workflowVersion },
    outcome: "approved",
    stepIndex: Math.max(0, definition.nodes.length - 1),
    stepId: definition.nodes.at(-1)?.id || "create_form",
    nodeType: definition.nodes.at(-1)?.type,
    now: input.now,
  })
  return { blocked: false, workflowStatus: "approved" as const }
}

export async function startOAWorkflow(ctx: any, input: {
  form: any
  submission: any
  now: number
}) {
  if (!hasOAWorkflow(input.form)) return { started: false }
  if (input.submission.workflowDefinitionSnapshot || input.submission.workflowStartedAt) {
    return { started: true, created: false }
  }
  const definition = snapshotDefinition(input.form)
  const legacySteps = snapshotSteps(input.form.approvalSteps || [])
  const workflowVersion = 1
  await ctx.db.patch(input.submission._id, {
    workflowStatus: "pending",
    currentApprovalStep: 0,
    currentWorkflowNodeIndex: 0,
    approvalStepsSnapshot: legacySteps.length ? legacySteps : undefined,
    workflowDefinitionSnapshot: definition,
    workflowStartedAt: input.now,
    workflowVersion,
    workflowError: undefined,
    updatedAt: input.now,
  })
  const submission = {
    ...input.submission,
    workflowDefinitionSnapshot: definition,
    approvalStepsSnapshot: legacySteps,
    workflowVersion,
  }
  await appendOAWorkflowEvent(ctx, {
    submissionId: input.submission._id,
    formId: input.form._id,
    workflowVersion,
    action: "workflow_started",
    createdAt: input.now,
  })
  const result = await runWorkflowUntilBlocked(ctx, {
    form: input.form,
    submission,
    startNodeIndex: 0,
    now: input.now,
    workflowVersion,
  })
  return { started: true, ...result }
}

async function markRemainingStepTasksSkipped(ctx: any, input: {
  tasks: any[]
  exceptTaskId?: any
  now: number
}) {
  await Promise.all(input.tasks
    .filter((task) => task.status === "pending" && (!input.exceptTaskId || normalizedId(task._id) !== normalizedId(input.exceptTaskId)))
    .map((task) => ctx.db.patch(task._id, { status: "skipped", actedAt: input.now, updatedAt: input.now })))
}

async function completeOAWorkflow(ctx: any, input: {
  form: any
  submission: any
  outcome: "approved" | "rejected"
  actorUserId?: any
  stepIndex: number
  stepId: string
  nodeType?: string
  comment?: string
  now: number
}) {
  const workflowVersion = input.submission.workflowVersion ?? 1
  await ctx.db.patch(input.submission._id, {
    reviewStatus: input.outcome,
    workflowStatus: input.outcome,
    workflowError: undefined,
    workflowCompletedAt: input.now,
    updatedAt: input.now,
  })
  await appendOAWorkflowEvent(ctx, {
    submissionId: input.submission._id,
    formId: input.form._id,
    stepIndex: input.stepIndex,
    stepId: input.stepId,
    nodeType: input.nodeType,
    workflowVersion,
    ...(input.actorUserId !== undefined ? { actorUserId: input.actorUserId } : {}),
    action: input.outcome === "approved" ? "workflow_approved" : "workflow_rejected",
    comment: input.comment,
    createdAt: input.now,
  })
  await notifyOAWorkflowRecipients(ctx, {
    recipientUserIds: [input.submission.submitterId],
    submissionId: input.submission._id,
    title: `OA ${input.outcome === "approved" ? "已通过" : "已驳回"}`,
    body: `您提交的“${input.form.title}”${input.outcome === "approved" ? "已完成全部审批" : "未获批准"}。`,
    createdAt: input.now,
    naturalKey: `oa:${normalizedId(input.submission._id)}:complete:${input.outcome}:version:${workflowVersion}`,
  })
}

/** Restarts the same logical node and preserves the earlier deferred history. */
export async function resumeOAWorkflow(ctx: any, input: {
  form: any
  submission: any
  actorUserId: any
  now: number
}) {
  const current = await ctx.db.get(input.submission._id)
  if (!current || current.workflowStatus !== "needs_changes") {
    throw new Error("OA_WORKFLOW_NOT_WAITING_FOR_CHANGES")
  }
  const definition = workflowDefinition(input.form, current)
  const nodeIndex = current.currentWorkflowNodeIndex ?? current.currentApprovalStep
  const node = definition.nodes[nodeIndex]
  if (!node || (node.type !== "approval" && node.type !== "batch_approval")) {
    throw new Error("审批流程节点配置无效")
  }
  const workflowVersion = (current.workflowVersion ?? 1) + 1
  await ctx.db.patch(current._id, {
    reviewStatus: "pending",
    workflowStatus: "pending",
    workflowVersion,
    workflowError: undefined,
    workflowCompletedAt: undefined,
    updatedAt: input.now,
  })
  await appendOAWorkflowEvent(ctx, {
    submissionId: current._id,
    formId: input.form._id,
    stepIndex: nodeIndex,
    stepId: node.id,
    nodeType: node.type,
    workflowVersion,
    actorUserId: input.actorUserId,
    action: "resubmitted",
    createdAt: input.now,
  })
  return await runWorkflowUntilBlocked(ctx, {
    form: input.form,
    submission: { ...current, workflowVersion },
    startNodeIndex: nodeIndex,
    now: input.now,
    workflowVersion,
  })
}

export async function advanceOAWorkflow(ctx: any, input: {
  form: any
  submission: any
  task: any
  actor: any
  action: OAWorkflowAction
  comment?: string
  now: number
  expectedVersion?: number
}) {
  const submission = await ctx.db.get(input.submission._id)
  if (!submission || submission.workflowStatus !== "pending") return { advanced: false, reason: "workflow_not_pending" }
  const workflowVersion = submission.workflowVersion ?? 1
  if (input.expectedVersion !== undefined && input.expectedVersion !== workflowVersion) {
    throw new Error("OA_WORKFLOW_VERSION_CONFLICT")
  }
  if ((input.task.workflowVersion ?? 1) !== workflowVersion) return { advanced: false, reason: "task_version_stale" }
  const currentNodeIndex = submission.currentWorkflowNodeIndex ?? submission.currentApprovalStep
  if (currentNodeIndex !== input.task.stepIndex) return { advanced: false, reason: "task_not_current" }
  const node = workflowNodeForTask(input.form, submission, input.task)
  if (!node || (node.type !== "approval" && node.type !== "batch_approval")) {
    throw new Error("审批任务与流程节点不一致")
  }

  const comment = normalizedComment(input.comment)
  const allStepTasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (index: any) => index.eq("submissionId", submission._id).eq("stepIndex", input.task.stepIndex))
    .collect()
  const currentStepTasks = allStepTasks.filter((task: any) => (task.workflowVersion ?? 1) === workflowVersion)

  if (input.action === "request_changes") {
    if (!comment) throw new Error("OA_REQUEST_CHANGES_COMMENT_REQUIRED")
    await ctx.db.patch(input.task._id, { status: "changes_requested", actedAt: input.now, comment, updatedAt: input.now })
    await markRemainingStepTasksSkipped(ctx, { tasks: currentStepTasks, exceptTaskId: input.task._id, now: input.now })
    await ctx.db.patch(submission._id, {
      reviewStatus: "needs_changes",
      workflowStatus: "needs_changes",
      adminNote: comment,
      updatedAt: input.now,
    })
    for (const action of ["changes_requested", "workflow_changes_requested"] as const) {
      await appendOAWorkflowEvent(ctx, {
        submissionId: submission._id,
        formId: input.form._id,
        stepIndex: input.task.stepIndex,
        stepId: node.id,
        nodeType: node.type,
        workflowVersion,
        actorUserId: input.actor._id,
        action,
        comment,
        createdAt: input.now,
      })
    }
    await notifyOAWorkflowRecipients(ctx, {
      recipientUserIds: [submission.submitterId],
      submissionId: submission._id,
      title: "OA 需要补充材料",
      body: `您提交的“${input.form.title}”需要补充材料后重新提交。`,
      createdAt: input.now,
      naturalKey: `oa:${normalizedId(submission._id)}:changes-requested:version:${workflowVersion}`,
    })
    return { advanced: true, workflowStatus: "needs_changes" as const }
  }

  if (input.action === "reject") {
    await ctx.db.patch(input.task._id, {
      status: "rejected",
      actedAt: input.now,
      ...(comment ? { comment } : {}),
      updatedAt: input.now,
    })
    await appendOAWorkflowEvent(ctx, {
      submissionId: submission._id,
      formId: input.form._id,
      stepIndex: input.task.stepIndex,
      stepId: node.id,
      nodeType: node.type,
      workflowVersion,
      actorUserId: input.actor._id,
      action: "rejected",
      comment,
      createdAt: input.now,
    })
    await markRemainingStepTasksSkipped(ctx, { tasks: currentStepTasks, exceptTaskId: input.task._id, now: input.now })
    await completeOAWorkflow(ctx, {
      form: input.form,
      submission,
      outcome: "rejected",
      actorUserId: input.actor._id,
      stepIndex: input.task.stepIndex,
      stepId: node.id,
      nodeType: node.type,
      comment,
      now: input.now,
    })
    return { advanced: true, workflowStatus: "rejected" as const }
  }

  await ctx.db.patch(input.task._id, {
    status: "approved",
    actedAt: input.now,
    ...(comment ? { comment } : {}),
    updatedAt: input.now,
  })
  await appendOAWorkflowEvent(ctx, {
    submissionId: submission._id,
    formId: input.form._id,
    stepIndex: input.task.stepIndex,
    stepId: node.id,
    nodeType: node.type,
    workflowVersion,
    actorUserId: input.actor._id,
    action: "approved",
    comment,
    createdAt: input.now,
  })

  const siblingsApproved = currentStepTasks
    .filter((task: any) => normalizedId(task._id) !== normalizedId(input.task._id))
    .every((task: any) => task.status === "approved")
  if (stepPolicy(node) === "all" && !siblingsApproved) {
    return { advanced: false, reason: "awaiting_other_approvers" }
  }

  await markRemainingStepTasksSkipped(ctx, { tasks: currentStepTasks, exceptTaskId: input.task._id, now: input.now })
  await appendOAWorkflowEvent(ctx, {
    submissionId: submission._id,
    formId: input.form._id,
    stepIndex: input.task.stepIndex,
    stepId: node.id,
    nodeType: node.type,
    workflowVersion,
    actorUserId: input.actor._id,
    action: "step_completed",
    createdAt: input.now,
  })
  const nextNodeIndex = input.task.stepIndex + 1
  const result = await runWorkflowUntilBlocked(ctx, {
    form: input.form,
    submission,
    startNodeIndex: nextNodeIndex,
    now: input.now,
    workflowVersion,
  })
  return {
    advanced: true,
    workflowStatus: ("workflowStatus" in result ? result.workflowStatus : undefined) || "pending" as const,
    nextStepIndex: nextNodeIndex,
    ...result,
  }
}
