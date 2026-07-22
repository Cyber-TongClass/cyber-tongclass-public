import Link from "next/link"
import { AlertCircle } from "lucide-react"

export interface CoffeeTalkBackendUnavailableStateProps {
  title?: string
  message?: string
  returnHref?: `/${string}`
}

export function CoffeeTalkBackendUnavailableState({
  title = "Coffee Talk 服务暂未开放",
  message = "当前申请和状态查询服务正在接入。请稍后再试。",
  returnHref = "/services/coffee-talk",
}: CoffeeTalkBackendUnavailableStateProps) {
  return (
    <section
      className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm sm:p-8"
      role="status"
      aria-labelledby="coffee-talk-unavailable-title"
    >
      <AlertCircle className="mx-auto h-9 w-9 text-amber-700" aria-hidden="true" />
      <h1 id="coffee-talk-unavailable-title" className="mt-4 text-2xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-3 leading-7 text-slate-700">{message}</p>
      <Link
        href={returnHref}
        className="mt-6 inline-flex min-h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        返回 Coffee Talk 说明页
      </Link>
    </section>
  )
}
