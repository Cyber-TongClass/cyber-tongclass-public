import { resolveUserIdentityType } from "./userIdentity"

type OAUserScope = {
  identityTypes?: readonly string[]
  roles?: readonly string[]
  userIds?: readonly unknown[]
  researchGroupIds?: readonly unknown[]
}

type OAApprovalStep = {
  id: string
  title: string
  scope: OAUserScope
  completion?: "any" | "all"
}

type OAWorkflowAction = "approve" | "reject" | "request_changes"

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

function workflowSteps(form: any, submission: any): OAApprovalStep[] {
  const candidate = Array.isArray(submission?.approvalStepsSnapshot)
    ? submission.approvalStepsSnapshot
    : form?.approvalSteps
  return Array.isArray(candidate) ? candidate as OAApprovalStep[] : []
}

function stepPolicy(step: OAApprovalStep) {
  return step.completion === "all" ? "all" : "any"
}

/** A configured scope is a union. An explicit empty scope means all AIA accounts. */
export function userMatchesOAUserScope(user: any, scope?: OAUserScope, researchGroupId?: unknown) {
  if (!scope) return false

  const userIds = new Set((scope.userIds || []).map(normalizedId))
  const identityTypes = new Set((scope.identityTypes || []).map(String))
  const roles = new Set((scope.roles || []).map(String))
  const researchGroupIds = new Set((scope.researchGroupIds || []).map(normalizedId))
  if (userIds.size === 0 && identityTypes.size === 0 && roles.size === 0 && researchGroupIds.size === 0) return true

  return userIds.has(normalizedId(user._id))
    || identityTypes.has(resolveUserIdentityType(user))
    || roles.has(String(user.role))
    || (researchGroupId !== undefined && researchGroupIds.has(normalizedId(researchGroupId)))
}

/** Resolves recipients on the server; callers never supply a recipient list. */
export async function resolveOAWorkflowRecipients(ctx: any, scope: OAUserScope) {
  const users = await ctx.db.query("users").collect()
  const assignments = await ctx.db.query("studentResearchGroupAssignments").collect()
  const groupByStudentId = new Map(assignments.map((assignment: any) => [normalizedId(assignment.studentUserId), assignment.researchGroupId]))
  return users
    .filter((user: any) => userMatchesOAUserScope(user, scope, groupByStudentId.get(normalizedId(user._id))))
    .sort((left: any, right: any) => normalizedId(left._id).localeCompare(normalizedId(right._id)))
}

export function hasOAWorkflow(form: any) {
  return Array.isArray(form?.approvalSteps) && form.approvalSteps.length > 0
}

async function appendOAWorkflowEvent(ctx: any, input: {
  submissionId: any
  formId: any
  stepIndex?: number
  stepId?: string
  actorUserId?: any
  action: "workflow_started" | "step_started" | "approved" | "rejected" | "step_completed" | "workflow_approved" | "workflow_rejected" | "changes_requested" | "workflow_changes_requested" | "resubmitted"
  comment?: string
  createdAt: number
}) {
  await ctx.db.insert("oaApprovalEvents", {
    submissionId: input.submissionId,
    formId: input.formId,
    ...(input.stepIndex !== undefined ? { stepIndex: input.stepIndex } : {}),
    ...(input.stepId !== undefined ? { stepId: input.stepId } : {}),
    ...(input.actorUserId !== undefined ? { actorUserId: input.actorUserId } : {}),
    action: input.action,
    ...(input.comment ? { comment: input.comment } : {}),
    createdAt: input.createdAt,
  })
}

/** Inserts a generic, data-minimized notification row for each unique recipient. */
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

