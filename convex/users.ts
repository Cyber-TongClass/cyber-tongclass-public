import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const normalizeUsername = (username: string) => username.trim().toLowerCase()
const normalizeStudentId = (studentId: string) => studentId.trim()
const PROFILE_MARKDOWN_MAX_LENGTH = 20_000
const PASSWORD_MIN_LENGTH = 8
const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

const normalizeProfileMarkdown = (value: string) => value.replace(/\r\n/g, "\n").trim()
const normalizeOptionalString = (value?: string) => {
    if (value === undefined) return undefined
    const trimmed = value.trim()
    return trimmed ? trimmed : ""
}

const normalizeStringList = (values?: string[]) => {
    if (!values) return undefined

    const seen = new Set<string>()
    const normalized = values
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => {
            const key = value.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

    return normalized
}

const linkTypeValidator = v.union(
    v.literal("homepage"),
    v.literal("scholar"),
    v.literal("orcid"),
    v.literal("github"),
    v.literal("x"),
    v.literal("xiaohongshu"),
    v.literal("linkedin"),
    v.literal("custom")
)

const getDefaultLinkLabel = (type: "homepage" | "scholar" | "orcid" | "github" | "x" | "xiaohongshu" | "linkedin" | "custom") => {
    const labels = {
        homepage: "Personal Homepage",
        scholar: "Google Scholar",
        orcid: "ORCID",
        github: "GitHub",
        x: "X",
        xiaohongshu: "Xiaohongshu",
        linkedin: "LinkedIn",
        custom: "Custom Link",
    } as const

    return labels[type]
}

const normalizeLinks = (links?: Array<{ type: "homepage" | "scholar" | "orcid" | "github" | "x" | "xiaohongshu" | "linkedin" | "custom"; label: string; url: string }>) => {
    if (!links) return undefined

    const seen = new Set<string>()
    const normalized = links
        .map((link) => {
            const url = link.url.trim()
            if (!url) return null

            const label = link.label.trim() || getDefaultLinkLabel(link.type)
            return {
                type: link.type,
                label,
                url,
            }
        })
        .filter((link): link is { type: "homepage" | "scholar" | "orcid" | "github" | "x" | "xiaohongshu" | "linkedin" | "custom"; label: string; url: string } => Boolean(link))
        .filter((link) => {
            const key = `${link.type}::${link.label.toLowerCase()}::${link.url.toLowerCase()}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

    return normalized
}

const pickDefined = <T extends Record<string, any>>(input: T) => {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>
}

const isVisibleClassMember = (user: { isClassMember?: boolean }) => user.isClassMember !== false

const generateSalt = (len = 16) => {
    const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
    const arr = cryptoImpl.getRandomValues(new Uint8Array(len)) as Uint8Array
    return Array.from(arr).map((b: number) => b.toString(16).padStart(2, "0")).join("")
}

const sha256Hex = async (input: string) => {
    const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
    const enc = new TextEncoder().encode(input)
    const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
    return Array.from(new Uint8Array(hashBuffer)).map((b: number) => b.toString(16).padStart(2, "0")).join("")
}

const createAuthSession = async (ctx: any, userId: any) => {
    const token = generateSalt(32)
    const now = Date.now()
    await ctx.db.insert("authSessions", {
        userId,
        tokenHash: await sha256Hex(token),
        issuedAt: now,
        expiresAt: now + AUTH_SESSION_TTL_MS,
    })
    return token
}

const verifyPassword = async (password: string, credential: { passwordHash: string; salt?: string }) => {
    if (credential.salt) {
        return credential.passwordHash === await sha256Hex(password + credential.salt)
    }

    // Compatibility for legacy dev/prod data that stored plaintext or unsalted hashes.
    if (credential.passwordHash === password) {
        return true
    }

    return credential.passwordHash === await sha256Hex(password)
}

// Get all users with pagination
export const list = query({
    args: {
        skip: v.optional(v.number()),
        limit: v.optional(v.number()),
        organization: v.optional(v.union(v.literal("pku"), v.literal("thu"))),
        cohort: v.optional(v.union(v.number(), v.literal("mascot"))),
        classMembersOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        let usersQuery = ctx.db.query("users")

        if (args.organization) {
            usersQuery = usersQuery.filter((q) => q.eq(q.field("organization"), args.organization))
        }

        if (args.cohort !== undefined) {
            usersQuery = usersQuery.filter((q) => q.eq(q.field("cohort"), args.cohort))
        }

        const allUsers = await usersQuery.order("desc").collect()
        const visibleUsers = args.classMembersOnly ? allUsers.filter(isVisibleClassMember) : allUsers
        const skip = args.skip || 0
        const limit = args.limit || 50
        return visibleUsers.slice(skip, skip + limit)
    },
})

// Get a single user by ID
export const getById = query({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id)
        return user
    },
})

// Get a single user by email
export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const normalizedEmail = normalizeEmail(args.email)

        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), normalizedEmail))
            .first()

        return user
    },
})

// Get a single user by student ID
export const getByStudentId = query({
    args: { studentId: v.string() },
    handler: async (ctx, args) => {
        const normalizedStudentId = normalizeStudentId(args.studentId)

        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("studentId"), normalizedStudentId))
            .first()

        return user
    },
})

// Create a new user
export const create = mutation({
    args: {
        email: v.string(),
        username: v.string(),
        englishName: v.string(),
        chineseName: v.optional(v.string()),
        organization: v.union(v.literal("pku"), v.literal("thu")),
        cohort: v.union(v.number(), v.literal("mascot")),
        studentId: v.string(),
        role: v.optional(v.union(v.literal("member"), v.literal("admin"), v.literal("super_admin"))),
        password: v.optional(v.string()),
        personalEmails: v.optional(v.array(v.string())),
        personalEmail: v.optional(v.string()),
        bio: v.optional(v.string()),
        profileMarkdown: v.optional(v.string()),
        researchDirections: v.optional(v.array(v.string())),
        researchInterests: v.optional(v.array(v.string())),
        links: v.optional(v.array(v.object({ type: linkTypeValidator, label: v.string(), url: v.string() }))),
        titles: v.optional(v.array(v.object({ title: v.string(), link: v.string() }))),
        scholarUrl: v.optional(v.string()),
        orcidUrl: v.optional(v.string()),
        avatar: v.optional(v.string()),
        realPhoto: v.optional(v.string()),
        isClassMember: v.optional(v.boolean()),
        isEmailVerified: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const email = normalizeEmail(args.email)
        const username = normalizeUsername(args.username)
        const studentId = normalizeStudentId(args.studentId)

        const [existingEmailUser, existingUsernameUser, existingStudentIdUser] = await Promise.all([
            ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("email"), email))
                .first(),
            ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("username"), username))
                .first(),
            ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("studentId"), studentId))
                .first(),
        ])

        if (existingEmailUser) {
            throw new Error("User email already exists")
        }

        if (existingUsernameUser) {
            throw new Error("Username already exists")
        }

        if (existingStudentIdUser) {
            throw new Error("Student ID already exists")
        }

        const now = Date.now()

        const userId = await ctx.db.insert("users", {
            email,
            username,
            englishName: args.englishName.trim(),
            chineseName: normalizeOptionalString(args.chineseName),
            role: args.role || "member",
            organization: args.organization,
            cohort: args.cohort,
            studentId,
            personalEmails: normalizeStringList(args.personalEmails),
            personalEmail: args.personalEmail,
            bio: normalizeOptionalString(args.bio),
            profileMarkdown: args.profileMarkdown ? normalizeProfileMarkdown(args.profileMarkdown) : undefined,
            researchDirections: normalizeStringList(args.researchDirections),
            researchInterests: normalizeStringList(args.researchInterests),
            links: normalizeLinks(args.links),
            titles: args.titles,
            scholarUrl: args.scholarUrl,
            orcidUrl: args.orcidUrl,
            avatar: args.avatar,
            realPhoto: args.realPhoto,
            isClassMember: args.isClassMember ?? true,
            isEmailVerified: args.isEmailVerified ?? false,
            createdAt: now,
            updatedAt: now,
        })

        if (args.password && args.password.trim()) {
            const salt = generateSalt()
            const hash = await sha256Hex(args.password + salt)

            const existingCredential = await ctx.db
                .query("authCredentials")
                .filter((q) => q.eq(q.field("userId"), userId))
                .first()

            if (existingCredential) {
                await ctx.db.patch(existingCredential._id, {
                    passwordHash: hash,
                    salt,
                })
            } else {
                await ctx.db.insert("authCredentials", {
                    userId,
                    passwordHash: hash,
                    salt,
                })
            }
        }

        return userId
    },
})

// Update user profile
export const update = mutation({
    args: {
        id: v.id("users"),
        email: v.optional(v.string()),
        username: v.optional(v.string()),
        englishName: v.optional(v.string()),
        chineseName: v.optional(v.string()),
        organization: v.optional(v.union(v.literal("pku"), v.literal("thu"))),
        cohort: v.optional(v.union(v.number(), v.literal("mascot"))),
        studentId: v.optional(v.string()),
        role: v.optional(v.union(v.literal("member"), v.literal("admin"), v.literal("super_admin"))),
        personalEmails: v.optional(v.array(v.string())),
        personalEmail: v.optional(v.string()),
        bio: v.optional(v.string()),
        profileMarkdown: v.optional(v.string()),
        researchDirections: v.optional(v.array(v.string())),
        researchInterests: v.optional(v.array(v.string())),
        links: v.optional(v.array(v.object({ type: linkTypeValidator, label: v.string(), url: v.string() }))),
        titles: v.optional(v.array(v.object({ title: v.string(), link: v.string() }))),
        scholarUrl: v.optional(v.string()),
        orcidUrl: v.optional(v.string()),
        avatar: v.optional(v.string()),
        realPhoto: v.optional(v.string()),
        isClassMember: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args

        const user = await ctx.db.get(id)

        if (!user) {
            throw new Error("User not found")
        }

        const nextEmail = updates.email ? normalizeEmail(updates.email) : undefined
        const nextUsername = updates.username ? normalizeUsername(updates.username) : undefined
        const nextStudentId = updates.studentId ? normalizeStudentId(updates.studentId) : undefined

        if (nextEmail && nextEmail !== user.email) {
            const existingByEmail = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("email"), nextEmail))
                .first()

            if (existingByEmail && existingByEmail._id !== id) {
                throw new Error("User email already exists")
            }
        }

        if (nextUsername && nextUsername !== user.username) {
            const existingByUsername = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("username"), nextUsername))
                .first()

            if (existingByUsername && existingByUsername._id !== id) {
                throw new Error("Username already exists")
            }
        }

        if (nextStudentId && nextStudentId !== user.studentId) {
            const existingByStudentId = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("studentId"), nextStudentId))
                .first()

            if (existingByStudentId && existingByStudentId._id !== id) {
                throw new Error("Student ID already exists")
            }
        }

        if (updates.profileMarkdown && updates.profileMarkdown.length > PROFILE_MARKDOWN_MAX_LENGTH) {
            throw new Error(`Profile markdown cannot exceed ${PROFILE_MARKDOWN_MAX_LENGTH} characters`)
        }

        const patchData = pickDefined({
            ...updates,
            englishName: updates.englishName?.trim(),
            chineseName: normalizeOptionalString(updates.chineseName),
            personalEmails: normalizeStringList(updates.personalEmails),
            bio: normalizeOptionalString(updates.bio),
            researchDirections: normalizeStringList(updates.researchDirections),
            researchInterests: normalizeStringList(updates.researchInterests),
            links: normalizeLinks(updates.links),
            profileMarkdown: updates.profileMarkdown ? normalizeProfileMarkdown(updates.profileMarkdown) : updates.profileMarkdown,
            email: nextEmail,
            username: nextUsername,
            studentId: nextStudentId,
            updatedAt: Date.now(),
        })

        await ctx.db.patch(id, patchData)

        return id
    },
})

export const markEmailVerified = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId)
        if (!user) {
            throw new Error("User not found")
        }

        await ctx.db.patch(args.userId, {
            isEmailVerified: true,
            updatedAt: Date.now(),
        })

        return args.userId
    },
})

export const touchVerificationRequest = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId)
        if (!user) {
            throw new Error("User not found")
        }

        await ctx.db.patch(args.userId, {
            lastVerificationRequestedAt: Date.now(),
            updatedAt: Date.now(),
        })

        return args.userId
    },
})

export const updatePasswordByUserId = mutation({
    args: {
        userId: v.id("users"),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        if (args.newPassword.length < PASSWORD_MIN_LENGTH) {
            throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
        }

        const user = await ctx.db.get(args.userId)
        if (!user) {
            throw new Error("User not found")
        }

        const salt = generateSalt()
        const hash = await sha256Hex(args.newPassword + salt)

        const existingCredential = await ctx.db
            .query("authCredentials")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .first()

        if (existingCredential) {
            await ctx.db.patch(existingCredential._id, {
                passwordHash: hash,
                salt,
            })
        } else {
            await ctx.db.insert("authCredentials", {
                userId: args.userId,
                passwordHash: hash,
                salt,
            })
        }

        await ctx.db.patch(args.userId, {
            updatedAt: Date.now(),
        })

        return args.userId
    },
})

export const resetPasswordAsSuperAdmin = mutation({
    args: {
        requesterId: v.id("users"),
        targetUserId: v.id("users"),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        if (args.newPassword.length < PASSWORD_MIN_LENGTH) {
            throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
        }

        const [requester, targetUser] = await Promise.all([
            ctx.db.get(args.requesterId),
            ctx.db.get(args.targetUserId),
        ])

        if (!requester) {
            throw new Error("Requester not found")
        }

        if (requester.role !== "super_admin") {
            throw new Error("Only super admins can reset another user's password")
        }

        if (!targetUser) {
            throw new Error("User not found")
        }

        const salt = generateSalt()
        const hash = await sha256Hex(args.newPassword + salt)

        const existingCredential = await ctx.db
            .query("authCredentials")
            .filter((q) => q.eq(q.field("userId"), args.targetUserId))
            .first()

        if (existingCredential) {
            await ctx.db.patch(existingCredential._id, {
                passwordHash: hash,
                salt,
            })
        } else {
            await ctx.db.insert("authCredentials", {
                userId: args.targetUserId,
                passwordHash: hash,
                salt,
            })
        }

        await ctx.db.patch(args.targetUserId, {
            updatedAt: Date.now(),
        })

        return args.targetUserId
    },
})

export const updatePasswordWithCurrent = mutation({
    args: {
        userId: v.id("users"),
        currentPassword: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        if (args.newPassword.length < PASSWORD_MIN_LENGTH) {
            throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
        }

        const user = await ctx.db.get(args.userId)
        if (!user) {
            throw new Error("User not found")
        }

        const credential = await ctx.db
            .query("authCredentials")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .first()

        if (!credential) {
            throw new Error("No password is set for this account")
        }

        const currentPasswordMatches = await verifyPassword(args.currentPassword, credential)
        if (!currentPasswordMatches) {
            throw new Error("Current password is incorrect")
        }

        const newSalt = generateSalt()
        const newHash = await sha256Hex(args.newPassword + newSalt)

        await ctx.db.patch(credential._id, {
            passwordHash: newHash,
            salt: newSalt,
        })

        await ctx.db.patch(args.userId, {
            updatedAt: Date.now(),
        })

        return args.userId
    },
})

// Update user role (admin only)
export const updateRole = mutation({
    args: {
        id: v.id("users"),
        role: v.union(v.literal("member"), v.literal("admin"), v.literal("super_admin")),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id)

        if (!user) {
            throw new Error("User not found")
        }

        await ctx.db.patch(args.id, {
            role: args.role,
            updatedAt: Date.now(),
        })

        return args.id
    },
})

// Update user profile markdown with owner/super_admin authorization.
export const updateProfileMarkdown = mutation({
    args: {
        userId: v.id("users"),
        requesterId: v.id("users"),
        profileMarkdown: v.string(),
    },
    handler: async (ctx, args) => {
        const [targetUser, requester] = await Promise.all([
            ctx.db.get(args.userId),
            ctx.db.get(args.requesterId),
        ])

        if (!targetUser) {
            throw new Error("User not found")
        }

        if (!requester) {
            throw new Error("Requester not found")
        }

        const canEdit = requester._id === targetUser._id || requester.role === "super_admin"
        if (!canEdit) {
            throw new Error("Unauthorized to edit profile markdown")
        }

        if (args.profileMarkdown.length > PROFILE_MARKDOWN_MAX_LENGTH) {
            throw new Error(`Profile markdown cannot exceed ${PROFILE_MARKDOWN_MAX_LENGTH} characters`)
        }

        await ctx.db.patch(args.userId, {
            profileMarkdown: normalizeProfileMarkdown(args.profileMarkdown),
            updatedAt: Date.now(),
        })

        return args.userId
    },
})

// Delete a user (admin only)
export const remove = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id)

        if (!user) {
            throw new Error("User not found")
        }

        const credential = await ctx.db
            .query("authCredentials")
            .filter((q) => q.eq(q.field("userId"), args.id))
            .first()

        if (credential) {
            await ctx.db.delete(credential._id)
        }

        await ctx.db.delete(args.id)
        return args.id
    },
})

export const getByProfileSlug = query({
    args: { slug: v.string(), includeHidden: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        const slug = args.slug.trim()
        const normalizedSlug = slug.toLowerCase()
        if (!slug) return null

        const users = await ctx.db.query("users").collect()
        const visibleUsers = args.includeHidden ? users : users.filter(isVisibleClassMember)
        return (
            visibleUsers.find((user) => user.username?.toLowerCase() === normalizedSlug) ||
            visibleUsers.find((user) => String(user._id) === slug) ||
            null
        )
    },
})

// Simple login for local development
export const simpleLogin = mutation({
    args: {
        studentId: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const studentId = normalizeStudentId(args.studentId)

        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("studentId"), studentId))
            .first()

        if (!user) {
            throw new Error("学号或密码错误")
        }

        const credential = await ctx.db
            .query("authCredentials")
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first()

        if (!credential) {
            throw new Error("密码未设置")
        }

        const passwordMatches = await verifyPassword(args.password, credential)
        if (!passwordMatches) {
            throw new Error("学号或密码错误")
        }

        if (!credential.salt) {
            const salt = generateSalt()
            const hash = await sha256Hex(args.password + salt)
            await ctx.db.patch(credential._id, {
                passwordHash: hash,
                salt,
            })
        }

        return {
            success: true,
            userId: user._id,
            email: user.email,
            role: user.role,
            sessionToken: await createAuthSession(ctx, user._id),
        }
    },
})

// Get users count
export const count = query({
    args: {
        organization: v.optional(v.union(v.literal("pku"), v.literal("thu"))),
        classMembersOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        let usersQuery = ctx.db.query("users")

        if (args.organization) {
            usersQuery = usersQuery.filter((q) => q.eq(q.field("organization"), args.organization))
        }

        const users = await usersQuery.collect()
        if (args.classMembersOnly) return users.filter(isVisibleClassMember).length
        return users.length
    },
})

// Search users by name
export const search = query({
    args: { query: v.string(), classMembersOnly: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        const keyword = args.query.trim()

        // Some Convex versions/types do not expose a string "contains" filter
        // on the query builder. To avoid type mismatches across Convex releases,
        // collect a reasonable subset and filter in JS here. This is acceptable
        // for small datasets; consider adding a searchIndex for production scale.
        const allUsers = await ctx.db.query("users").collect()
        const visibleUsers = args.classMembersOnly ? allUsers.filter(isVisibleClassMember) : allUsers
        const users = visibleUsers
            .filter((u) => {
                const name = (u.englishName || "").toString()
                const uname = (u.username || "").toString()
                return name.includes(keyword) || uname.includes(keyword)
            })
            .slice(0, 20)

        return users
    },
})
