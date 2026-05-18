import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import {
  TECHDAY_SESSION_TTL_MS,
  getMainUserBySession,
  hashSecret,
  normalizeCode,
  normalizeEmail,
  normalizeStringList,
  normalizeText,
  randomHex,
  resolvePrincipal,
  serializeTechDayUser,
  sha256Hex,
  verifySecret,
} from "./lib"

const PASSWORD_MIN_LENGTH = 8

const createSession = async (ctx: any, userId: any) => {
  const token = randomHex(32)
  const now = Date.now()
  await ctx.db.insert("techDaySessions", {
    userId,
    tokenHash: await sha256Hex(token),
    issuedAt: now,
    expiresAt: now + TECHDAY_SESSION_TTL_MS,
  })
  return token
}

const createCredential = async (ctx: any, userId: any, password: string) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`密码至少需要 ${PASSWORD_MIN_LENGTH} 位`)
  }
  const secret = await hashSecret(password)
  await ctx.db.insert("techDayCredentials", {
    userId,
    passwordHash: secret.hash,
    salt: secret.salt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

const ensureEmailAvailable = async (ctx: any, email: string) => {
  const existing = await ctx.db
    .query("techDayUsers")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first()
  if (existing) throw new Error("邮箱已被注册")
}

const ensureStudentIdAvailable = async (ctx: any, studentId?: string) => {
  if (!studentId) return
  const existing = await ctx.db
    .query("techDayUsers")
    .withIndex("by_studentId", (q: any) => q.eq("studentId", studentId))
    .first()
  if (existing) throw new Error("学号已被注册")
}

export const me = query({
  args: {
    mainSessionToken: v.optional(v.string()),
    techDaySessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const principal = await resolvePrincipal(ctx, args)
    return {
      kind: principal.kind,
      mainUser: principal.mainUser
        ? {
            _id: principal.mainUser._id,
            email: principal.mainUser.email,
            username: principal.mainUser.username,
            englishName: principal.mainUser.englishName,
            chineseName: principal.mainUser.chineseName,
            role: principal.mainUser.role,
            organization: principal.mainUser.organization,
            cohort: principal.mainUser.cohort,
            studentId: principal.mainUser.studentId,
          }
        : null,
      techDayUser: await serializeTechDayUser(ctx, principal.techDayUser),
    }
  },
})

export const syncInternalUser = mutation({
  args: { mainSessionToken: v.string() },
  handler: async (ctx, args) => {
    const mainUser = await getMainUserBySession(ctx, args.mainSessionToken)
    if (!mainUser) throw new Error("请先使用通班账号登录")

    const now = Date.now()
    const existing = await ctx.db
      .query("techDayUsers")
      .withIndex("by_mainUser", (q) => q.eq("mainUserId", mainUser._id))
      .first()

    const isMainAdmin = mainUser.role === "admin" || mainUser.role === "super_admin"
    const identityPatch = {
      email: normalizeEmail(mainUser.email),
      name: normalizeText(mainUser.chineseName || mainUser.englishName || mainUser.username),
      school: mainUser.organization.toUpperCase(),
      college: "TongClass",
      grade: String(mainUser.cohort),
      studentId: mainUser.studentId,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...identityPatch,
        role: isMainAdmin ? "admin" : existing.role,
      })
      return existing._id
    }

    if (!isMainAdmin) return null

    return await ctx.db.insert("techDayUsers", {
      ...identityPatch,
      role: "admin",
      mainUserId: mainUser._id,
      status: "active",
      createdAt: now,
    })
  },
})

export const getInternalVolunteerApplication = query({
  args: { mainSessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const mainUser = await getMainUserBySession(ctx, args.mainSessionToken)
    if (!mainUser) return null
    const user = await ctx.db
      .query("techDayUsers")
      .withIndex("by_mainUser", (q) => q.eq("mainUserId", mainUser._id))
      .first()
    return await serializeTechDayUser(ctx, user)
  },
})

