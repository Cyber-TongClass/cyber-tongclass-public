export type ManagedUserRole = "member" | "admin" | "super_admin"

const isAccountManager = (role: ManagedUserRole) => role === "admin" || role === "super_admin"

export function assertCanManageAccount(
  actorRole: ManagedUserRole,
  targetRole: ManagedUserRole,
) {
  if (!isAccountManager(actorRole)) {
    throw new Error("只有管理员可以管理系统账号")
  }

  if (targetRole === "super_admin" && actorRole !== "super_admin") {
    throw new Error("只有超级管理员可以管理超级管理员账号")
  }
}

export function assertCanProvisionAccount(
  actorRole: ManagedUserRole,
  requestedRole: ManagedUserRole,
) {
  if (!isAccountManager(actorRole)) {
    throw new Error("只有管理员可以创建系统账号")
  }

  if (requestedRole === "super_admin" && actorRole !== "super_admin") {
    throw new Error("只有超级管理员可以创建超级管理员账号")
  }
}

export function assertCanSetManagedRole(
  actorRole: ManagedUserRole,
  targetRole: ManagedUserRole,
  requestedRole: ManagedUserRole,
) {
  assertCanManageAccount(actorRole, targetRole)

  if (requestedRole === "super_admin" && actorRole !== "super_admin") {
    throw new Error("只有超级管理员可以授予超级管理员角色")
  }
}
