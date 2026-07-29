import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import {
  allowedCoffeeTalkActions,
  coffeeTalkNotificationContent,
  redactCoffeeTalkForTeacher,
  requestFingerprint,
  transitionCoffeeTalk,
  type CoffeeTalkAction,
  type CoffeeTalkStatus,
} from "./lib/coffeeTalk"
import { resolveCoffeeTalkActorKind } from "./lib/coffeeTalkAuthorization"
import {
  deriveCoffeeTalkApplicantProfile,
  type CoffeeTalkApplicantProfile,
} from "./lib/coffeeTalkApplicantProfile"
import { normalizeCoffeeTalkSubmission } from "./lib/coffeeTalkSubmission"
import { getUserBySession } from "./reviewer/lib"

const COFFEE_TALK_VERSION_CONFLICT = "COFFEE_TALK_VERSION_CONFLICT"
const COFFEE_TALK_TEACHER_UNAVAILABLE = "COFFEE_TALK_TEACHER_UNAVAILABLE"
const COFFEE_TALK_ACTION_FORBIDDEN = "COFFEE_TALK_ACTION_FORBIDDEN"
const COFFEE_TALK_REASSIGNMENT_TARGET_REQUIRED = "COFFEE_TALK_REASSIGNMENT_TARGET_REQUIRED"
const COFFEE_TALK_APPLICANT_INELIGIBLE = "COFFEE_TALK_APPLICANT_INELIGIBLE"
const COFFEE_TALK_IDEMPOTENCY_CONFLICT = "COFFEE_TALK_IDEMPOTENCY_CONFLICT"
const COFFEE_TALK_RATE_LIMITED = "COFFEE_TALK_RATE_LIMITED"
const COFFEE_TALK_SUBMISSION_TOO_SOON = "COFFEE_TALK_SUBMISSION_TOO_SOON"
const COFFEE_TALK_APPLICANT_OPEN_LIMIT_REACHED = "COFFEE_TALK_APPLICANT_OPEN_LIMIT_REACHED"
const COFFEE_TALK_TEACHER_CAPACITY_REACHED = "COFFEE_TALK_TEACHER_CAPACITY_REACHED"
const COFFEE_TALK_ACTION_NOTE_REQUIRED = "COFFEE_TALK_ACTION_NOTE_REQUIRED"
const COFFEE_TALK_APPLICANT_OPEN_LIMIT = 3
const COFFEE_TALK_TEACHER_OPEN_LIMIT = 20
const COFFEE_TALK_SUBMISSION_INTERVAL_MS = 60_000

const coffeeTalkActionValidator = v.union(
  v.literal("start_review"),
  v.literal("accept"),
  v.literal("decline"),
  v.literal("withdraw"),
  v.literal("cancel"),
  v.literal("complete"),
  v.literal("reassign"),
  v.literal("correct"),
  v.literal("request_information"),
  v.literal("supplement"),
)

type StoredCoffeeTalkApplication = {
  _id: any
  applicantUserId: any
  assignedTeacherPersonId: any
  applicantName?: string
  applicantAffiliation?: string
  applicantIdentity?: "undergraduate" | "graduate" | "teacher" | "other"
  applicantEmail?: string
  topic: string
  purpose?: string
  researchBackground?: string
  expectedOutcome?: string
  preferredFormat?: "online" | "offline" | "either"
  availability: string
  notes?: string
  supplementalInformation?: string
  consentToShareProfile?: boolean
  idempotencyKey?: string
  requestPayloadFingerprint?: string
  status: CoffeeTalkStatus
  contentFingerprint: string
  version: number
  submittedAt: number
  statusChangedAt: number
  createdAt: number
  updatedAt: number
}

type StoredInstituteTeacher = {
  _id: any
  slug: string
  kind: "teacher" | "graduate"
  nameZh: string
  nameEn: string
  visibility: "public" | "hidden"
  coffeeTalkOpen?: boolean
  accountUserId?: any
}

function toApplicationId(application: StoredCoffeeTalkApplication): string {
  return String(application._id)
}

