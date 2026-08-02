"use client"

import Image from "next/image"
import Link from "next/link"
import { Bell, BookOpen, LogIn, LogOut, Menu, Search, Settings, Shield, User, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useRef, useState } from "react"
import { NotificationBell } from "@/components/notifications/notification-bell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAiaNotifications, useMyPublicProfileDestination } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { withReturnTo } from "@/lib/safe-local-path"
import { cn } from "@/lib/utils"
import { siteCopy } from "@/config/site-copy"

const isActivePath = (pathname: string, href: string) =>
  pathname === href || (href !== "/tong-class" && pathname.startsWith(href + "/"))

export function AiaNavbar() {
  const pathname = usePathname() || "/"
  const { currentUser, isAuthenticated, isLoading, isAdmin, logout } = useAuth()
  const profileDestination = useMyPublicProfileDestination()
  const notifications = useAiaNotifications({ enabled: isAuthenticated })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuId = "aia-mobile-navigation"
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`
  const showLoginAction = pathname !== "/login"
  const currentUserPhoto = currentUser?.realPhoto || currentUser?.avatar
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
    siteCopy.navigation.aia.map((item, itemIndex) => {
      const active = isActivePath(pathname, item.href)

      if (mobile) {
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={closeMobileMenu}
            className={cn(
              "aia-focus flex items-baseline gap-4 border-b aia-border-rule px-1 py-3.5 transition-colors",
              active ? "text-[hsl(var(--aia-red))]" : "text-[hsl(var(--aia-ink))] hover:text-[hsl(var(--aia-red))]",
            )}
          >
            <span className="aia-mono text-xs text-[hsl(var(--aia-muted))]" aria-hidden="true">
              {String(itemIndex + 1).padStart(2, "0")}
            </span>
            <span className="aia-serif text-lg font-semibold tracking-wide">{item.name}</span>
          </Link>
        )
      }

      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "aia-focus border-b pb-1 text-sm tracking-[0.14em] transition-colors",
            active
              ? "border-[hsl(var(--aia-red))] text-[hsl(var(--aia-red))]"
              : "border-transparent text-[hsl(var(--aia-ink))] hover:border-[hsl(var(--aia-red)/0.5)] hover:text-[hsl(var(--aia-red))]",
          )}
        >
          {item.name}
        </Link>
      )
    })

  return (
    <header className="sticky top-0 z-50 w-full border-b aia-border-rule bg-[hsl(var(--aia-paper)/0.97)] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--aia-paper)/0.92)]">
      <div className="container-custom flex min-h-16 items-center justify-between gap-6 py-2">
        <Link
          href="/"
          className="aia-focus flex min-w-0 items-center gap-3"
          aria-label={siteCopy.brand.aiaHomeLabel}
        >
          <Image
            src="/brand/aia/aia-seal.png"
            alt={siteCopy.brand.aiaLogoAlt}
            width={40}
            height={40}
            priority
            className="h-10 w-10 shrink-0"
          />
          <span className="min-w-0 leading-tight">
            <span className="aia-serif block truncate text-lg font-semibold tracking-[0.08em] text-[hsl(var(--aia-ink))]">
              {siteCopy.brand.aiaShort}
            </span>
            <span className="aia-text-muted hidden truncate text-xs tracking-wide sm:block">
              {siteCopy.brand.aiaName}
            </span>
          </span>
        </Link>

        <nav className="hidden items-end gap-6 lg:flex" aria-label={siteCopy.navigation.aiaDesktopLabel}>
          {navigationLinks()}
        </nav>

        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          <Link
            href="/search"
            className="aia-focus inline-flex min-h-11 min-w-11 items-center justify-center text-[hsl(var(--aia-ink))] transition-colors hover:text-[hsl(var(--aia-red))]"
            aria-label={siteCopy.common.search}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/portal"
            className="aia-kicker aia-focus transition-colors hover:text-[hsl(var(--aia-red-deep))]"
          >
            {siteCopy.common.intranet}
          </Link>
          {isAuthenticated ? (
            <NotificationBell unreadCount={unreadNotificationCount} href={withReturnTo("/notifications", pathname)} label={siteCopy.common.notifications} />
          ) : null}
          {isAuthenticated && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="aia-focus inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border aia-border-rule bg-white text-sm font-semibold text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))]"
                  aria-label={siteCopy.common.openAccountMenu}
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
                    {siteCopy.common.personalAcademic}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    {siteCopy.common.accountSettings}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      {siteCopy.common.adminConsole}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => logout("/")}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {siteCopy.common.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !isLoading && showLoginAction ? (
            <Link
              href={loginHref}
              className="aia-focus inline-flex items-center gap-2 border aia-border-rule px-3.5 py-2 text-sm font-medium tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {siteCopy.common.login}
            </Link>
          ) : null}
        </div>

        <button
          ref={mobileMenuButtonRef}
          type="button"
          className="aia-focus inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2 text-[hsl(var(--aia-ink))] transition-colors hover:text-[hsl(var(--aia-red))] lg:hidden"
          aria-label={isMobileMenuOpen ? siteCopy.navigation.closeAiaMenu : siteCopy.navigation.openAiaMenu}
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
          className="border-t aia-border-rule bg-[hsl(var(--aia-paper))] px-4 pb-5 pt-2 lg:hidden"
          onKeyDown={handleMobileMenuKeyDown}
        >
          <nav className="container-custom flex flex-col px-0" aria-label={siteCopy.navigation.aiaMobileLabel}>
            {navigationLinks(true)}
            <Link
              href="/search"
              onClick={closeMobileMenu}
              className="aia-focus mt-3 flex min-h-11 items-center gap-2 border aia-border-rule px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))]"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {siteCopy.common.search}
            </Link>
            <Link
              href="/portal"
              onClick={closeMobileMenu}
              className="aia-kicker aia-focus mt-4 inline-flex px-1 transition-colors hover:text-[hsl(var(--aia-red-deep))]"
            >
              {siteCopy.common.intranetEntry}
            </Link>
            {isAuthenticated && currentUser ? (
              <div className="mt-4 flex flex-col gap-2">
                <Link href={withReturnTo("/notifications", pathname)} onClick={closeMobileMenu} className="aia-focus flex items-center gap-2 border aia-border-rule px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {siteCopy.common.notifications}
                  {unreadNotificationCount > 0 ? <span className="ml-auto rounded-full bg-[hsl(var(--aia-red))] px-2 py-0.5 text-xs text-white">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span> : null}
                </Link>
                {profileDestination ? (
                  <Link
                    href={profileDestination.href}
                    onClick={closeMobileMenu}
                    className="aia-focus flex items-center gap-3 border aia-border-rule px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
                  >
                    {currentUserPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentUserPhoto} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-[hsl(var(--aia-ink))]">
                        {(currentUser.englishName || currentUser.username || "U").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    {profileDestination.label}
                  </Link>
                ) : null}
                <Link href="/my-publications" onClick={closeMobileMenu} className="aia-focus flex items-center gap-2 border aia-border-rule px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]">
                  <BookOpen className="h-4 w-4" />
                  {siteCopy.common.personalAcademic}
                </Link>
                <Link href="/settings" onClick={closeMobileMenu} className="aia-focus flex items-center gap-2 border aia-border-rule px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]">
                  <Settings className="h-4 w-4" />
                  {siteCopy.common.accountSettings}
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={closeMobileMenu} className="aia-focus flex items-center gap-2 border aia-border-rule px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]">
                    <Shield className="h-4 w-4" />
                    {siteCopy.common.adminConsole}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu()
                    logout("/")
                  }}
                  className="aia-focus flex w-full items-center gap-2 border aia-border-rule px-3 py-3 text-left text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
                >
                  <LogOut className="h-4 w-4" />
                  {siteCopy.common.logout}
                </button>
              </div>
            ) : !isLoading && showLoginAction ? (
              <Link
                href={loginHref}
                onClick={closeMobileMenu}
                className="aia-focus mt-4 inline-flex items-center gap-2 border aia-border-rule px-3 py-3 text-base font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {siteCopy.common.login}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
