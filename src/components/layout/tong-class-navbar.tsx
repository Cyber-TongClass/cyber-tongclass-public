"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, BookOpen, LogOut, Menu, Search, Settings, Shield, User, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAiaNotifications, useMyPublicProfileDestination } from "@/lib/api"
import { withReturnTo } from "@/lib/safe-local-path"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const graduateNavigation = [
  { name: "成员", href: tongClassMembersPath(), auth: true },
  { name: "活动", href: tongClassEventsPath(), auth: true },
  { name: "内网", href: tongClassIntranetPath(), auth: true, loggedInOnly: true },
]

export function TongClassNavbar() {
  const pathname = usePathname() || tongClassHomePath()
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth()
  const profileDestination = useMyPublicProfileDestination()
  const isGraduate = currentUser?.identityType === "graduate"
  const notifications = useAiaNotifications({ enabled: isAuthenticated })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const currentUserPhoto = currentUser?.realPhoto || currentUser?.avatar
  const unreadNotificationCount = Array.isArray(notifications)
    ? notifications.filter((notification: { readAt?: number }) => notification.readAt === undefined).length
    : 0

  const resolveHref = (href: string, auth?: boolean) =>
    auth && !isAuthenticated ? "/login?next=" + encodeURIComponent(href) : href

  const isActivePath = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const navigationLinks = (mobile = false) =>
    (isGraduate ? graduateNavigation : navigation)
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
              mobile
                ? "block rounded-md px-3 py-3 text-base"
                : "relative px-3 py-5 text-sm after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:transition-colors",
              active
                ? mobile
                  ? "bg-[hsl(350,55%,35%)]/10 text-[hsl(350,55%,35%)]"
                  : "text-[hsl(350,55%,35%)] after:bg-[hsl(350,55%,35%)]"
                : mobile
                  ? "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  : "text-slate-600 after:bg-transparent hover:text-slate-950",
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
          <Image src="/logo.png" alt={isGraduate ? "人工智能研究院研究生内网标识" : "通用人工智能实验班标识"} width={36} height={36} className="h-9 w-9 shrink-0 rounded-md" priority />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-semibold text-slate-900">{isGraduate ? "人工智能研究院研究生内网" : "通用人工智能实验班"}</span>
            <span className="block truncate text-xs text-slate-500">{isGraduate ? "Graduate Intranet" : "Tong Class"}</span>
          </span>
        </Link>

        <nav className="hidden items-center lg:flex" aria-label="通班主导航">
          {navigationLinks()}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link
            href="/search"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="站内搜索"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          {isAuthenticated ? (
            <NotificationBell unreadCount={unreadNotificationCount} href={withReturnTo("/notifications", pathname)} label="通知" />
          ) : null}
          {/*
            维护约束（请勿删改）：这是通班旧站完整的登录后账户菜单。
            必须保留头像、个人主页、个人学术、账户设置、管理员入口（如适用）和退出登录；
            移动端菜单必须与这里的功能保持同步。除非产品负责人明确要求，否则不要精简这些入口。
          */}
          {isAuthenticated && currentUser ? (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="打开账户菜单"
              >
                {currentUserPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUserPhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  (currentUser.englishName || currentUser.username || "U").slice(0, 1).toUpperCase()
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {profileDestination ? (
                <DropdownMenuItem asChild>
                  <Link href={profileDestination.href}>
                    <User className="mr-2 h-4 w-4" />
                    {profileDestination.label}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link href="/my-publications">
                  <BookOpen className="mr-2 h-4 w-4" />
                  个人学术
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  账户设置
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    管理后台
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => logout(tongClassHomePath())}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              登录
            </Link>
          )}
        </div>

        <button
          type="button"
          className="min-h-11 min-w-11 rounded-md p-2 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
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
              href="/search"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              站内搜索
            </Link>
            {isAuthenticated && currentUser ? (
              <>
                <Link
                  href={withReturnTo("/notifications", pathname)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  通知
                  {unreadNotificationCount > 0 ? <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-white">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span> : null}
                </Link>
                {profileDestination ? (
                  <Link
                    href={profileDestination.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-2 flex items-center gap-3 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {currentUserPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentUserPhoto} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-900">
                        {(currentUser.englishName || currentUser.username || "U").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    {profileDestination.label}
                  </Link>
                ) : null}
                <Link
                  href="/my-publications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <BookOpen className="h-4 w-4" />
                  个人学术
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  账户设置
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-2 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Shield className="h-4 w-4" />
                    管理后台
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    logout(tongClassHomePath())
                  }}
                  className="mt-2 flex w-full items-center gap-2 rounded-md border border-slate-300 px-3 py-3 text-left text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-2 rounded-md border border-slate-300 px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                登录
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