function toApplicantApplicationDto(
  application: StoredCoffeeTalkApplication,
  teacher: StoredInstituteTeacher | null,
  applicant: CoffeeTalkApplicantProfile | null,
  history: any[] = [],
) {
  return {
    id: toApplicationId(application),
    teacher: teacher
      ? {
        slug: teacher.slug,
        nameZh: teacher.nameZh,
        nameEn: teacher.nameEn,
      }
      : null,
    applicant,
    status: application.status,
    topic: application.topic,
    ...(application.purpose !== undefined ? { purpose: application.purpose } : {}),
    ...(application.researchBackground !== undefined ? { researchBackground: application.researchBackground } : {}),
    ...(application.expectedOutcome !== undefined ? { expectedOutcome: application.expectedOutcome } : {}),
    ...(application.preferredFormat !== undefined ? { preferredFormat: application.preferredFormat } : {}),
    availability: application.availability,
    ...(application.notes !== undefined ? { notes: application.notes } : {}),
    ...(application.supplementalInformation !== undefined
      ? { supplementalInformation: application.supplementalInformation }
      : {}),
    version: application.version,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    statusChangedAt: application.statusChangedAt,
    history,
    allowedActions: allowedCoffeeTalkActions(application.status, "applicant"),
  }
}

function toTeacherApplicationDto(
  application: StoredCoffeeTalkApplication,
  applicant: CoffeeTalkApplicantProfile | null,
  history: any[] = [],
  actorKind: "teacher" | "coordinator" = "teacher",
) {
  const redacted = redactCoffeeTalkForTeacher({
    status: application.status,
    topic: application.topic,
    contactSnapshot: applicant
      ? {
        displayName: applicant.applicantName,
        email: applicant.email,
      }
      : undefined,
    createdAt: application.createdAt,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    statusChangedAt: application.statusChangedAt,
    version: application.version,
  })

  return {
    id: toApplicationId(application),
    ...redacted,
    applicant: applicant
      ? {
        applicantName: applicant.applicantName,
        affiliation: applicant.affiliation,
        identity: applicant.identity,
        identityLabel: applicant.identityLabel,
      }
      : null,
    availability: application.availability,
    ...(application.purpose !== undefined ? { purpose: application.purpose } : {}),
    ...(application.researchBackground !== undefined ? { researchBackground: application.researchBackground } : {}),
    ...(application.expectedOutcome !== undefined ? { expectedOutcome: application.expectedOutcome } : {}),
    ...(application.preferredFormat !== undefined ? { preferredFormat: application.preferredFormat } : {}),
    ...(application.notes !== undefined ? { notes: application.notes } : {}),
    ...(application.supplementalInformation !== undefined
      ? { supplementalInformation: application.supplementalInformation }
      : {}),
    history,
    allowedActions: allowedCoffeeTalkActions(application.status, actorKind),
  }
}

const coffeeTalkEventActionLabels: Record<string, string> = {
  submitted: "提交申请",
  start_review: "开始审核",
  accept: "接受申请",
  decline: "婉拒申请",
  withdraw: "撤回申请",
  cancel: "取消申请",
  complete: "标记完成",
  reassign: "重新分配",
  correct: "更正记录",
  request_information: "请求补充材料",
  supplement: "提交补充材料",
}

const coffeeTalkActorLabels: Record<string, string> = {
  applicant: "申请人",
  teacher: "教师",
  coordinator: "协调员",
  system: "系统",
}

async function listCoffeeTalkHistory(ctx: any, applicationId: any) {
  const events = await ctx.db
    .query("coffeeTalkEvents")
    .withIndex("by_application_sequence", (index: any) => index.eq("applicationId", applicationId))
    .order("asc")
    .collect()
  return events.map((event: any) => ({
    id: String(event._id),
    sequenceNo: event.sequenceNo,
    actionLabel: coffeeTalkEventActionLabels[event.action] || "状态更新",
    occurredAt: event.createdAt,
    ...(event.fromStatus !== undefined ? { fromStatus: event.fromStatus } : {}),
    toStatus: event.toStatus,
    actorLabel: coffeeTalkActorLabels[event.actorKind] || "系统",
    ...(event.note ? { note: event.note } : {}),
  }))
}

