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
import { normalizeCoffeeTalkSubmission } from "./lib/coffeeTalkSubmission"
import { getUserBySession } from "./reviewer/lib"

const COFFEE_TALK_VERSION_CONFLICT = "COFFEE_TALK_VERSION_CONFLICT"
const COFFEE_TALK_TEACHER_UNAVAILABLE = "COFFEE_TALK_TEACHER_UNAVAILABLE"
const COFFEE_TALK_ACTION_FORBIDDEN = "COFFEE_TALK_ACTION_FORBIDDEN"
const COFFEE_TALK_REASSIGNMENT_TARGET_REQUIRED = "COFFEE_TALK_REASSIGNMENT_TARGET_REQUIRED"

const coffeeTalkActionValidator = v.union(
  v.literal("start_review"),
  v.literal("accept"),
  v.literal("decline"),
  v.literal("withdraw"),
  v.literal("cancel"),
  v.literal("complete"),
  v.literal("reassign"),
  v.literal("correct"),
)

type StoredCoffeeTalkApplication = {
  _id: any
  applicantUserId: any
  assignedTeacherPersonId: any
  applicantName: string
  applicantAffiliation: string
  applicantIdentity: "undergraduate" | "graduate" | "other"
  applicantEmail: string
  topic: string
  availability: string
  notes?: string
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
    status: application.status,
    topic: application.topic,
    availability: application.availability,
    ...(application.notes !== undefined ? { notes: application.notes } : {}),
    version: application.version,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    statusChangedAt: application.statusChangedAt,
    allowedActions: allowedCoffeeTalkActions(application.status, "applicant"),
  }
}

function toTeacherApplicationDto(application: StoredCoffeeTalkApplication) {
  const redacted = redactCoffeeTalkForTeacher({
    status: application.status,
    topic: application.topic,
    contactSnapshot: {
      displayName: application.applicantName,
      email: application.applicantEmail,
    },
    createdAt: application.createdAt,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    statusChangedAt: application.statusChangedAt,
    version: application.version,
  })

  return {
    id: toApplicationId(application),
    ...redacted,
    affiliation: application.applicantAffiliation,
    identity: application.applicantIdentity,
    availability: application.availability,
    ...(application.notes !== undefined ? { notes: application.notes } : {}),
    allowedActions: allowedCoffeeTalkActions(application.status, "teacher"),
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
    sequenceNo,
    createdAt: input.createdAt,
  })
}

async function notifyCoffeeTalkRecipient(ctx: any, userId: any, applicationId: any, createdAt: number) {
  const notification = coffeeTalkNotificationContent()
  await ctx.db.insert("notifications", {
    userId,
    kind: "coffee_talk",
    title: notification.title,
    body: notification.body,
    resourceType: "coffee_talk",
    resourceId: applicationId,
    createdAt,
  })
}

type CoffeeTalkNotificationHref =
  | "/services/coffee-talk/my"
  | "/services/coffee-talk/manage"

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
    return "/services/coffee-talk/my"
  }

  const teacher = await ctx.db.get(application.assignedTeacherPersonId) as StoredInstituteTeacher | null
  if (
    teacher?.kind === "teacher"
    && teacher.accountUserId !== undefined
    && String(teacher.accountUserId) === String(recipientUserId)
  ) {
    return "/services/coffee-talk/manage"
  }

  return "/services/coffee-talk/my"
}

/**
 * Creates an idempotent Coffee Talk application. The applicant and teacher
 * account relationship are always derived from the server, never accepted as
 * IDs or roles from the browser.
 */
