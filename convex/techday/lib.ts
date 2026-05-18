import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { v } from "convex/values"

export const TECHDAY_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30
export const MAIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30
export const SETTINGS_KEY = "default"

export const techDayRoleValidator = v.union(
  v.literal("author"),
  v.literal("volunteer"),
  v.literal("reviewer"),
  v.literal("admin")
)

export const trackValidator = v.union(v.literal("poster"), v.literal("demo"))
export const reviewStatusValidator = v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
export const publicationStatusValidator = v.union(v.literal("accepted"), v.literal("published"))
export const reimbursementStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("waiting_more")
)
export const postVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("authenticated"),
  v.literal("volunteer"),
  v.literal("author"),
  v.literal("reviewer"),
  v.literal("admin")
)

export type TechDayRole = Doc<"techDayUsers">["role"]
export type Principal =
  | { kind: "public"; mainUser: null; techDayUser: null }
  | { kind: "internal"; mainUser: Doc<"users">; techDayUser: Doc<"techDayUsers"> | null }
  | { kind: "external"; mainUser: null; techDayUser: Doc<"techDayUsers"> }

type Ctx = QueryCtx | MutationCtx

export const normalizeEmail = (email: string) => email.trim().toLowerCase()
export const normalizeCode = (code: string) => code.trim().toUpperCase()
export const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim()
export const normalizeLongText = (value: string) => value.replace(/\r\n/g, "\n").trim()

export const normalizeStringList = (values?: string[]) => {
  if (!values) return []
  const seen = new Set<string>()
  return values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const randomHex = (len = 32) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const arr = cryptoImpl.getRandomValues(new Uint8Array(len)) as Uint8Array
  return Array.from(arr).map((b: number) => b.toString(16).padStart(2, "0")).join("")
}

export const sha256Hex = async (input: string) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const enc = new TextEncoder().encode(input)
  const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hashBuffer)).map((b: number) => b.toString(16).padStart(2, "0")).join("")
}

const PBKDF2_ITERATIONS = 210000
const PBKDF2_PREFIX = "pbkdf2_sha256"
const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || [])
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")

const pbkdf2Sha256Hex = async (secret: string, salt: string, iterations = PBKDF2_ITERATIONS) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const key = await cryptoImpl.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  const bits = await cryptoImpl.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(salt),
      iterations,
    },
    key,
    256
  )
  return bytesToHex(new Uint8Array(bits))
}

export const hashSecret = async (secret: string, salt = randomHex(16)) => {
  return {
    salt,
    hash: `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${await pbkdf2Sha256Hex(secret, salt)}`,
  }
}

export const verifySecret = async (
  secret: string,
  credential: { passwordHash: string; salt: string; legacyHash?: string }
) => {
  if (credential.passwordHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const [, iterationsRaw, storedHash] = credential.passwordHash.split("$")
    const iterations = Number(iterationsRaw)
    if (!storedHash || !Number.isFinite(iterations) || iterations <= 0) return false
    return storedHash === await pbkdf2Sha256Hex(secret, credential.salt, iterations)
  }
  if (credential.passwordHash === await sha256Hex(secret + credential.salt)) {
    return true
  }
  return false
}

export const ensureUnique = async (
  ctx: Ctx,
  table: "techDayUsers" | "techDayOrganizations" | "techDayRoleTemplates" | "techDayDirections" | "techDayAwards" | "techDayReviewerInvites" | "techDayPosts",
  indexName: string,
  fieldName: string,
  value: string,
  conflictMessage: string,
  currentId?: string
) => {
  const existing = await (ctx.db.query(table as any) as any)
    .withIndex(indexName, (q: any) => q.eq(fieldName, value))
    .first()
  if (existing && String(existing._id) !== currentId) {
    throw new Error(conflictMessage)
  }
}

export const getMainUserBySession = async (ctx: Ctx, sessionToken?: string | null) => {
  if (!sessionToken) return null
  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .first()
  if (!session || session.revokedAt || session.expiresAt <= Date.now()) return null
  return await ctx.db.get(session.userId)
}