async function getCurrentApplicantProfile(
  ctx: any,
  application: StoredCoffeeTalkApplication,
): Promise<CoffeeTalkApplicantProfile | null> {
  if (
    application.applicantName
    && application.applicantAffiliation
    && application.applicantIdentity
    && application.applicantEmail
  ) {
    const identityLabels = {
      undergraduate: "本科生",
      graduate: "研究生",
      teacher: "教师",
      other: "其他",
    } as const
    return {
      applicantName: application.applicantName,
      affiliation: application.applicantAffiliation as CoffeeTalkApplicantProfile["affiliation"],
      identity: application.applicantIdentity,
      identityLabel: identityLabels[application.applicantIdentity],
      email: application.applicantEmail,
    }
  }
  const applicant = await ctx.db.get(application.applicantUserId)
  if (!applicant) return null

  try {
    return deriveCoffeeTalkApplicantProfile(applicant)
  } catch {
    return null
  }
}

async function getAvailableTeacherBySlug(ctx: any, teacherSlug: string) {
  const teacher = await ctx.db
    .query("institutePeople")
    .withIndex("by_slug", (index: any) => index.eq("slug", teacherSlug))
    .first() as StoredInstituteTeacher | null

  if (
    !teacher
    || teacher.kind !== "teacher"
    || teacher.visibility !== "public"
    || teacher.coffeeTalkOpen !== true
    || teacher.accountUserId === undefined
  ) {
    throw new Error(COFFEE_TALK_TEACHER_UNAVAILABLE)
  }

  // Do not accept personal information for a stale directory binding. A
  // profile is not eligible until its explicitly linked institute account is
  // still present and able to receive/manage the application.
  const recipient = await ctx.db.get(teacher.accountUserId)
  if (!recipient) {
    throw new Error(COFFEE_TALK_TEACHER_UNAVAILABLE)
  }

  return teacher
}

async function appendCoffeeTalkEvent(
  ctx: any,
  input: {
    applicationId: any
    actorUserId?: any
    actorKind: "applicant" | "teacher" | "coordinator" | "system"
    action: "submitted" | CoffeeTalkAction
    fromStatus?: CoffeeTalkStatus
    toStatus: CoffeeTalkStatus
    createdAt: number
    note?: string
  },
) {
  const existingEvents = await ctx.db
    .query("coffeeTalkEvents")
    .withIndex("by_application_sequence", (index: any) => index.eq("applicationId", input.applicationId))
    .collect()
  const sequenceNo = existingEvents.reduce(
    (maximum: number, event: { sequenceNo: number }) => Math.max(maximum, event.sequenceNo),
    0,
  ) + 1

  await ctx.db.insert("coffeeTalkEvents", {
    applicationId: input.applicationId,
    ...(input.actorUserId !== undefined ? { actorUserId: input.actorUserId } : {}),
    actorKind: input.actorKind,
    action: input.action,
    ...(input.fromStatus !== undefined ? { fromStatus: input.fromStatus } : {}),
    toStatus: input.toStatus,
    ...(input.note !== undefined ? { note: input.note } : {}),
    sequenceNo,
    createdAt: input.createdAt,
  })
}

async function notifyCoffeeTalkRecipient(
  ctx: any,
  userId: any,
  applicationId: any,
  createdAt: number,
  status: CoffeeTalkStatus,
  naturalKey: string,
) {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_naturalKey", (index: any) => index.eq("naturalKey", naturalKey))
    .first()
  if (existing) return existing._id
  const statusLabels: Record<CoffeeTalkStatus, string> = {
    submitted: "已提交",
    under_review: "审核中",
    needs_information: "待补充材料",
    accepted: "已接受",
    declined: "未通过",
    withdrawn: "已撤回",
    cancelled: "已取消",
    completed: "已完成",
  }
  const notification = coffeeTalkNotificationContent()
  await ctx.db.insert("notifications", {
    userId,
    kind: "coffee_talk",
    title: `Coffee Talk · ${statusLabels[status]}`,
    body: `${notification.body} 当前状态：${statusLabels[status]}。`,
    resourceType: "coffee_talk",
    resourceId: applicationId,
    naturalKey,
    createdAt,
  })
}

type CoffeeTalkNotificationHref =
  | `/services/coffee-talk/my/${string}`
  | `/services/coffee-talk/manage/${string}`

/**
 * Resolves notification navigation solely from the notification recipient and
 * explicit application/teacher bindings. It deliberately falls back to the
 * applicant console rather than disclosing an unverified teacher console.
 */
