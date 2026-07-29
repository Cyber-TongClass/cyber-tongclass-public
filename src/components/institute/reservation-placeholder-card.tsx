import { Building2, LockKeyhole } from "lucide-react"

export function ReservationPlaceholderCard() {
  return (
    <div
      role="group"
      aria-disabled="true"
      aria-label="西楼预约，筹备中，暂不可用"
      className="flex min-h-full flex-col border border-dashed aia-border-rule p-6 text-[hsl(var(--aia-muted))]"
    >
      <div className="flex items-start justify-between gap-4">
        <Building2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="aia-mono inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          暂不可用
        </span>
      </div>
      <h3 className="aia-serif mt-6 text-xl font-semibold text-[hsl(var(--aia-ink))]">西楼预约 · 筹备中</h3>
      <p className="mt-3 text-sm leading-6">
        西楼空间预约服务仍在筹备。本卡仅说明服务状态，不提供预约、日历或消息入口。
      </p>
    </div>
  )
}
