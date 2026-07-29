import { cn } from "@/lib/utils"

/** Hairline rule — the only separator allowed in the editorial system. */
export function AiaRule({ className }: { className?: string }) {
  return <hr aria-hidden="true" className={cn("aia-hr w-full", className)} />
}
