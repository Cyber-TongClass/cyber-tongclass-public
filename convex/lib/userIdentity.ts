/**
 * AIA account identity is a descriptive group, independent from the
 * persisted Tong Class access role. Do not use this module to grant broad
 * permissions: authorization continues to use `users.role` and explicit
 * feature bindings.
 */
export const userIdentityTypes = ["undergrad", "graduate", "teacher", "other"] as const

export type UserIdentityType = typeof userIdentityTypes[number]
export type UserAccessRole = "member" | "admin" | "super_admin"

export function isUserIdentityType(value: unknown): value is UserIdentityType {
  return typeof value === "string" && userIdentityTypes.includes(value as UserIdentityType)
}

/**
 * Resolves legacy rows without mutating them. `member` was the former student
 * role, so it deterministically presents as `undergrad`; administrative roles
 * receive the least-privileged descriptive group until a super administrator
 * assigns one explicitly.
 */
export function resolveUserIdentityType(input: {
  role?: UserAccessRole | string | null
  identityType?: UserIdentityType | string | null
}): UserIdentityType {
  if (isUserIdentityType(input.identityType)) return input.identityType
  return input.role === "member" ? "undergrad" : "other"
}

/**
 * New member accounts receive a server-derived compatibility tag. We do not
 * infer a teacher or graduate identity from an administrative access role.
 */
export function getDefaultStoredIdentityType(
  role: UserAccessRole,
): UserIdentityType | undefined {
  return role === "member" ? "undergrad" : undefined
}

/** Explicit identity changes are a super-administrator-only account action. */
export function assertCanAssignUserIdentityType(actorRole: UserAccessRole) {
  if (actorRole !== "super_admin") {
    throw new Error("只有超级管理员可以设置用户身份组")
  }
}
