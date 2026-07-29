import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

/** Numbered editorial index row: 01 · serif title · meta, separated by hairlines. */
export function AiaIndexRow({
  index,
  href,
  title,
  meta,
  description,
  className,
}: {
  index: string
  href: string
  title: string
  meta?: string
  description?: string
  className?: string
}) {
  return (
    <li className={cn("group border-b aia-border-rule", className)}>
      <Link
        href={href}
        className="aia-focus grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 py-5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-8"
      >
        <span className="aia-mono text-sm text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
          {index}
        </span>
        <span className="min-w-0">
          <span className="aia-serif block text-xl font-semibold leading-snug text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))] sm:text-2xl">
            {title}
          </span>
          {description ? (
            <span className="aia-text-muted mt-1.5 block max-w-2xl text-sm leading-6">
              {description}
            </span>
          ) : null}
        </span>
        <span className="hidden items-center gap-3 sm:flex">
          {meta ? (
            <span className="aia-mono text-xs uppercase tracking-[0.14em] text-[hsl(var(--aia-muted))]">
              {meta}
            </span>
          ) : null}
          <ArrowUpRight
            className="h-4 w-4 text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  )
}