export const applyInternalVolunteer = mutation({
  args: {
    mainSessionToken: v.string(),
    volunteerTracks: v.array(v.string()),
    availabilitySlots: v.array(v.string()),
    voteCounterOptIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const mainUser = await getMainUserBySession(ctx, args.mainSessionToken)
    if (!mainUser) throw new Error("请先使用通班账号登录")
    if (mainUser.role === "admin" || mainUser.role === "super_admin") {
      throw new Error("管理员已拥有 TechDay 后台权限，无需申请志愿者队列")
    }

    const email = normalizeEmail(mainUser.email)
    const now = Date.now()
    const existingByMain = await ctx.db
      .query("techDayUsers")
      .withIndex("by_mainUser", (q) => q.eq("mainUserId", mainUser._id))
      .first()
    const existingByEmail = await ctx.db
      .query("techDayUsers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first()

    if (existingByEmail && (!existingByMain || existingByEmail._id !== existingByMain._id)) {
      throw new Error("该通班邮箱已绑定其他 TechDay 账号")
    }

    const patch = {
      email,
      name: normalizeText(mainUser.chineseName || mainUser.englishName || mainUser.username),
      school: mainUser.organization.toUpperCase(),
      college: "TongClass",
      grade: String(mainUser.cohort),
      studentId: mainUser.studentId,
      role: "volunteer" as const,
      volunteerTracks: normalizeStringList(args.volunteerTracks),
      availabilitySlots: normalizeStringList(args.availabilitySlots),
      voteCounterOptIn: Boolean(args.voteCounterOptIn),
      updatedAt: now,
    }

    const shouldRemainActive = existingByMain?.role === "volunteer" && existingByMain.status === "active"
    const id = existingByMain
      ? existingByMain._id
      : await ctx.db.insert("techDayUsers", {
          ...patch,
          mainUserId: mainUser._id,
          status: "pending",
          createdAt: now,
        })

    if (existingByMain) {
      await ctx.db.patch(existingByMain._id, {
        ...patch,
        status: shouldRemainActive ? "active" : "pending",
        assignedTracks: shouldRemainActive ? existingByMain.assignedTracks : [],
        organizationId: shouldRemainActive ? existingByMain.organizationId : undefined,
      })
    }

    const user = await ctx.db.get(id)
    return {
      user: await serializeTechDayUser(ctx, user),
      pendingApproval: user?.status !== "active",
    }
  },
})

export const registerAuthor = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    school: v.string(),
    college: v.string(),
    grade: v.string(),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email)
    const studentId = normalizeText(args.studentId)
    await ensureEmailAvailable(ctx, email)
    await ensureStudentIdAvailable(ctx, studentId)

    const now = Date.now()
    const userId = await ctx.db.insert("techDayUsers", {
      email,
      name: normalizeText(args.name),
      school: normalizeText(args.school),
      college: normalizeText(args.college),
      grade: normalizeText(args.grade),
      studentId,
      role: "author",
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    await createCredential(ctx, userId, args.password)
    return { user: await serializeTechDayUser(ctx, await ctx.db.get(userId)), sessionToken: await createSession(ctx, userId) }
  },
})

export const registerVolunteer = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    school: v.optional(v.string()),
    college: v.string(),
    grade: v.string(),
    studentId: v.optional(v.string()),
    volunteerTracks: v.array(v.string()),
    availabilitySlots: v.array(v.string()),
    voteCounterOptIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email)
    const studentId = args.studentId ? normalizeText(args.studentId) : undefined
    await ensureEmailAvailable(ctx, email)
    await ensureStudentIdAvailable(ctx, studentId)

    const now = Date.now()
    const userId = await ctx.db.insert("techDayUsers", {
      email,
      name: normalizeText(args.name),
      school: args.school ? normalizeText(args.school) : undefined,
      college: normalizeText(args.college),
      grade: normalizeText(args.grade),
      studentId,
      role: "volunteer",
      volunteerTracks: normalizeStringList(args.volunteerTracks),
      availabilitySlots: normalizeStringList(args.availabilitySlots),
      voteCounterOptIn: Boolean(args.voteCounterOptIn),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    await createCredential(ctx, userId, args.password)
    return { user: await serializeTechDayUser(ctx, await ctx.db.get(userId)), pendingApproval: true }
  },
})

