import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { OAReviewStatus } from "@/types"

const reviewStatusPresentation: Record<OAReviewStatus, { label: string; variant: "secondary" | "success" | "warning" | "destructive" }> = {
  pending: { label: "待处理", variant: "warning" },
  approved: { label: "已通过", variant: "success" },
  rejected: { label: "未通过", variant: "destructive" },
  needs_changes: { label: "待补充", variant: "secondary" },
}

export function AiaOAReviewStatusBadge({ status }: { status: OAReviewStatus }) {
  const presentation = reviewStatusPresentation[status] || reviewStatusPresentation.pending
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>
}

export function formatAiaOATime(value?: number) {
  if (!value || !Number.isFinite(value)) return "—"
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function AiaOALoginRequired({ nextPath, action }: { nextPath: string; action: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
      登录后才能{action}。
      <Link
        className="ml-2 font-medium text-primary underline-offset-4 hover:underline"
        href={`/login?next=${encodeURIComponent(nextPath)}`}
      >
        前往登录
      </Link>
    </div>
  )
}

export function AiaOAAuthLoading() {
  return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在确认登录状态…</p>
}

export function AiaOAServiceBackLink() {
  return (
    <Link
      href="/services/oa"
      className="inline-flex items-center text-sm font-medium text-slate-700 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      ← 返回 OA 与审批
    </Link>
  )
}