async function activateOAWorkflowStep(ctx: any, input: {
  form: any
  submission: any
  steps: OAApprovalStep[]
  stepIndex: number
  now: number
  workflowVersion?: number
}) {
  const step = input.steps[input.stepIndex]
  if (!step) throw new Error("审批流程步骤配置无效")

  const existingTasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (index: any) => index.eq("submissionId", input.submission._id).eq("stepIndex", input.stepIndex))
    .collect()
  const workflowVersion = input.workflowVersion ?? input.submission.workflowVersion ?? 1
  const currentTasks = existingTasks.filter((task: any) => (task.workflowVersion ?? 1) === workflowVersion)
  if (currentTasks.length > 0) return { created: false, recipientCount: currentTasks.length }

  const recipients = await resolveOAWorkflowRecipients(ctx, step.scope)
  if (recipients.length === 0) {
    throw new Error(`审批步骤“${step.title}”没有可用审批人`)
  }

  await Promise.all(recipients.map((recipient: any) => ctx.db.insert("oaApprovalTasks", {
    submissionId: input.submission._id,
    formId: input.form._id,
    stepIndex: input.stepIndex,
    stepId: step.id,
    userId: recipient._id,
    status: "pending",
    workflowVersion,
    createdAt: input.now,
    updatedAt: input.now,
  })))

  await appendOAWorkflowEvent(ctx, {
    submissionId: input.submission._id,
    formId: input.form._id,
    stepIndex: input.stepIndex,
    stepId: step.id,
    action: "step_started",
    createdAt: input.now,
  })
  await notifyOAWorkflowRecipients(ctx, {
    recipientUserIds: recipients.map((recipient: any) => recipient._id),
    submissionId: input.submission._id,
    title: `待审批：${input.form.title}`,
    body: `“${input.form.title}”有一项待处理的 OA 审批。`,
    createdAt: input.now,
    naturalKey: `oa:${String(input.submission._id)}:step:${input.stepIndex}:version:${workflowVersion}`,
  })

  return { created: true, recipientCount: recipients.length }
}

/**
 * Starts a configured workflow immediately after the submission is created.
 * Convex mutations are transactional, so an empty first approver scope rolls
 * back the submission instead of leaving an unactionable pending record.
 */
export async function startOAWorkflow(ctx: any, input: {
  form: any
  submission: any
  now: number
}) {
  if (!hasOAWorkflow(input.form)) return { started: false }

  const existingTasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (index: any) => index.eq("submissionId", input.submission._id).eq("stepIndex", 0))
    .collect()
  if (existingTasks.length > 0) return { started: true, created: false }

  const steps = snapshotSteps(input.form.approvalSteps as OAApprovalStep[])
  await ctx.db.patch(input.submission._id, {
    workflowStatus: "pending",
    currentApprovalStep: 0,
    approvalStepsSnapshot: steps,
    workflowStartedAt: input.now,
    workflowVersion: 1,
    updatedAt: input.now,
  })
  const pendingSubmission = { ...input.submission, approvalStepsSnapshot: steps }
  await appendOAWorkflowEvent(ctx, {
    submissionId: input.submission._id,
    formId: input.form._id,
    action: "workflow_started",
    createdAt: input.now,
  })
  const activation = await activateOAWorkflowStep(ctx, {
    form: input.form,
    submission: pendingSubmission,
    steps,
    stepIndex: 0,
    now: input.now,
    workflowVersion: 1,
  })
  return { started: true, ...activation }
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
  comment?: string
  now: number
}) {
  await ctx.db.patch(input.submission._id, {
    reviewStatus: input.outcome,
    workflowStatus: input.outcome,
    workflowCompletedAt: input.now,
    updatedAt: input.now,
  })
  await appendOAWorkflowEvent(ctx, {
    submissionId: input.submission._id,
    formId: input.form._id,
    stepIndex: input.stepIndex,
    stepId: input.stepId,
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
    naturalKey: `oa:${String(input.submission._id)}:complete:${input.outcome}:version:${input.submission.workflowVersion ?? 1}`,
  })
}

/** Restarts the same immutable approval step after the submitter supplies changes. */
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
  const steps = workflowSteps(input.form, current)
  const stepIndex = current.currentApprovalStep
  const step = steps[stepIndex]
  if (!step) throw new Error("审批流程步骤配置无效")
  const workflowVersion = (current.workflowVersion ?? 1) + 1
  await ctx.db.patch(current._id, {
    reviewStatus: "pending",
    workflowStatus: "pending",
    workflowVersion,
    workflowCompletedAt: undefined,
    updatedAt: input.now,
  })
  await appendOAWorkflowEvent(ctx, {
    submissionId: current._id,
    formId: input.form._id,
    stepIndex,
    stepId: step.id,
    actorUserId: input.actorUserId,
    action: "resubmitted",
    createdAt: input.now,
  })
  return await activateOAWorkflowStep(ctx, {
    form: input.form,
    submission: { ...current, workflowVersion },
    steps,
    stepIndex,
    now: input.now,
    workflowVersion,
  })
}