async function coffeeTalkNotificationHref(
  ctx: any,
  recipientUserId: any,
  applicationId: any,
): Promise<CoffeeTalkNotificationHref> {
  const application = await ctx.db.get(applicationId) as StoredCoffeeTalkApplication | null
  if (!application || String(application.applicantUserId) === String(recipientUserId)) {
    return `/services/coffee-talk/my/${String(applicationId)}`
  }

  const teacher = await ctx.db.get(application.assignedTeacherPersonId) as StoredInstituteTeacher | null
  if (
    teacher?.kind === "teacher"
    && teacher.accountUserId !== undefined
    && String(teacher.accountUserId) === String(recipientUserId)
  ) {
    return `/services/coffee-talk/manage/${String(applicationId)}`
  }

  return `/services/coffee-talk/my/${String(applicationId)}`
}

/**
 * Creates an idempotent Coffee Talk application. The applicant and teacher
 * account relationship are always derived from the server, never accepted as
 * IDs or roles from the browser.
 */
export const submitApplication = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    teacherSlug: v.string(),
    topic: v.string(),
    purpose: v.string(),
    researchBackground: v.string(),
    expectedOutcome: v.string(),
    preferredFormat: v.union(v.literal("online"), v.literal("offline"), v.literal("either")),
    availability: v.string(),
    consentToShareProfile: v.boolean(),
    idempotencyKey: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const applicant = await getUserBySession(ctx, args.sessionToken)
    if (
      applicant.isEmailVerified !== true
      || (applicant.identityType !== "undergrad" && applicant.identityType !== "graduate")
    ) {
      throw new Error(COFFEE_TALK_APPLICANT_INELIGIBLE)
    }
    const applicantProfile = deriveCoffeeTalkApplicantProfile(applicant)
    const submission = normalizeCoffeeTalkSubmission(args)
    const teacher = await getAvailableTeacherBySlug(ctx, submission.teacherSlug)
    const fingerprint = await requestFingerprint({
      applicantUserId: String(applicant._id),
      idempotencyKey: submission.idempotencyKey,
    })
    const requestPayloadFingerprint = await requestFingerprint({
      assignedTeacherPersonId: String(teacher._id),
      submission,
    })

    const duplicate = await ctx.db
      .query("coffeeTalkApplications")
      .withIndex("by_applicant_fingerprint", (index: any) => (
        index.eq("applicantUserId", applicant._id).eq("contentFingerprint", fingerprint)
      ))
      .first() as StoredCoffeeTalkApplication | null

    if (duplicate) {
      if (
        duplicate.requestPayloadFingerprint
        && duplicate.requestPayloadFingerprint !== requestPayloadFingerprint
      ) {
        throw new Error(COFFEE_TALK_IDEMPOTENCY_CONFLICT)
      }
      return {
        applicationId: toApplicationId(duplicate),
        deduplicated: true,
      }
    }

    const now = Date.now()
    const [applicantApplications, teacherApplications] = await Promise.all([
      ctx.db
        .query("coffeeTalkApplications")
        .withIndex("by_applicant_updatedAt", (index: any) => index.eq("applicantUserId", applicant._id))
        .collect() as Promise<StoredCoffeeTalkApplication[]>,
      ctx.db
        .query("coffeeTalkApplications")
        .withIndex("by_teacher_updatedAt", (index: any) => index.eq("assignedTeacherPersonId", teacher._id))
        .collect() as Promise<StoredCoffeeTalkApplication[]>,
    ])
    const mostRecent = applicantApplications.reduce(
      (latest, application) => Math.max(latest, application.submittedAt),
      0,
    )
    if (now - mostRecent < COFFEE_TALK_SUBMISSION_INTERVAL_MS) {
      throw new Error(COFFEE_TALK_SUBMISSION_TOO_SOON)
    }
    if (applicantApplications.filter((application) => (
      !["declined", "withdrawn", "cancelled", "completed"].includes(application.status)
    )).length >= COFFEE_TALK_APPLICANT_OPEN_LIMIT) {
      throw new Error(COFFEE_TALK_APPLICANT_OPEN_LIMIT_REACHED)
    }
    if (teacherApplications.filter((application) => (
      !["declined", "withdrawn", "cancelled", "completed"].includes(application.status)
    )).length >= COFFEE_TALK_TEACHER_OPEN_LIMIT) {
      throw new Error(COFFEE_TALK_TEACHER_CAPACITY_REACHED)
    }
    const applicationId = await ctx.db.insert("coffeeTalkApplications", {
      applicantUserId: applicant._id,
      assignedTeacherPersonId: teacher._id,
      applicantName: applicantProfile.applicantName,
      applicantAffiliation: applicantProfile.affiliation,
      applicantIdentity: applicantProfile.identity,
      applicantEmail: applicantProfile.email,
      topic: submission.topic,
      purpose: submission.purpose,
      researchBackground: submission.researchBackground,
      expectedOutcome: submission.expectedOutcome,
      preferredFormat: submission.preferredFormat,
      availability: submission.availability,
      ...(submission.notes !== undefined ? { notes: submission.notes } : {}),
      consentToShareProfile: true,
      idempotencyKey: submission.idempotencyKey,
      requestPayloadFingerprint,
      status: "submitted",
      contentFingerprint: fingerprint,
      version: 1,
      submittedAt: now,
      statusChangedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    await appendCoffeeTalkEvent(ctx, {
      applicationId,
      actorUserId: applicant._id,
      actorKind: "applicant",
      action: "submitted",
      toStatus: "submitted",
      createdAt: now,
    })

    // A missing accountUserId means the public directory entry is not yet
    // explicitly linked to an institute login. No fallback name/email match is
    // attempted, and no notification is sent to an inferred recipient.
    if (teacher.accountUserId !== undefined) {
      await notifyCoffeeTalkRecipient(
        ctx,
        teacher.accountUserId,
        applicationId,
        now,
        "submitted",
        `coffee-talk:${String(applicationId)}:submitted`,
      )
    }

    return {
      applicationId: String(applicationId),
      deduplicated: false,
    }
  },
})

