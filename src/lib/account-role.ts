import type { UserRole } from "@/types"

/**
 * Presentation labels for the persisted account roles. `member` remains the
 * storage and authorization value for existing accounts, but is presented as
 * the undergraduate identity in AIA.
 */
export const accountRoleLabels: Record<UserRole, string> = {
  member: "本科生（Undergrad）",
  admin: "管理员",
  super_admin: "超级管理员",
}

export const accountRoleOptions = [
  { value: "member", label: accountRoleLabels.member },
  { value: "admin", label: accountRoleLabels.admin },
  { value: "super_admin", label: accountRoleLabels.super_admin },
] as const satisfies readonly { value: UserRole; label: string }[]

export function getAccountRoleLabel(role: UserRole | string | null | undefined) {
  if (role === "member" || role === "admin" || role === "super_admin") {
    return accountRoleLabels[role]
  }

  return "未知角色"
}