export const getTechDayUserBySession = async (ctx: Ctx, sessionToken?: string | null) => {
  if (!sessionToken) return null
  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("techDaySessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .first()
  if (!session || session.revokedAt || session.expiresAt <= Date.now()) return null
  const user = await ctx.db.get(session.userId)
  if (!user || user.status !== "active") return null
  return user
}

export const getTechDayUserByMainUser = async (ctx: Ctx, mainUserId: Id<"users">) => {
  const user = await ctx.db
    .query("techDayUsers")
    .withIndex("by_mainUser", (q) => q.eq("mainUserId", mainUserId))
    .first()
  if (!user || user.status !== "active") return null
  return user
}

export const resolvePrincipal = async (
  ctx: Ctx,
  args: { mainSessionToken?: string | null; techDaySessionToken?: string | null }
): Promise<Principal> => {
  const [mainUser, techDaySessionUser] = await Promise.all([
    getMainUserBySession(ctx, args.mainSessionToken),
    getTechDayUserBySession(ctx, args.techDaySessionToken),
  ])
  if (techDaySessionUser) {
    if (mainUser) {
      return { kind: "internal", mainUser, techDayUser: techDaySessionUser }
    }
    return { kind: "external", mainUser: null, techDayUser: techDaySessionUser }
  }

  if (mainUser) {
    return {
      kind: "internal",
      mainUser,
      techDayUser: await getTechDayUserByMainUser(ctx, mainUser._id),
    }
  }

  return { kind: "public", mainUser: null, techDayUser: null }
}

export const isTongClassAdmin = (user: Doc<"users"> | null) => {
  return user?.role === "admin" || user?.role === "super_admin"
}

export const isTongClassSuperAdmin = (user: Doc<"users"> | null) => {
  return user?.role === "super_admin"
}

export const isTechDayAdmin = (principal: Principal) => {
  return isTongClassAdmin(principal.mainUser) || principal.techDayUser?.role === "admin"
}

export const requireAuthenticated = (principal: Principal) => {
  if (principal.kind === "public" || !principal.techDayUser) {
    throw new Error("请先登录 TechDay")
  }
  return principal.techDayUser
}

export const requireAdmin = (principal: Principal) => {
  if (!isTechDayAdmin(principal)) {
    throw new Error("需要 TechDay 管理员权限")
  }
  return principal.techDayUser
}

export const requireSuperAdmin = (principal: Principal) => {
  if (!isTongClassSuperAdmin(principal.mainUser)) {
    throw new Error("需要通班超级管理员权限")
  }
}

export const requireRole = (principal: Principal, role: TechDayRole) => {
  if (isTechDayAdmin(principal)) return principal.techDayUser
  const user = requireAuthenticated(principal)
  if (user.role !== role) {
    throw new Error("没有访问该 TechDay 功能的权限")
  }
  return user
}

export const requireOwnerOrAdmin = (principal: Principal, ownerId: Id<"techDayUsers">) => {
  if (isTechDayAdmin(principal)) return
  const user = requireAuthenticated(principal)
  if (user._id !== ownerId) {
    throw new Error("只能访问自己的记录")
  }
}

export const canViewSubmission = (principal: Principal, submission: Doc<"techDaySubmissions">) => {
  return submission.reviewStatus === "approved" || isTechDayAdmin(principal) || principal.techDayUser?._id === submission.authorId
}

export const canViewPost = (principal: Principal, post: Doc<"techDayPosts">) => {
  if (!post.published) {
    return isTechDayAdmin(principal) || principal.techDayUser?._id === post.authorId
  }
  if (post.visibility.includes("public")) return true
  if (principal.kind === "public") return false
  if (isTechDayAdmin(principal)) return true
  if (post.visibility.includes("authenticated")) return true
  return Boolean(principal.techDayUser && post.visibility.includes(principal.techDayUser.role))
}

export const getOrCreateSettings = async (ctx: MutationCtx) => {
  const existing = await ctx.db
    .query("techDaySettings")
    .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
    .first()
  if (existing) return existing

  const now = Date.now()
  const id = await ctx.db.insert("techDaySettings", {
    key: SETTINGS_KEY,
    showVoteData: false,
    voteSortEnabled: false,
    createdAt: now,
    updatedAt: now,
  })
  return await ctx.db.get(id)
}

export const serializeTechDayUser = async (ctx: Ctx, user: Doc<"techDayUsers"> | null): Promise<any> => {
  if (!user) return null

  const [organization, roleTemplate, reviewerDirection, organizations] = await Promise.all([
    user.organizationId ? ctx.db.get(user.organizationId) : null,
    user.roleTemplateId ? ctx.db.get(user.roleTemplateId) : null,
    user.reviewerDirectionId ? ctx.db.get(user.reviewerDirectionId) : null,
    ctx.db.query("techDayOrganizations").collect(),
  ])

  const assignedTracks = user.assignedTracks || []
  const organizationByName = new Map(organizations.map((row) => [row.name, row]))
  const assignedOrganizations = assignedTracks
    .map((name) => organizationByName.get(name))
    .filter(Boolean) as Doc<"techDayOrganizations">[]
  const organizationDetails = assignedOrganizations.length > 0
    ? assignedOrganizations
    : organization
      ? [organization]
      : []
  const reviewerDirectionName = reviewerDirection?.name || null
  const organizationName = user.role === "reviewer"
    ? reviewerDirectionName
    : user.role === "author"
      ? null
      : organizationDetails[0]?.name || null
  const responsibility = user.role === "reviewer"
    ? reviewerDirectionName
      ? `审阅方向：${reviewerDirectionName}`
      : "未设置审阅方向"
    : user.role === "author"
      ? null
      : organizationDetails.length
        ? organizationDetails.map((org) => `${org.name}: ${org.responsibility}`).join(" ")
        : "由管理员分配"

  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    school: user.school,
    college: user.college,
    grade: user.grade,
    studentId: user.studentId,
    role: user.role,
    mainUserId: user.mainUserId,
    organizationId: user.organizationId,
    organizationName,
    responsibility,
    organizationsDetail: organizationDetails.map((org) => ({
      _id: org._id,
      name: org.name,
      responsibility: org.responsibility,
    })),
    roleTemplateId: user.roleTemplateId,
    roleTemplateName: roleTemplate?.name || null,
    roleTemplateCanEditVote: Boolean(roleTemplate?.canEditVoteData),
    volunteerTracks: user.volunteerTracks,
    assignedTracks: user.assignedTracks,
    availabilitySlots: user.availabilitySlots,
    voteCounterOptIn: user.voteCounterOptIn,
    reviewerDirectionId: user.reviewerDirectionId,
    reviewerDirectionName,
    reviewerInviteId: user.reviewerInviteId,
    canPublishNews: user.canPublishNews,
    canSubmitPapers: user.role === "author" || Boolean(user.canSubmitPapers),
    status: user.status,
    legacyId: user.legacyId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
