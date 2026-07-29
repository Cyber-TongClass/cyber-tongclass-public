export type ContentActor = {
  _id: unknown
  role?: "member" | "admin" | "super_admin" | string
  accountStatus?: "active" | "disabled"
  isClassMember?: boolean
}

export function requireTongClassMember<T extends ContentActor>(actor: T): T {
  if (actor.accountStatus === "disabled") {
    throw new Error("账号不可用")
  }
  if (
    actor.isClassMember !== true
    && actor.role !== "admin"
    && actor.role !== "super_admin"
  ) {
    throw new Error("仅通班成员可访问")
  }
  return actor
}

export function requireContentAdmin<T extends ContentActor>(actor: T): T {
  if (actor.accountStatus === "disabled") {
    throw new Error("账号不可用")
  }
  if (actor.role !== "admin" && actor.role !== "super_admin") {
    throw new Error("需要管理员权限")
  }
  return actor
}

export function assertPublicationWriteAccess(
  actor: ContentActor,
  ownerId: unknown,
): void {
  if (actor.accountStatus === "disabled") {
    throw new Error("账号不可用")
  }
  const isAdmin = actor.role === "admin" || actor.role === "super_admin"
  if (!isAdmin && String(actor._id) !== String(ownerId)) {
    throw new Error("无权修改该学术成果")
  }
}
