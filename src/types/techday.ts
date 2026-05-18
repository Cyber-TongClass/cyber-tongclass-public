export type TechDayRole = "author" | "volunteer" | "reviewer" | "admin"
export type TechDayTrack = "poster" | "demo"
export type TechDayReviewStatus = "pending" | "approved" | "rejected"
export type TechDayPublicationStatus = "accepted" | "published"
export type TechDayReimbursementStatus = "pending" | "approved" | "rejected" | "waiting_more"
export type TechDayPostVisibility = "public" | "authenticated" | "volunteer" | "author" | "reviewer" | "admin"

export function canUseTechDayAuthorTools(user?: { role?: TechDayRole; canSubmitPapers?: boolean } | null) {
  return user?.role === "author" || Boolean(user?.canSubmitPapers)
}

export const techDayRoleLabels: Record<TechDayRole, string> = {
  author: "作者",
  volunteer: "志愿者",
  reviewer: "审阅者",
  admin: "管理员",
}

export const techDayTrackLabels: Record<TechDayTrack, string> = {
  poster: "Poster Track",
  demo: "Demo Track",
}

export const techDayReviewStatusLabels: Record<TechDayReviewStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
}

export const techDayPublicationStatusLabels: Record<TechDayPublicationStatus, string> = {
  accepted: "中稿",
  published: "已发表",
}

export const techDayReimbursementStatusLabels: Record<TechDayReimbursementStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
  waiting_more: "等待补充材料",
}

export const techDayVisibilityLabels: Record<TechDayPostVisibility, string> = {
  public: "公开",
  authenticated: "登录用户",
  volunteer: "志愿者",
  author: "作者",
  reviewer: "审阅者",
  admin: "管理员",
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, headerLabels: Record<string, string> = {}) {
  if (typeof window === "undefined" || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`
  const csv = [
    headers.map((header) => escape(headerLabels[header] || header)).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n")
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
