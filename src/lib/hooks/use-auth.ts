"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { makeFunctionReference } from "convex/server"
import type { UserRole } from "@/types"

const TONGCLASS_SESSION_TOKEN_KEY = "tongclass_session_token"
const TONGCLASS_AUTH_STORAGE_EVENT = "tongclass-auth-storage"
const currentUserRef = makeFunctionReference<"query">("auth:currentUser")
const currentUserBySessionRef = makeFunctionReference<"query">("auth:currentUserBySession")
const simpleLoginRef = makeFunctionReference<"mutation">("users:simpleLogin")
const signOutRef = makeFunctionReference<"mutation">("auth:signOut")

function readStoredSessionToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TONGCLASS_SESSION_TOKEN_KEY)
}

function subscribeStoredSessionToken(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("storage", onStoreChange)
  window.addEventListener(TONGCLASS_AUTH_STORAGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(TONGCLASS_AUTH_STORAGE_EVENT, onStoreChange)
  }
}

function notifyStoredSessionTokenChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(TONGCLASS_AUTH_STORAGE_EVENT))
}

export function useAuth() {
  const router = useRouter()
  const storedSessionToken = useSyncExternalStore(
    subscribeStoredSessionToken,
    readStoredSessionToken,
    () => null
  )

  // Also query Convex session-backed current user (server-side identity)
  const sessionUser = useQuery(currentUserRef)
  const tokenUser = useQuery(
    currentUserBySessionRef,
    storedSessionToken ? { sessionToken: storedSessionToken } : "skip"
  )

  // Prefer the explicit local session token when present; it represents the account
  // the user selected through this app's login flow.
  const isUserQueryPending = storedSessionToken !== null && tokenUser === undefined
  const currentUser = storedSessionToken
    ? (!isUserQueryPending ? tokenUser || null : null)
    : sessionUser || null
  
  // Get user role
  const currentRole = currentUser?.role ?? null
  
  // Convert to loading state
  const isLoading = (sessionUser === undefined && !storedSessionToken) || isUserQueryPending

  // Login mutation
  const loginMutation = useMutation(simpleLoginRef)
  const signOutMutation = useMutation(signOutRef)

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const result = await loginMutation({ 
        studentId: identifier.trim(),
        password: password 
      })
      
      if (result && "email" in result && result.email && "sessionToken" in result && result.sessionToken) {
        localStorage.setItem(TONGCLASS_SESSION_TOKEN_KEY, result.sessionToken)
        localStorage.setItem("tongclass_user_email", result.email)
        notifyStoredSessionTokenChanged()
        
        return { ok: true, user: result }
      }
      return { ok: false, error: "登录失败" }
    } catch (error: unknown) {
      const err = error as { message?: string }
      return { ok: false, error: err.message || "登录失败" }
    }
  }, [loginMutation])

  const logout = useCallback(async (redirectTo?: unknown) => {
    const sessionToken = localStorage.getItem(TONGCLASS_SESSION_TOKEN_KEY)
    if (sessionToken) {
      try {
        await signOutMutation({ sessionToken })
      } catch {
        // Local cleanup should still happen if the network request fails.
      }
    }
    localStorage.removeItem("tongclass_user_email")
    localStorage.removeItem("tongclass_user_id")
    localStorage.removeItem(TONGCLASS_SESSION_TOKEN_KEY)
    notifyStoredSessionTokenChanged()
    router.push(typeof redirectTo === "string" ? redirectTo : "/")
    router.refresh()
  }, [router, signOutMutation])

  // Determine admin status from user data
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin"
  const isSuperAdmin = currentUser?.role === "super_admin"

  return {
    currentUser,
    currentRole,
    isAdmin,
    isSuperAdmin,
    isLoading,
    isAuthenticated: !!currentUser,
    logout,
    login,
    isStudentIdAllowed: async () => true,
  }
}

export function useRole(requiredRole: UserRole) {
  const { currentRole } = useAuth()

  if (requiredRole === "super_admin") {
    return currentRole === "super_admin"
  }
  if (requiredRole === "admin") {
    return currentRole === "admin" || currentRole === "super_admin"
  }
  return !!currentRole
}

export function useCanManage(targetRole: UserRole) {
  const { currentRole } = useAuth()

  const roleCanManage = useCallback((actor: UserRole | null, target: UserRole) => {
    if (!actor) return false

    const level: Record<UserRole, number> = {
      member: 0,
      admin: 1,
      super_admin: 2,
    }

    return level[actor] > level[target]
  }, [])

  return useMemo(() => roleCanManage(currentRole, targetRole), [currentRole, targetRole, roleCanManage])
}
