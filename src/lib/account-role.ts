import type { UserIdentityType, UserRole } from "@/types"

/**
 * Presentation labels for the persisted account roles. `member` remains the
 * storage and authorization value for existing accounts, presented as a plain
 * user with no management privileges.
 */
export const accountRoleLabels: Record<UserRole, string> = {
  member: "普通用户",
  admin: "管理员",
  super_admin: "超级管理员",
}

export const accountRoleOptions = [
  { value: "member", label: accountRoleLabels.member },
  { value: "admin", label: accountRoleLabels.admin },
  { value: "super_admin", label: accountRoleLabels.super_admin },
] as const satisfies readonly { value: UserRole; label: string }[]

/** AIA identity labels are descriptive and never replace access-role checks. */
export const accountIdentityTypeLabels: Record<UserIdentityType, string> = {
  undergrad: "本科生（Undergrad）",
  graduate: "研究生（Graduate）",
  teacher: "教师（Teacher）",
  other: "其他（Other）",
}

/** Membership scopes are independent of authorization roles. */
export const accountIdentityTypeOptions = [
  { value: "undergrad", label: "本科生" },
  { value: "graduate", label: "研究生" },
  { value: "teacher", label: "教师" },
  { value: "other", label: "其他成员资格组" },
] as const satisfies readonly { value: UserIdentityType; label: string }[]

export function resolveAccountIdentityType(
  identityType: UserIdentityType | string | null | undefined,
  role: UserRole | string | null | undefined,
): UserIdentityType {
  if (
    identityType === "undergrad" ||
    identityType === "graduate" ||
    identityType === "teacher" ||
    identityType === "other"
  ) {
    return identityType
  }

  return role === "member" ? "undergrad" : "other"
}

export function getAccountIdentityTypeLabel(
  identityType: UserIdentityType | string | null | undefined,
  role: UserRole | string | null | undefined,
) {
  return accountIdentityTypeLabels[resolveAccountIdentityType(identityType, role)]
}

export function getAccountRoleLabel(role: UserRole | string | null | undefined) {
  if (role === "member" || role === "admin" || role === "super_admin") {
    return accountRoleLabels[role]
  }

  return "未知角色"
}
