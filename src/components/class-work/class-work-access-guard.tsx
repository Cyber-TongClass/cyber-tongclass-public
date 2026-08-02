"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { useMyContentPermissions, type ContentReviewCategory } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"

export type ClassWorkCapability = "create" | "manage" | "either"

const categoryLabels: Record<ContentReviewCategory, string> = {
  news: "新闻",
  events: "活动",
}

export function ClassWorkAccessGuard({
  category,
  capability,
  children,
}: {
  category: ContentReviewCategory
  capability: ClassWorkCapability
  children: ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const permissions = useMyContentPermissions()

  if (isLoading || (isAuthenticated && permissions === undefined)) {
    return <p role="status" className="aia-text-muted py-10 text-sm">正在确认班级工作权限…</p>
  }

  if (!isAuthenticated) {
    const next = capability === "create"
      ? `/class-work/${category}/new`
      : `/class-work/${category}/manage`
    return (
      <div className="border border-dashed aia-border-rule px-5 py-4 text-sm leading-6 text-[hsl(var(--aia-ink))]">
        登录后才能进入班级工作。
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="aia-link aia-focus ml-2 font-medium">
          前往登录
        </Link>
      </div>
    )
  }

  const rights = permissions?.[category]
  const allowed = capability === "either"
    ? true
    : capability === "create"
      ? rights?.canCreate === true
      : rights?.canManage === true

  if (!allowed) {
    const action = capability === "manage" ? "管理" : capability === "create" ? "创建" : "访问"
    return (
      <div className="border border-dashed aia-border-rule px-5 py-4">
        <p className="text-sm font-medium text-[hsl(var(--aia-ink))]">
          你没有{action}{categoryLabels[category]}的权限。
        </p>
        <p className="aia-text-muted mt-1 text-sm leading-6">如工作职责有变，请联系平台超级管理员调整权限。</p>
        <Link href="/portal/list" className="aia-link aia-focus mt-3 inline-block text-sm font-medium">返回服务门户</Link>
      </div>
    )
  }

  return <>{children}</>
}
