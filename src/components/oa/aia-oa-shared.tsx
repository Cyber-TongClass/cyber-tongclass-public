import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
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

/** Inline overflow control for capped OA lists: "展开剩余 N 项" / "收起". */
export function AiaOAListOverflowButton({
  expanded,
  remaining,
  onToggle,
}: {
  expanded: boolean
  remaining: number
  onToggle: () => void
}) {
  const Icon = expanded ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      onClick={onToggle}
      className="aia-focus aia-mono inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))]"
    >
      {expanded ? "收起" : `展开剩余 ${remaining} 项`}
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )
}

export function AiaOAServiceBackLink() {
  return (
    <SafeReturnLink fallback="/services/oa" className="aia-link aia-mono text-xs uppercase tracking-[0.14em]">
      ← 返回 OA 与审批
    </SafeReturnLink>
  )
}
