import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"
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
    <div className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6 text-[hsl(var(--aia-ink))]">
      登录后才能{action}。
      <Link className="aia-link aia-focus ml-2 font-medium" href={`/login?next=${encodeURIComponent(nextPath)}`}>
        前往登录
      </Link>
    </div>
  )
}

export function AiaOAAuthLoading() {
  return (
    <p role="status" className="aia-text-muted py-6 text-sm">
      正在确认登录状态…
    </p>
  )
}

export function AiaOAServiceBackLink() {
  return (
    <SafeReturnLink fallback="/services/oa" className="aia-link aia-focus text-sm font-medium">
      ← 返回 OA 与审批
    </SafeReturnLink>
  )
}
