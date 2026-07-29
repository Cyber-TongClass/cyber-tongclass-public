"use client"

import Link from "next/link"
import { RotateCcw } from "lucide-react"

export function RouteErrorState({
  reset,
  fallbackHref,
  fallbackLabel,
  contextLabel,
}: {
  reset: () => void
  fallbackHref: string
  fallbackLabel: string
  contextLabel: string
}) {
  return (
    <div
      role="alert"
      aria-labelledby="route-error-title"
      className="container-custom flex min-h-[50vh] flex-col justify-center py-16 sm:py-20"
    >
      <p className="aia-kicker">{contextLabel}</p>
      <h1 id="route-error-title" className="aia-serif mt-5 text-3xl font-semibold text-[hsl(var(--aia-ink))]">
        当前内容加载失败
      </h1>
      <p className="aia-text-muted mt-4 max-w-xl text-sm leading-7">
        你的当前位置尚未改变。可以就地重试，或返回稳定入口后继续操作。
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="aia-focus inline-flex min-h-11 items-center gap-2 border border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))] px-4 py-2.5 text-sm font-medium text-white"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          重试
        </button>
        <Link
          href={fallbackHref}
          className="aia-focus inline-flex min-h-11 items-center border aia-border-rule px-4 py-2.5 text-sm font-medium text-[hsl(var(--aia-ink))]"
        >
          {fallbackLabel}
        </Link>
      </div>
    </div>
  )
}
