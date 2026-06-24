export const REVIEWER_ACADEMIC_EXCHANGE_READ = "academicExchange:read"
export const REVIEWER_PERMISSIONS = [REVIEWER_ACADEMIC_EXCHANGE_READ] as const

export const REVIEWER_SESSION_TTL_MS = 1000 * 60 * 60 * 12
export const REVIEWER_PASSWORD_MIN_LENGTH = 8

export const normalizeReviewerUsername = (username: string) => username.trim().toLowerCase()

export const generateSalt = (len = 16) => {
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

export const hashReviewerPassword = async (password: string) => {
  const salt = generateSalt()
  return {
    salt,
    passwordHash: await sha256Hex(password + salt),
  }
}

export const verifyReviewerPassword = async (
  password: string,
  credential: { passwordHash: string; salt: string }
) => {
  return credential.passwordHash === await sha256Hex(password + credential.salt)
}

export const normalizeReviewerPermissions = (permissions?: string[]) => {
  const allowed = new Set<string>(REVIEWER_PERMISSIONS)
  if (permissions === undefined) return [REVIEWER_ACADEMIC_EXCHANGE_READ]
  return Array.from(new Set(permissions.filter((permission) => allowed.has(permission))))
}

export const getUserBySession = async (ctx: any, sessionToken?: string | null) => {
  if (!sessionToken) {
    throw new Error("请先登录")
  }

  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first()

  if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
    throw new Error("登录已过期，请重新登录")
  }

  const user = await ctx.db.get(session.userId)
  if (!user) {
    throw new Error("用户不存在")
  }

  return user
}

export const requireSuperAdminBySession = async (ctx: any, sessionToken?: string | null) => {
  const user = await getUserBySession(ctx, sessionToken)
  if (user.role !== "super_admin") {
    throw new Error("只有超级管理员可以管理 Reviewer 账号")
  }
  return user
}

export const createReviewerSession = async (ctx: any, reviewerId: any) => {
  const token = generateSalt(32)
  const now = Date.now()
  await ctx.db.insert("reviewerSessions", {
    reviewerId,
    tokenHash: await sha256Hex(token),
    issuedAt: now,
    expiresAt: now + REVIEWER_SESSION_TTL_MS,
  })
  return token
}

export const getReviewerBySession = async (ctx: any, sessionToken?: string | null) => {
  if (!sessionToken) {
    throw new Error("请先登录 Reviewer 账号")
  }

  const tokenHash = await sha256Hex(sessionToken)
  const session = await ctx.db
    .query("reviewerSessions")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .first()

  if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
    throw new Error("Reviewer 登录已过期，请重新登录")
  }

  const reviewer = await ctx.db.get(session.reviewerId)
  if (!reviewer || !reviewer.enabled) {
    throw new Error("Reviewer 账号不可用")
  }

  return reviewer
}

export const requireReviewerPermission = async (
  ctx: any,
  sessionToken: string | undefined | null,
  permission: string
) => {
  const reviewer = await getReviewerBySession(ctx, sessionToken)
  if (!reviewer.permissions?.includes(permission)) {
    throw new Error("Reviewer 账号没有访问该功能的权限")
  }
  return reviewer
}

export const serializeReviewerAccount = (reviewer: any) => ({
  _id: reviewer._id,
  username: reviewer.username,
  displayName: reviewer.displayName,
  enabled: reviewer.enabled,
  permissions: reviewer.permissions || [],
  createdBy: reviewer.createdBy,
  lastLoginAt: reviewer.lastLoginAt,
  createdAt: reviewer.createdAt,
  updatedAt: reviewer.updatedAt,
})
