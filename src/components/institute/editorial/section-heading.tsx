import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

import { AiaKicker } from "./kicker"
import { AiaRule } from "./rule"

/** Section opener: kicker + serif title + optional quiet "view all" link, closed by a hairline. */
export function AiaSectionHeading({
  kicker,
  index,
  title,
  description,
  href,
  hrefLabel,
  headingId,
  className,
}: {
  kicker: string
  index?: string
  title: string
  description?: string
  href?: string
  hrefLabel?: string
  headingId?: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-2xl">
          <AiaKicker index={index}>{kicker}</AiaKicker>
          <h2
            id={headingId}
            className="aia-serif mt-4 text-3xl font-semibold leading-tight tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="aia-text-muted mt-4 max-w-xl text-sm leading-7">{description}</p>
          ) : null}
        </div>
        {href && hrefLabel ? (
          <Link
            href={href}
            className="aia-kicker aia-focus inline-flex items-center gap-1.5 pb-1 transition-colors hover:text-[hsl(var(--aia-red-deep))]"
          >
            {hrefLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <AiaRule />
    </div>
  )
}
