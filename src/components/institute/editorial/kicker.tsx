import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Editorial section marker: mono uppercase kicker with optional 01-style index. */
export function AiaKicker({
  children,
  index,
  className,
}: {
  children: ReactNode
  index?: string
  className?: string
}) {
  return (
    <p className={cn("aia-kicker flex items-baseline gap-3", className)}>
      {index ? (
        <span className="text-[hsl(var(--aia-muted))]" aria-hidden="true">
          {index}
        </span>
      ) : null}
      <span>{children}</span>
    </p>
  )
}