/** Returns the authenticated applicant's own data-minimized application list. */
export const listMine = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const applicant = await getUserBySession(ctx, args.sessionToken)
    const applications = await ctx.db
      .query("coffeeTalkApplications")
      .withIndex("by_applicant_updatedAt", (index: any) => index.eq("applicantUserId", applicant._id))
      .order("desc")
      .collect() as StoredCoffeeTalkApplication[]

    return Promise.all(applications.map(async (application) => {
      const [teacher, applicantProfile, history] = await Promise.all([
        ctx.db.get(application.assignedTeacherPersonId) as Promise<StoredInstituteTeacher | null>,
        getCurrentApplicantProfile(ctx, application),
        listCoffeeTalkHistory(ctx, application._id),
      ])
      return toApplicantApplicationDto(application, teacher, applicantProfile, history)
    }))
  },
})

async function hasCoffeeTalkCoordinatorAccess(ctx: any, actor: any) {
  if (actor.role === "super_admin") return true
  if (actor.role !== "admin") return false
  const grant = await ctx.db
    .query("accountCapabilities")
    .withIndex("by_user_capability", (index: any) => (
      index.eq("userId", actor._id).eq("capability", "coordinate_coffee_talk")
    ))
    .first()
  return grant?.enabled === true
}

export const getManageAccess = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    if (await hasCoffeeTalkCoordinatorAccess(ctx, actor)) return { mode: "coordinator" as const }
    const teacher = await ctx.db
      .query("institutePeople")
      .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", actor._id))
      .first()
    return teacher?.kind === "teacher" ? { mode: "teacher" as const } : { mode: "none" as const }
  },
})

/**
 * Lists applications only for teacher records explicitly bound to the current
 * main-site account. The directory binding is the sole source of authority.
 */
export const listForTeacher = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const coordinatorAllowed = await hasCoffeeTalkCoordinatorAccess(ctx, actor)
    const teachers = await ctx.db
      .query("institutePeople")
      .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", actor._id))
      .collect() as StoredInstituteTeacher[]
    const teacherIds = teachers
      .filter((teacher) => teacher.kind === "teacher")
      .map((teacher) => teacher._id)

    const applicationLists = coordinatorAllowed
      ? [await ctx.db.query("coffeeTalkApplications").collect()]
      : await Promise.all(teacherIds.map((teacherId) => (
        ctx.db
          .query("coffeeTalkApplications")
          .withIndex("by_teacher_updatedAt", (index: any) => index.eq("assignedTeacherPersonId", teacherId))
          .order("desc")
          .collect()
      )))

    return Promise.all(applicationLists
      .flat()
      .sort((left: StoredCoffeeTalkApplication, right: StoredCoffeeTalkApplication) => right.updatedAt - left.updatedAt)
      .map(async (application: StoredCoffeeTalkApplication) => {
        const [profile, history] = await Promise.all([
          getCurrentApplicantProfile(ctx, application),
          listCoffeeTalkHistory(ctx, application._id),
        ])
        return toTeacherApplicationDto(application, profile, history, coordinatorAllowed ? "coordinator" : "teacher")
      }))
  },
})