export const submitApplication = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    applicantName: v.string(),
    affiliation: v.string(),
    identity: v.string(),
    email: v.string(),
    teacherSlug: v.string(),
    topic: v.string(),
    availability: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const applicant = await getUserBySession(ctx, args.sessionToken)
    const submission = normalizeCoffeeTalkSubmission(args)
    const teacher = await getAvailableTeacherBySlug(ctx, submission.teacherSlug)
    const fingerprint = await requestFingerprint({
      applicantUserId: String(applicant._id),
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
      return {
        applicationId: toApplicationId(duplicate),
        deduplicated: true,
      }
    }

    const now = Date.now()
    const applicationId = await ctx.db.insert("coffeeTalkApplications", {
      applicantUserId: applicant._id,
      assignedTeacherPersonId: teacher._id,
      applicantName: submission.applicantName,
      applicantAffiliation: submission.affiliation,
      applicantIdentity: submission.identity,
      applicantEmail: submission.email,
      topic: submission.topic,
      availability: submission.availability,
      ...(submission.notes !== undefined ? { notes: submission.notes } : {}),
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
      await notifyCoffeeTalkRecipient(ctx, teacher.accountUserId, applicationId, now)
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
      const teacher = await ctx.db.get(application.assignedTeacherPersonId) as StoredInstituteTeacher | null
      return toApplicantApplicationDto(application, teacher)
    }))
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
    const teachers = await ctx.db
      .query("institutePeople")
      .withIndex("by_accountUserId", (index: any) => index.eq("accountUserId", actor._id))
      .collect() as StoredInstituteTeacher[]
    const teacherIds = teachers
      .filter((teacher) => teacher.kind === "teacher")
      .map((teacher) => teacher._id)

    const applicationLists = await Promise.all(teacherIds.map((teacherId) => (
      ctx.db
        .query("coffeeTalkApplications")
        .withIndex("by_teacher_updatedAt", (index: any) => index.eq("assignedTeacherPersonId", teacherId))
        .order("desc")
        .collect()
    )))

    return applicationLists
      .flat()
      .sort((left: StoredCoffeeTalkApplication, right: StoredCoffeeTalkApplication) => right.updatedAt - left.updatedAt)
      .map((application: StoredCoffeeTalkApplication) => toTeacherApplicationDto(application))
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
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    const application = await ctx.db.get(args.applicationId) as StoredCoffeeTalkApplication | null
    if (!application) throw new Error("COFFEE_TALK_APPLICATION_NOT_FOUND")
    if (application.version !== args.expectedVersion) {
      throw new Error(COFFEE_TALK_VERSION_CONFLICT)
    }

    const assignedTeacher = await ctx.db.get(application.assignedTeacherPersonId) as StoredInstituteTeacher | null
    const actorKind = resolveCoffeeTalkActorKind({
      actorUserId: String(actor._id),
      actorRole: actor.role,
      applicantUserId: String(application.applicantUserId),
      ...(assignedTeacher?.accountUserId !== undefined
        ? { assignedTeacherUserId: String(assignedTeacher.accountUserId) }
        : {}),
    })
    if (!actorKind) throw new Error(COFFEE_TALK_ACTION_FORBIDDEN)

    const action = args.action as CoffeeTalkAction
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
    })
    await appendCoffeeTalkEvent(ctx, {
      applicationId: application._id,
      actorUserId: actor._id,
      actorKind,
      action,
      fromStatus: application.status,
      toStatus: nextStatus,
      createdAt: now,
    })

    // All status actions notify only the other authorized party. The message
    // remains generic, and a reassign additionally notifies the explicit new
    // teacher binding when one exists.
    if (actorKind === "applicant") {
      const recipient = reassignedTeacher ?? assignedTeacher
      if (recipient?.accountUserId !== undefined) {
        await notifyCoffeeTalkRecipient(ctx, recipient.accountUserId, application._id, now)
      }
    } else {
      await notifyCoffeeTalkRecipient(ctx, application.applicantUserId, application._id, now)
      if (
        reassignedTeacher?.accountUserId !== undefined
        && String(reassignedTeacher.accountUserId) !== String(actor._id)
      ) {
        await notifyCoffeeTalkRecipient(ctx, reassignedTeacher.accountUserId, application._id, now)
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
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (index: any) => index.eq("userId", actor._id))
      .order("desc")
      .collect()

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
      readAt?: number
    } | null

    if (!notification || String(notification.userId) !== String(actor._id)) {
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
      .collect() as { _id: any; readAt?: number }[]
    const unreadNotifications = notifications.filter((notification) => notification.readAt === undefined)

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