/**
 * Records an authorized approve/reject action and advances only the stored
 * current step. All assignee and state checks happen against persisted tasks.
 */
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
  if ((input.task.workflowVersion ?? 1) !== workflowVersion) {
    return { advanced: false, reason: "task_version_stale" }
  }
  if (submission.currentApprovalStep !== input.task.stepIndex) return { advanced: false, reason: "task_not_current" }

  const steps = workflowSteps(input.form, submission)
  const step = steps[input.task.stepIndex]
  if (!step || step.id !== input.task.stepId) throw new Error("审批任务与流程步骤不一致")

  const comment = normalizedComment(input.comment)
  const stepTasks = await ctx.db
    .query("oaApprovalTasks")
    .withIndex("by_submission_step", (index: any) => index.eq("submissionId", submission._id).eq("stepIndex", input.task.stepIndex))
    .collect()
  const currentStepTasks = stepTasks.filter((task: any) => (task.workflowVersion ?? 1) === workflowVersion)

  if (input.action === "request_changes") {
    if (!comment) throw new Error("OA_REQUEST_CHANGES_COMMENT_REQUIRED")
    await ctx.db.patch(input.task._id, {
      status: "changes_requested",
      actedAt: input.now,
      comment,
      updatedAt: input.now,
    })
    await markRemainingStepTasksSkipped(ctx, {
      tasks: currentStepTasks,
      exceptTaskId: input.task._id,
      now: input.now,
    })
    await ctx.db.patch(submission._id, {
      reviewStatus: "needs_changes",
      workflowStatus: "needs_changes",
      adminNote: comment,
      updatedAt: input.now,
    })
    await appendOAWorkflowEvent(ctx, {
      submissionId: submission._id,
      formId: input.form._id,
      stepIndex: input.task.stepIndex,
      stepId: input.task.stepId,
      actorUserId: input.actor._id,
      action: "changes_requested",
      comment,
      createdAt: input.now,
    })
    await appendOAWorkflowEvent(ctx, {
      submissionId: submission._id,
      formId: input.form._id,
      stepIndex: input.task.stepIndex,
      stepId: input.task.stepId,
      actorUserId: input.actor._id,
      action: "workflow_changes_requested",
      comment,
      createdAt: input.now,
    })
    await notifyOAWorkflowRecipients(ctx, {
      recipientUserIds: [submission.submitterId],
      submissionId: submission._id,
      title: "OA 需要补充材料",
      body: `您提交的“${input.form.title}”需要补充材料后重新提交。`,
      createdAt: input.now,
      naturalKey: `oa:${String(submission._id)}:changes-requested:version:${workflowVersion}`,
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
      stepId: input.task.stepId,
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
      stepId: input.task.stepId,
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
    stepId: input.task.stepId,
    actorUserId: input.actor._id,
    action: "approved",
    comment,
    createdAt: input.now,
  })

  const allOtherTasksApproved = currentStepTasks
    .filter((task: any) => normalizedId(task._id) !== normalizedId(input.task._id))
    .every((task: any) => task.status === "approved")
  const isStepComplete = stepPolicy(step) === "any" || allOtherTasksApproved
  if (!isStepComplete) return { advanced: false, reason: "awaiting_other_approvers" }

  await markRemainingStepTasksSkipped(ctx, { tasks: currentStepTasks, exceptTaskId: input.task._id, now: input.now })
  await appendOAWorkflowEvent(ctx, {
    submissionId: submission._id,
    formId: input.form._id,
    stepIndex: input.task.stepIndex,
    stepId: input.task.stepId,
    actorUserId: input.actor._id,
    action: "step_completed",
    createdAt: input.now,
  })

  const nextStepIndex = input.task.stepIndex + 1
  if (nextStepIndex >= steps.length) {
    await completeOAWorkflow(ctx, {
      form: input.form,
      submission,
      outcome: "approved",
      actorUserId: input.actor._id,
      stepIndex: input.task.stepIndex,
      stepId: input.task.stepId,
      comment,
      now: input.now,
    })
    return { advanced: true, workflowStatus: "approved" as const }
  }

  await ctx.db.patch(submission._id, {
    currentApprovalStep: nextStepIndex,
    updatedAt: input.now,
  })
  const activation = await activateOAWorkflowStep(ctx, {
    form: input.form,
    submission,
    steps,
    stepIndex: nextStepIndex,
    now: input.now,
    workflowVersion,
  })
  return { advanced: true, workflowStatus: "pending" as const, nextStepIndex, ...activation }
}
