"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { AiaFooter } from "@/components/layout/aia-footer"
import { AiaNavbar } from "@/components/layout/aia-navbar"
import { TongClassFooter } from "@/components/layout/tong-class-footer"
import { TongClassNavbar } from "@/components/layout/tong-class-navbar"
import { getPublicShellKind } from "@/lib/tong-class-routes"
import { safeLocalPath } from "@/lib/safe-local-path"

export function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() || "/"
  const searchParams = useSearchParams()
  const returnToValue = searchParams.get("returnTo")
  const returnTo = returnToValue ? safeLocalPath(returnToValue, pathname) : null
  const requestedShellKind = returnTo ? getPublicShellKind(returnTo) : null
  const publicShellKind = pathname.startsWith("/tong-class/")
    && requestedShellKind === "aia"
    ? "aia"
    : getPublicShellKind(pathname)

  if (publicShellKind === "aia") {
    return (
      <div className="aia-scope min-h-screen flex flex-col">
        <AiaNavbar />
        <main className="flex-1">{children}</main>
        <AiaFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {publicShellKind === "tong-class" ? <TongClassNavbar /> : null}
      <main className="flex-1">{children}</main>
      {publicShellKind === "tong-class" ? <TongClassFooter /> : null}
    </div>
  )
}