/** Returns the current teacher's own Coffee Talk availability without exposing account bindings. */
export const getMyTeacherAvailability = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    if (actor.identityType !== "teacher") return null
    const profiles = await ctx.db
      .query("institutePeople")
      .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", actor._id))
      .collect() as StoredInstituteTeacher[]
    const teacher = profiles.find((profile) => profile.kind === "teacher")
    if (!teacher) return { open: false, profileMissing: true }
    return { teacherSlug: teacher.slug, open: teacher.coffeeTalkOpen === true, profileMissing: false }
  },
})

/** Lets a teacher manage only their own availability, while super admins may manage any teacher profile. */
export const setTeacherAvailability = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    open: v.boolean(),
    teacherSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    let teacher: StoredInstituteTeacher | null = null

    if (args.teacherSlug && actor.role === "super_admin") {
      teacher = await ctx.db
        .query("institutePeople")
        .withIndex("by_slug", (index: any) => index.eq("slug", args.teacherSlug!.trim().toLowerCase()))
        .first() as StoredInstituteTeacher | null
    } else {
      if (actor.identityType !== "teacher") throw new Error("仅教师或超级管理员可以设置 Coffee Talk 开放状态")
      const profiles = await ctx.db
        .query("institutePeople")
        .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", actor._id))
        .collect() as StoredInstituteTeacher[]
      teacher = profiles.find((profile) => profile.kind === "teacher") || null
    }

    if (!teacher || teacher.kind !== "teacher") throw new Error("教师目录档案不存在")
    await ctx.db.patch(teacher._id, {
      coffeeTalkOpen: args.open,
      updatedAt: Date.now(),
    })
    return { teacherSlug: teacher.slug, open: args.open }
  },
})

/**
 * Applies a version-checked, state-machine transition. It does not trust a
 * client role, applicant identity, or teacher account ID.
 */
export const actOnApplication = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    applicationId: v.id("coffeeTalkApplications"),
    expectedVersion: v.number(),
    action: coffeeTalkActionValidator,
    teacherSlug: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const application = await ctx.db.get(args.applicationId) as StoredCoffeeTalkApplication | null
    if (!application) throw new Error("COFFEE_TALK_APPLICATION_NOT_FOUND")
    if (application.version !== args.expectedVersion) {
      throw new Error(COFFEE_TALK_VERSION_CONFLICT)
    }

    const assignedTeacher = await ctx.db.get(application.assignedTeacherPersonId) as StoredInstituteTeacher | null
    const coordinatorAllowed = await hasCoffeeTalkCoordinatorAccess(ctx, actor)
    const actorKind = resolveCoffeeTalkActorKind({
      actorUserId: String(actor._id),
      actorRole: actor.role,
      coordinatorAllowed,
      applicantUserId: String(application.applicantUserId),
      ...(assignedTeacher?.accountUserId !== undefined
        ? { assignedTeacherUserId: String(assignedTeacher.accountUserId) }
        : {}),
    })
    if (!actorKind) throw new Error(COFFEE_TALK_ACTION_FORBIDDEN)

    const action = args.action as CoffeeTalkAction
    const note = args.note?.trim()
    if (note && note.length > 2_000) {
      throw new Error("COFFEE_TALK_ACTION_NOTE_TOO_LONG")
    }
    if (
      (action === "request_information" || action === "supplement" || action === "cancel" || action === "correct")
      && !note
    ) {
      throw new Error(COFFEE_TALK_ACTION_NOTE_REQUIRED)
    }
    const nextStatus = transitionCoffeeTalk(application.status, actorKind, action)
    let assignedTeacherPersonId = application.assignedTeacherPersonId
    let reassignedTeacher: StoredInstituteTeacher | null = null

    if (action === "reassign") {
      if (!args.teacherSlug) throw new Error(COFFEE_TALK_REASSIGNMENT_TARGET_REQUIRED)
      reassignedTeacher = await getAvailableTeacherBySlug(ctx, args.teacherSlug)
      assignedTeacherPersonId = reassignedTeacher._id
    }

    const now = Date.now()
    await ctx.db.patch(application._id, {
      ...(assignedTeacherPersonId !== application.assignedTeacherPersonId ? { assignedTeacherPersonId } : {}),
      status: nextStatus,
      version: application.version + 1,
      statusChangedAt: now,
      updatedAt: now,
      ...(action === "supplement" && note
        ? {
          supplementalInformation: application.supplementalInformation
            ? `${application.supplementalInformation}\n\n${note}`
            : note,
        }
        : {}),
    })
    await appendCoffeeTalkEvent(ctx, {
      applicationId: application._id,
      actorUserId: actor._id,
      actorKind,
      action,
      fromStatus: application.status,
      toStatus: nextStatus,
      createdAt: now,
      ...(note ? { note } : {}),
    })

    // All status actions notify only the other authorized party. The message
    // remains generic, and a reassign additionally notifies the explicit new
    // teacher binding when one exists.
    if (actorKind === "applicant") {
      const recipient = reassignedTeacher ?? assignedTeacher
      if (recipient?.accountUserId !== undefined) {
        await notifyCoffeeTalkRecipient(ctx, recipient.accountUserId, application._id, now, nextStatus, `coffee-talk:${String(application._id)}:${action}:version:${application.version + 1}:recipient:${String(recipient.accountUserId)}`)
      }
    } else {
      await notifyCoffeeTalkRecipient(ctx, application.applicantUserId, application._id, now, nextStatus, `coffee-talk:${String(application._id)}:${action}:version:${application.version + 1}:recipient:${String(application.applicantUserId)}`)
      if (
        reassignedTeacher?.accountUserId !== undefined
        && String(reassignedTeacher.accountUserId) !== String(actor._id)
      ) {
        await notifyCoffeeTalkRecipient(ctx, reassignedTeacher.accountUserId, application._id, now, nextStatus, `coffee-talk:${String(application._id)}:${action}:version:${application.version + 1}:recipient:${String(reassignedTeacher.accountUserId)}`)
      }
    }

    return {
      applicationId: toApplicationId(application),
      status: nextStatus,
      version: application.version + 1,
    }
  },
})

