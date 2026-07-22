"use client"

import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  tongClassAboutPath,
  tongClassCoursesPath,
  tongClassEventsPath,
  tongClassHomePath,
  tongClassIntranetPath,
  tongClassMembersPath,
  tongClassNewsPath,
  tongClassPublicationsPath,
  tongClassResourcesPath,
} from "@/lib/tong-class-routes"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "关于通班", href: tongClassAboutPath() },
  { name: "动态", href: tongClassNewsPath() },
  { name: "成员", href: tongClassMembersPath() },
  { name: "成果", href: tongClassPublicationsPath() },
  { name: "资源", href: tongClassResourcesPath() },
  { name: "课程", href: tongClassCoursesPath(), auth: true },
  { name: "活动", href: tongClassEventsPath(), auth: true },
  { name: "内网", href: tongClassIntranetPath(), auth: true, loggedInOnly: true },
]

export function TongClassNavbar() {
  const pathname = usePathname() || tongClassHomePath()
  const { isAuthenticated } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const resolveHref = (href: string, auth?: boolean) =>
    auth && !isAuthenticated ? "/login?next=" + encodeURIComponent(href) : href

  const isActivePath = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const navigationLinks = (mobile = false) =>
    navigation
      .filter((item) => !item.loggedInOnly || isAuthenticated)
      .map((item) => {
        const active = isActivePath(item.href)

        return (
          <Link
            key={item.name}
            href={resolveHref(item.href, item.auth)}
            aria-current={active ? "page" : undefined}
            onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
            className={cn(
              "font-medium transition-colors",
              mobile ? "block rounded-md px-3 py-3 text-base" : "border-b-2 px-3 py-5 text-sm",
              active
                ? "border-[hsl(350,55%,35%)] text-[hsl(350,55%,35%)]"
                : "border-transparent text-slate-600 hover:text-slate-950",
            )}
          >
            {item.name}
          </Link>
        )
      })

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-custom flex h-16 items-center justify-between gap-4">
        <Link
          href={tongClassHomePath()}
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Image src="/logo.png" alt="通用人工智能实验班标识" width={36} height={36} className="h-9 w-9 shrink-0 rounded-md" priority />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-semibold text-slate-900">通用人工智能实验班</span>
            <span className="block truncate text-xs text-slate-500">Tong Class</span>
          </span>
        </Link>

        <nav className="hidden items-center lg:flex" aria-label="通班主导航">
          {navigationLinks()}
        </nav>

        <Link
          href="/login"
          className="hidden rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:inline-flex"
        >
          登录
        </Link>

        <button
          type="button"
          className="rounded-md p-2 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
          aria-label={isMobileMenuOpen ? "关闭通班导航菜单" : "打开通班导航菜单"}
          aria-controls="tong-class-mobile-navigation"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div id="tong-class-mobile-navigation" className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <nav className="container-custom flex flex-col gap-1 px-0" aria-label="通班移动导航">
            {navigationLinks(true)}
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              登录
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
