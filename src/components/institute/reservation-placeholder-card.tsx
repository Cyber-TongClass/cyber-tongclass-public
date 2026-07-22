import { Building2, LockKeyhole } from "lucide-react"

export function ReservationPlaceholderCard() {
  return (
    <div
      role="group"
      aria-disabled="true"
      aria-label="西楼预约，筹备中，暂不可用"
      className="flex min-h-full flex-col rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          暂不可用
        </span>
      </div>
      <h3 className="mt-6 text-xl font-bold text-slate-700">西楼预约 · 筹备中</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        西楼空间预约服务仍在筹备。本卡仅说明服务状态，不提供预约、日历或消息入口。
      </p>
    </div>
  )
}
