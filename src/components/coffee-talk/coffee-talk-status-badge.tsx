import type { BadgeProps } from "@/components/ui/badge"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type CoffeeTalkStatus =
  | "submitted"
  | "under_review"
  | "needs_information"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "cancelled"
  | "completed"

type CoffeeTalkBadgeVariant = NonNullable<BadgeProps["variant"]>

export const coffeeTalkStatusLabels: Record<CoffeeTalkStatus, string> = {
  submitted: "已提交",
  under_review: "审核中",
  needs_information: "待补充信息",
  accepted: "已接受",
  declined: "未接受",
  withdrawn: "已撤回",
  cancelled: "已取消",
  completed: "已完成",
}

const coffeeTalkStatusVariants: Record<CoffeeTalkStatus, CoffeeTalkBadgeVariant> = {
  submitted: "secondary",
  under_review: "outline",
  needs_information: "warning",
  accepted: "success",
  declined: "destructive",
  withdrawn: "secondary",
  cancelled: "secondary",
  completed: "success",
}

export interface CoffeeTalkStatusBadgeProps {
  status: CoffeeTalkStatus
  className?: string
}

export function CoffeeTalkStatusBadge({ status, className }: CoffeeTalkStatusBadgeProps) {
  return (
    <Badge
      variant={coffeeTalkStatusVariants[status]}
      className={cn("rounded-md", className)}
      aria-label={`Coffee Talk 申请状态：${coffeeTalkStatusLabels[status]}`}
    >
      {coffeeTalkStatusLabels[status]}
    </Badge>
  )
}
