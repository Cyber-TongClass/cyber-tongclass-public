"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, type ComponentProps, type ReactNode } from "react"
import { safeLocalPath } from "@/lib/safe-local-path"
import { cn } from "@/lib/utils"

type SafeReturnLinkProps = Omit<ComponentProps<typeof Link>, "href" | "children"> & {
  fallback: string
  children: ReactNode
}

export function SafeReturnLink({
  fallback,
  children,
  className,
  ...props
}: SafeReturnLinkProps) {
  const accessibleClassName = cn("inline-flex min-h-11 items-center", className)
  return (
    <Suspense fallback={<Link href={fallback} className={accessibleClassName} {...props}>{children}</Link>}>
      <SafeReturnLinkInner fallback={fallback} className={accessibleClassName} {...props}>{children}</SafeReturnLinkInner>
    </Suspense>
  )
}

function SafeReturnLinkInner({
  fallback,
  children,
  ...props
}: SafeReturnLinkProps) {
  const searchParams = useSearchParams()
  const href = safeLocalPath(searchParams.get("returnTo"), fallback)

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  )
}