export const getReviewerInvite = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("techDayReviewerInvites")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .first()
    if (!invite) return null
    const direction = invite.presetDirectionId ? await ctx.db.get(invite.presetDirectionId) : null
    return {
      code: invite.code,
      presetDirectionId: invite.presetDirectionId,
      presetDirectionName: direction?.name,
      isUsed: invite.isUsed,
    }
  },
})

export const registerReviewer = mutation({
  args: {
    inviteCode: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    directionId: v.optional(v.id("techDayDirections")),
  },
  handler: async (ctx, args) => {
    const code = normalizeCode(args.inviteCode)
    const invite = await ctx.db
      .query("techDayReviewerInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first()
    if (!invite) throw new Error("邀请码不存在")
    if (invite.isUsed) throw new Error("邀请码已被使用")

    const directionId = invite.presetDirectionId || args.directionId
    if (!directionId) throw new Error("请选择审阅方向")
    const direction = await ctx.db.get(directionId)
    if (!direction) throw new Error("方向不存在")

    const email = normalizeEmail(args.email)
    await ensureEmailAvailable(ctx, email)

    const now = Date.now()
    const userId = await ctx.db.insert("techDayUsers", {
      email,
      name: normalizeText(args.name),
      role: "reviewer",
      reviewerDirectionId: directionId,
      reviewerInviteId: invite._id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    await createCredential(ctx, userId, args.password)
    await ctx.db.patch(invite._id, {
      reviewerName: normalizeText(args.name),
      reviewerEmail: email,
      reviewerDirectionId: directionId,
      isUsed: true,
      updatedAt: now,
    })
    return { user: await serializeTechDayUser(ctx, await ctx.db.get(userId)), sessionToken: await createSession(ctx, userId) }
  },
})

export const login = mutation({
  args: {
    identifier: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedIdentifier = normalizeEmail(args.identifier)
    const user =
      (await ctx.db
        .query("techDayUsers")
        .withIndex("by_email", (q) => q.eq("email", normalizedIdentifier))
        .first()) ||
      (await ctx.db
        .query("techDayReviewerInvites")
        .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.identifier)))
        .first()
        .then(async (invite) => {
          if (!invite || !invite.isUsed) return null
          return await ctx.db
            .query("techDayUsers")
            .withIndex("by_reviewerInvite", (q) => q.eq("reviewerInviteId", invite._id))
            .first()
        }))

    if (!user || user.status !== "active") throw new Error("账号或密码错误")
    const credential = await ctx.db
      .query("techDayCredentials")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first()
    if (!credential || !(await verifySecret(args.password, credential))) {
      throw new Error("账号或密码错误")
    }

    return { user: await serializeTechDayUser(ctx, user), sessionToken: await createSession(ctx, user._id) }
  },
})

export const logout = mutation({
  args: { techDaySessionToken: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await sha256Hex(args.techDaySessionToken)
    const session = await ctx.db
      .query("techDaySessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first()
    if (session && !session.revokedAt) {
      await ctx.db.patch(session._id, { revokedAt: Date.now() })
    }
    return { success: true }
  },
})

export const changePassword = mutation({
  args: {
    techDaySessionToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolvePrincipal(ctx, { techDaySessionToken: args.techDaySessionToken }).then((p) => p.techDayUser)
    if (!user) throw new Error("请先登录 TechDay")
    const credential = await ctx.db
      .query("techDayCredentials")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first()
    if (!credential || !(await verifySecret(args.currentPassword, credential))) {
      throw new Error("旧密码不正确")
    }
    const secret = await hashSecret(args.newPassword)
    await ctx.db.patch(credential._id, {
      passwordHash: secret.hash,
      salt: secret.salt,
      updatedAt: Date.now(),
    })
    return { success: true }
  },
})
