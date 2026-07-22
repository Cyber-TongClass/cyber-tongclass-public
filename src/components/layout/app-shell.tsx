"use client"

import { usePathname } from "next/navigation"
import { AiaFooter } from "@/components/layout/aia-footer"
import { AiaNavbar } from "@/components/layout/aia-navbar"
import { TongClassFooter } from "@/components/layout/tong-class-footer"
import { TongClassNavbar } from "@/components/layout/tong-class-navbar"
import { getPublicShellKind } from "@/lib/tong-class-routes"

export function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const publicShellKind = getPublicShellKind(usePathname() || "/")

  return (
    <div className="min-h-screen flex flex-col">
      {publicShellKind === "aia" ? <AiaNavbar /> : null}
      {publicShellKind === "tong-class" ? <TongClassNavbar /> : null}
      <main className="flex-1">{children}</main>
      {publicShellKind === "aia" ? <AiaFooter /> : null}
      {publicShellKind === "tong-class" ? <TongClassFooter /> : null}
    </div>
  )
}
