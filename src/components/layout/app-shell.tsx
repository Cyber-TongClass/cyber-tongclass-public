"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")
  const isTechDayRoute = pathname === "/techday" || pathname.startsWith("/techday/")

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdminRoute && !isTechDayRoute && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isAdminRoute && !isTechDayRoute && <Footer />}
    </div>
  )
}
