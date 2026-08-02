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

/**
 * Legacy news/events mutations publish directly and therefore bypass the
 * creator -> reviewer workflow. Keep that escape hatch exclusive to the
 * super administrator; permission-granted creators must use contentReview.submit.
 */
export function requireSuperAdminForDirectContentCreate<T extends ContentActor>(
  actor: T,
): T {
  if (actor.accountStatus === "disabled") {
    throw new Error("账号不可用")
  }
  if (actor.role !== "super_admin") {
    throw new Error("请通过内容审核流程提交")
  }
  return actor
}

export async function requireContentManager<T extends ContentActor>(
  ctx: any,
  actor: T,
  category: "news" | "events",
): Promise<T> {
  if (actor.accountStatus === "disabled") {
    throw new Error("账号不可用")
  }
  const permission = await ctx.db
    .query("contentPermissions")
    .withIndex("by_category_user", (q: any) =>
      q.eq("category", category).eq("userId", actor._id))
    .first()
  if (permission?.canManage !== true) {
    throw new Error(category === "news" ? "需要新闻管理权限" : "需要活动管理权限")
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