/** Returns only generic Coffee Talk notifications belonging to this session. */
export const listNotifications = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // The public shell polls this lightweight count on every AIA page. A
    // browser can retain an expired local token, which must behave like a
    // signed-out state rather than breaking navigation with a query error.
    let actor: any
    try {
      actor = await getUserBySession(ctx, args.sessionToken)
    } catch {
      return []
    }
    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (index: any) => index.eq("userId", actor._id))
      .order("desc")
      .collect()

    notifications = notifications.filter((notification: any) => notification.kind === "coffee_talk")
    return Promise.all(notifications.map(async (notification: any) => ({
      id: String(notification._id),
      title: notification.title,
      body: notification.body,
      ...(notification.readAt !== undefined ? { readAt: notification.readAt } : {}),
      createdAt: notification.createdAt,
      href: await coffeeTalkNotificationHref(ctx, actor._id, notification.resourceId),
    })))
  },
})

/**
 * Marks a single current-user notification as read. An unknown or someone
 * else's ID intentionally has the same idempotent outcome, so this endpoint
 * cannot be used to probe another account's notification IDs.
 */
export const markNotificationRead = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const notification = await ctx.db.get(args.notificationId) as {
      userId: any
      kind?: "coffee_talk" | "oa_workflow"
      readAt?: number
    } | null

    if (!notification || notification.kind !== "coffee_talk" || String(notification.userId) !== String(actor._id)) {
      return { updated: false }
    }
    if (notification.readAt !== undefined) {
      return { updated: false }
    }

    const now = Date.now()
    await ctx.db.patch(args.notificationId, { readAt: now })
    return { updated: true }
  },
})

/** Marks every unread Coffee Talk notification owned by the current session. */
export const markAllNotificationsRead = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (index: any) => index.eq("userId", actor._id))
      .collect() as { _id: any; kind?: "coffee_talk" | "oa_workflow"; readAt?: number }[]
    const unreadNotifications = notifications.filter((notification) => notification.kind === "coffee_talk" && notification.readAt === undefined)

    if (unreadNotifications.length === 0) {
      return { updatedCount: 0 }
    }

    const now = Date.now()
    await Promise.all(unreadNotifications.map((notification) => (
      ctx.db.patch(notification._id, { readAt: now })
    )))
    return { updatedCount: unreadNotifications.length }
  },
})
