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
      className="mx-auto max-w-2xl border border-dashed aia-border-rule px-6 py-10 text-center sm:px-10"
      role="status"
      aria-labelledby="coffee-talk-unavailable-title"
    >
      <p className="aia-kicker justify-center">Coffee Talk</p>
      <AlertCircle className="mx-auto mt-4 h-7 w-7 text-[hsl(var(--aia-red))]" aria-hidden="true" />
      <h1 id="coffee-talk-unavailable-title" className="aia-serif mt-4 text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">{title}</h1>
      <p className="aia-text-muted mt-3 leading-7">{message}</p>
      <Link href={returnHref} className="aia-link mt-6 inline-block text-sm">
        ← 返回 Coffee Talk 说明页
      </Link>
    </section>
  )
}
