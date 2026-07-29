import { resolveTeacherReviewerCapability } from "../lib/reviewerBinding"

export const REVIEWER_ACADEMIC_EXCHANGE_READ = "academicExchange:read"
export const REVIEWER_PERMISSIONS = [REVIEWER_ACADEMIC_EXCHANGE_READ] as const

export const REVIEWER_SESSION_TTL_MS = 1000 * 60 * 60 * 12
export const REVIEWER_PASSWORD_MIN_LENGTH = 8
export const REVIEWER_PASSWORD_ITERATIONS = 120_000

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

const bytesToHex = (bytes: Uint8Array) => (
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("")
)

const constantTimeEqual = (left: string, right: string) => {
  const maximum = Math.max(left.length, right.length)
  let difference = left.length ^ right.length
  for (let index = 0; index < maximum; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return difference === 0
}

const pbkdf2ReviewerPassword = async (password: string, salt: string, iterations: number) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const key = await cryptoImpl.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await cryptoImpl.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: new TextEncoder().encode(salt),
    iterations,
  }, key, 256)
  return bytesToHex(new Uint8Array(bits))
}

export const hashReviewerPassword = async (password: string) => {
  const salt = generateSalt()
  return {
    salt,
    passwordHash: await pbkdf2ReviewerPassword(password, salt, REVIEWER_PASSWORD_ITERATIONS),
    passwordAlgorithm: "pbkdf2-sha256" as const,
    passwordIterations: REVIEWER_PASSWORD_ITERATIONS,
  }
}

export const verifyReviewerPassword = async (
  password: string,
  credential: {
    passwordHash: string
    salt: string
    passwordAlgorithm?: "pbkdf2-sha256"
    passwordIterations?: number
  }
) => {
  const candidate = credential.passwordAlgorithm === "pbkdf2-sha256"
    ? await pbkdf2ReviewerPassword(
      password,
      credential.salt,
      credential.passwordIterations || REVIEWER_PASSWORD_ITERATIONS,
    )
    : await sha256Hex(password + credential.salt)
  return constantTimeEqual(credential.passwordHash, candidate)
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
  if (user.accountStatus === "disabled") {
    throw new Error("账号不可用")
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

export type ReviewerCredentialSource = "independent" | "teacher_derived"

export type AcademicExchangeReviewerAccess = Readonly<{
  reviewer: any
  credentialSource: ReviewerCredentialSource
  mainUserId?: any
}>

/**
 * Resolves a Reviewer principal for the limited Academic Exchange read
 * surface. A teacher-derived principal is not a Reviewer session and never
 * receives a Reviewer password or a copied bearer token; each request starts
 * from the active main-site session and exact stored IDs.
 */
export const requireAcademicExchangeReviewerAccess = async (
  ctx: any,
  args: {
    reviewerSessionToken?: string | null
    mainSessionToken?: string | null
  },
): Promise<AcademicExchangeReviewerAccess> => {
  const { reviewerSessionToken, mainSessionToken } = args

  if (reviewerSessionToken && mainSessionToken) {
    throw new Error("不能混用 Reviewer 会话和主站会话")
  }

  if (reviewerSessionToken) {
    const reviewer = await requireReviewerPermission(
      ctx,
      reviewerSessionToken,
      REVIEWER_ACADEMIC_EXCHANGE_READ,
    )
    return {
      reviewer,
      credentialSource: "independent",
    }
  }

  const mainUser = await getUserBySession(ctx, mainSessionToken)
  const people = await ctx.db
    .query("institutePeople")
    .withIndex("by_accountUserId", (q: any) => q.eq("accountUserId", mainUser._id))
    .collect()
  const teacherIdentity = people.find((person: any) => (
    person.kind === "teacher" && String(person.accountUserId) === String(mainUser._id)
  ))

  const reviewerAccounts = await ctx.db
    .query("reviewerAccounts")
    .withIndex("by_mainUserId", (q: any) => q.eq("mainUserId", mainUser._id))
    .collect()

  for (const reviewer of reviewerAccounts) {
    const decision = resolveTeacherReviewerCapability({
      mainUserId: String(mainUser._id),
      mainIdentityType: teacherIdentity ? "teacher" : "other",
      mainAccountActive: true,
      reviewerAccountId: String(reviewer._id),
      reviewerAccountEnabled: reviewer.enabled === true,
      explicitBinding: {
        mainUserId: reviewer.mainUserId ? String(reviewer.mainUserId) : "",
        reviewerAccountId: String(reviewer._id),
        teacherDerivedEnabled: reviewer.teacherDerivedEnabled === true,
        linkMethod: reviewer.linkMethod || "",
      },
    })

    if (decision.allowed) {
      return {
        reviewer,
        credentialSource: "teacher_derived",
        mainUserId: mainUser._id,
      }
    }
  }

  throw new Error("当前主站账号没有可用的教师 Reviewer 授权")
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
