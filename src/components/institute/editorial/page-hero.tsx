import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { AiaKicker } from "./kicker"

/** Editorial page opener: kicker, serif display title, lede, hairline base. */
export function AiaPageHero({
  kicker,
  title,
  lede,
  children,
  className,
}: {
  kicker: string
  title: string
  lede?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("border-b aia-border-rule", className)}>
      <div className="container-custom py-14 sm:py-20">
        <AiaKicker>{kicker}</AiaKicker>
        <h1 className="aia-serif mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.15] tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
          {title}
        </h1>
        {lede ? (
          <p className="aia-text-muted mt-6 max-w-2xl text-base leading-8">{lede}</p>
        ) : null}
        {children}
      </div>
    </header>
  )
}
