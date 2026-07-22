/**
 * Convex Auth API
 * 
 * 认证相关的查询函数
 * 注意：这是一个简化的认证系统，用于演示目的
 */

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getUserBySession } from "./reviewer/lib"
import { assertCanViewAccountRecords } from "./lib/userAccountPolicy"
import { toAdminUserDto, toCurrentUserDto } from "./lib/userDto"

const sha256Hex = async (input: string) => {
  const cryptoImpl = (globalThis as any).crypto || (global as any).crypto
  const enc = new TextEncoder().encode(input)
  const hashBuffer = await cryptoImpl.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hashBuffer)).map((b: number) => b.toString(16).padStart(2, "0")).join("")
}

const toCurrentAccountDto = (user: any) => ({
  _id: user._id,
  ...toCurrentUserDto(user),
})

const toAdminAccountDto = (user: any) => ({
  id: String(user._id),
  ...toAdminUserDto(user),
})

// Check if student ID is allowed to register
export const isStudentIdAllowed = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const authConfig = await ctx.db.query("authConfig").first()
    if (!authConfig) {
      return true
    }
    return authConfig.allowedStudentIds.includes(args.studentId)
  },
})

// Get current user - simplified version that checks database directly
// In production, this would use proper session/JWT authentication
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    // This is a simplified version - in production you'd use proper auth
    // For now, we return null and let the client handle auth state
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email!))
      .first()

    return user ? toCurrentAccountDto(user) : null
  },
})

export const currentUserBySession = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return null

    const tokenHash = await sha256Hex(args.sessionToken)
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first()

    if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
      return null
    }

    const user = await ctx.db.get(session.userId)
    return user ? toCurrentAccountDto(user) : null
  },
})

// Email lookup is limited to account-management workflows.
export const getUserByEmail = query({
  args: {
    email: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await getUserBySession(ctx, args.sessionToken)
    assertCanViewAccountRecords(actor.role)
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first()
    return user ? toAdminAccountDto(user) : null
  },
})

// Get current user role
export const currentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email!))
      .first()

    return user?.role || null
  },
})

// Check if user is admin
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return false

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email!))
      .first()
    
    const role = user?.role
    return role === "admin" || role === "super_admin"
  },
})

// Check if user is super admin
export const isSuperAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return false

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email!))
      .first()
    
    const role = user?.role
    return role === "super_admin"
  },
})

// Sign out
export const signOut = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.sessionToken) {
      const tokenHash = await sha256Hex(args.sessionToken)
      const session = await ctx.db
        .query("authSessions")
        .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
        .first()

      if (session && !session.revokedAt) {
        await ctx.db.patch(session._id, { revokedAt: Date.now() })
      }
    }

    return { success: true }
  },
})
