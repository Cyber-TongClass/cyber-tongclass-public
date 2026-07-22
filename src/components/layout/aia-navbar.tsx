"use client"

import Image from "next/image"
import Link from "next/link"
import { LogIn, Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useRef, useState } from "react"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useCoffeeTalkNotifications, useTongClassSessionToken } from "@/lib/api"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "研究院", href: "/institute" },
  { name: "人员", href: "/people" },
  { name: "团队", href: "/groups" },
  { name: "研究", href: "/research" },
  { name: "动态", href: "/updates" },
  { name: "服务", href: "/services" },
  { name: "联系", href: "/contact" },
  { name: "通班", href: "/tong-class" },
]

const isActivePath = (pathname: string, href: string) =>
  pathname === href || (href !== "/tong-class" && pathname.startsWith(href + "/"))

export function AiaNavbar() {
  const pathname = usePathname() || "/"
  const sessionToken = useTongClassSessionToken()
  const notifications = useCoffeeTalkNotifications()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuId = "aia-mobile-navigation"
  const unreadNotificationCount = Array.isArray(notifications)
    ? notifications.filter((notification: { readAt?: number }) => notification.readAt === undefined).length
    : 0

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const handleMobileMenuKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      closeMobileMenu()
      mobileMenuButtonRef.current?.focus()
    }
  }

  const navigationLinks = (mobile = false) =>
    navigation.map((item) => {
      const active = isActivePath(pathname, item.href)

      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={mobile ? closeMobileMenu : undefined}
          className={cn(
            "rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--aia-red))] focus-visible:ring-offset-2",
            mobile ? "block px-3 py-3 text-base" : "px-3 py-2 text-sm",
            active
              ? "bg-[hsl(var(--aia-red)/0.08)] text-[hsl(var(--aia-red))]"
              : "text-[hsl(var(--aia-ink))] hover:bg-[hsl(var(--aia-red)/0.06)] hover:text-[hsl(var(--aia-red))]",
          )}
        >
          {item.name}
        </Link>
      )
    })

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--aia-red)/0.18)] bg-[hsl(var(--aia-warm)/0.96)] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--aia-warm)/0.9)]">
      <div className="container-custom flex min-h-16 items-center justify-between gap-4 py-2">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--aia-red))] focus-visible:ring-offset-2"
          aria-label="北京大学人工智能研究院 AIA 首页"
        >
          <Image
            src="/brand/aia/aia-seal.png"
            alt="北京大学人工智能研究院 AIA 标识"
            width={44}
            height={44}
            priority
            className="h-11 w-11 shrink-0"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-serif text-lg font-semibold tracking-wide text-[hsl(var(--aia-ink))]">AIA</span>
            <span className="hidden truncate text-xs text-slate-600 sm:block">北京大学人工智能研究院</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="AIA 主导航">
          {navigationLinks()}
        </nav>

        <div className="hidden shrink-0 items-center lg:flex">
          {sessionToken ? (
            <NotificationBell unreadCount={unreadNotificationCount} href="/notifications" label="通知" />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--aia-red)/0.3)] px-3 py-2 text-sm font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red)/0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--aia-red))] focus-visible:ring-offset-2"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              登录
            </Link>
          )}
        </div>

        <button
          ref={mobileMenuButtonRef}
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-[hsl(var(--aia-ink))] transition-colors hover:bg-[hsl(var(--aia-red)/0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--aia-red))] focus-visible:ring-offset-2 lg:hidden"
          aria-label={isMobileMenuOpen ? "关闭 AIA 导航菜单" : "打开 AIA 导航菜单"}
          aria-controls={mobileMenuId}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div
          id={mobileMenuId}
          className="border-t border-[hsl(var(--aia-red)/0.15)] bg-[hsl(var(--aia-warm))] px-4 py-4 lg:hidden"
          onKeyDown={handleMobileMenuKeyDown}
        >
          <nav className="container-custom flex flex-col gap-1 px-0" aria-label="AIA 移动导航">
            {navigationLinks(true)}
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="mt-2 inline-flex items-center gap-2 rounded-md border border-[hsl(var(--aia-red)/0.3)] px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red)/0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--aia-red))] focus-visible:ring-offset-2"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              登录
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
