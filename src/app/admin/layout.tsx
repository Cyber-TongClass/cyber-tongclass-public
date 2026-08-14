"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Star,
  TableProperties,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useCC2026List, useMyContentPermissions, useTechDayActorArgs, useTechDayCurrentPrincipal } from "@/lib/api"
import { canManageCreativeChallenge } from "@/lib/creative-challenge-2026"
import { useAuth } from "@/lib/hooks/use-auth"
import { cn } from "@/lib/utils"

const navGroups = [
  {
    label: "总览",
    items: [{ href: "/admin", label: "运营概览", icon: LayoutDashboard }],
  },
  {
    label: "人员与研究",
    items: [
      { href: "/admin/users", label: "用户管理", icon: Users },
      { href: "/admin/reviewers", label: "Reviewer", icon: ShieldCheck },
      { href: "/admin/institute/bindings", label: "研究院绑定", icon: Link2 },
      { href: "/admin/publications", label: "成果管理", icon: BookOpen },
      { href: "/admin/reviews", label: "课程测评", icon: Star },
    ],
  },
  {
    label: "内容与事务",
    items: [
      { href: "/admin/news", label: "新闻管理", icon: FileText },
      { href: "/admin/events", label: "活动管理", icon: Calendar },
      { href: "/admin/reimbursements", label: "报销管理", icon: TableProperties },
      { href: "/forms/manage", label: "表单管理", icon: ClipboardList },
      { href: "/admin/intranet", label: "内网模块", icon: LayoutGrid },
    ],
  },
  {
    label: "专项平台",
    items: [
      { href: "/admin/creative-challenge-2026", label: "挑战赛", icon: Trophy },
      { href: "/admin/techday/settings", label: "TechDay", icon: Calendar },
      { href: "/admin/treehole", label: "树洞管理", icon: MessageSquare },
      { href: "/admin/feedback", label: "反馈管理", icon: FileText },
    ],
  },
]

const navItems = navGroups.flatMap((group) => group.items)
type AdminNavItem = (typeof navItems)[number]

function AdminNotice({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="aia-scope flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-none border-[hsl(var(--aia-rule))] bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--aia-ink))]">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="aia-text-muted text-sm leading-7">{description}</p>
          <Button asChild className="w-full rounded-none bg-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-red-deep))]">
            <Link href={href}>{action}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SidebarContent({
  pathname,
  visibleNavItems,
  accessLabel,
  onNavigate,
}: {
  pathname: string
  visibleNavItems: AdminNavItem[]
  accessLabel: string
  onNavigate: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-[hsl(var(--aia-red-deep))] text-white">
      <div className="flex h-[78px] items-center gap-3 border-b border-white/15 px-5">
        <Image src="/brand/aia/aia-seal.png" alt="AIA" width={40} height={40} className="h-10 w-10 rounded-full bg-white p-0.5" priority />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">AIA 运营后台</p>
          <p className="mt-1 truncate text-[11px] text-white/60">Institute Operations</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="AIA 管理后台导航">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => visibleNavItems.some((visible) => visible.href === item.href))
          if (items.length === 0) return null
          return (
            <div key={group.label} className="mb-6 last:mb-0">
              <p className="mb-2 px-3 text-[11px] font-medium text-white/45">{group.label}</p>
              <div className="space-y-1">
                {items.map((item) => {
                  const active = item.href === "/admin"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "aia-focus flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-white",
                        active ? "bg-white text-[hsl(var(--aia-red-deep))]" : "text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/15 p-3">
        <div className="mb-2 border border-white/15 px-3 py-3">
          <p className="text-xs font-medium text-white">{accessLabel}</p>
          <p className="mt-1 text-[11px] text-white/50">当前管理权限</p>
        </div>
        <Link href="/admin/settings" className="aia-focus flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-white">
          <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
          设置
        </Link>
        <Link href="/" className="aia-focus flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-white">
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          返回 AIA 首页
          <ArrowUpRight className="ml-auto h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { currentUser, isAuthenticated, isAdmin, isSuperAdmin, isLoading } = useAuth()
  const contentPermissions = useMyContentPermissions()
  const cc2026Organizers = useCC2026List("organizers")
  const cc2026OrganizerUserIds = (cc2026Organizers || [])
    .filter((entry: any) => entry.key === "_")
    .flatMap((entry: any) => {
      try { return JSON.parse(entry.value) } catch { return [] }
    }) as string[]
  const actorArgs = useTechDayActorArgs()
  const techDayPrincipal = useTechDayCurrentPrincipal(actorArgs)

  const adminAllowedPrefixes = [
    "/admin/reviews",
    "/admin/treehole",
    "/admin/feedback",
    "/admin/techday",
    ...(contentPermissions?.news.canManage ? ["/admin/news"] : []),
    ...(contentPermissions?.events.canManage ? ["/admin/events"] : []),
  ]
  const canManageNews = contentPermissions?.news.canManage === true
  const canManageEvents = contentPermissions?.events.canManage === true
  const isNewsAdminRoute = pathname === "/admin/news" || pathname.startsWith("/admin/news/")
  const isEventsAdminRoute = pathname === "/admin/events" || pathname.startsWith("/admin/events/")
  const isCapabilityGatedRoute = isNewsAdminRoute || isEventsAdminRoute
  const hasCapabilityGatedRouteAccess =
    (!isNewsAdminRoute || canManageNews) && (!isEventsAdminRoute || canManageEvents)
  const isAdminAllowed =
    (isSuperAdmin && hasCapabilityGatedRouteAccess) ||
    adminAllowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const isTechDayAdminRoute = pathname === "/admin/techday" || pathname.startsWith("/admin/techday/")
  const isCreativeChallengeAdminRoute = pathname === "/admin/creative-challenge-2026" || pathname.startsWith("/admin/creative-challenge-2026/")
  const isTechDayAdmin = Boolean(
    techDayPrincipal?.techDayUser?.role === "admin" ||
    techDayPrincipal?.mainUser?.role === "admin" ||
    techDayPrincipal?.mainUser?.role === "super_admin",
  )
  const hasTechDayAdminAccess = isTechDayAdminRoute && isTechDayAdmin
  const hasCreativeChallengeOrganizerAccess = isCreativeChallengeAdminRoute && canManageCreativeChallenge(currentUser, cc2026OrganizerUserIds)

  useEffect(() => {
    if (!isLoading && (!isTechDayAdminRoute || techDayPrincipal !== undefined)) {
      if (hasTechDayAdminAccess || hasCreativeChallengeOrganizerAccess) return
      if (!isAuthenticated) {
        router.push(isTechDayAdminRoute ? "/techday/login" : `/login?next=${encodeURIComponent(pathname)}`)
      } else if (!isAdmin) {
        router.push("/?error=unauthorized")
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router, pathname, isTechDayAdminRoute, hasTechDayAdminAccess, hasCreativeChallengeOrganizerAccess, techDayPrincipal])

  if (isLoading || (isAuthenticated && contentPermissions === undefined) || (isTechDayAdminRoute && techDayPrincipal === undefined)) {
    return (
      <div className="aia-scope flex min-h-[100dvh] items-center justify-center px-4">
        <div className="w-full max-w-sm" role="status" aria-label="正在加载 AIA 管理后台">
          <div className="h-2 w-28 animate-pulse bg-[hsl(var(--aia-rule))]" />
          <div className="mt-4 h-2 w-full animate-pulse bg-[hsl(var(--aia-rule))]" />
          <div className="mt-2 h-2 w-4/5 animate-pulse bg-[hsl(var(--aia-rule))]" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !hasTechDayAdminAccess && !hasCreativeChallengeOrganizerAccess) {
    return <AdminNotice title="需要登录" description="正在跳转到登录页。如果未自动跳转，可使用下方入口继续。" href={isTechDayAdminRoute ? "/techday/login" : `/login?next=${encodeURIComponent(pathname)}`} action="前往登录" />
  }
  if (!isAdmin && !hasTechDayAdminAccess && !hasCreativeChallengeOrganizerAccess) {
    return <AdminNotice title="无权限访问后台" description="当前账号没有管理权限。如需处理后台事务，请联系超级管理员。" href="/" action="返回 AIA 首页" />
  }
  if (!isAdminAllowed && !hasTechDayAdminAccess && !hasCreativeChallengeOrganizerAccess) {
    return (
      <AdminNotice
        title="管理权限受限"
        description={isCapabilityGatedRoute
          ? "当前账号未获授权管理此内容模块；请联系权限管理员开通相应能力。"
          : "当前账号仅显示已获授权的管理模块；成员与平台管理需要超级管理员权限。"}
        href={isCapabilityGatedRoute ? "/admin" : "/admin/reviews"}
        action={isCapabilityGatedRoute ? "返回运营概览" : "进入可用模块"}
      />
    )
  }

  const contentManagerNavItems = navItems.filter((item) => {
    if (item.href === "/admin/news") return canManageNews
    if (item.href === "/admin/events") return canManageEvents
    return true
  })
  const visibleNavItems = hasTechDayAdminAccess && !isAdmin
    ? navItems.filter((item) => item.href.startsWith("/admin/techday"))
    : hasCreativeChallengeOrganizerAccess && !isAdmin
      ? navItems.filter((item) => item.href === "/admin/creative-challenge-2026")
      : isSuperAdmin
        ? contentManagerNavItems
        : contentManagerNavItems.filter((item) => {
            if (hasCreativeChallengeOrganizerAccess && isAdmin && item.href === "/admin/creative-challenge-2026") return true
            return adminAllowedPrefixes.some((prefix) => item.href === prefix || item.href.startsWith(`${prefix}/`))
          })

  const accessLabel = isSuperAdmin
    ? "超级管理员"
    : hasTechDayAdminAccess && !isAdmin
      ? "TechDay 管理员"
      : hasCreativeChallengeOrganizerAccess && !isAdmin
        ? "挑战赛组织者"
        : "管理员"

  return (
    <div className="aia-scope flex min-h-[100dvh] bg-[hsl(var(--aia-paper))]">
      <aside className="hidden w-[276px] shrink-0 lg:sticky lg:top-0 lg:block lg:h-[100dvh]">
        <SidebarContent pathname={pathname} visibleNavItems={visibleNavItems} accessLabel={accessLabel} onNavigate={() => setSidebarOpen(false)} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-16 items-center border-b aia-border-rule bg-white px-4 lg:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="打开管理导航">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(19rem,92vw)] border-0 p-0">
              <SheetHeader className="sr-only"><SheetTitle>管理导航</SheetTitle></SheetHeader>
              <SidebarContent pathname={pathname} visibleNavItems={visibleNavItems} accessLabel={accessLabel} onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="ml-2 text-sm font-semibold text-[hsl(var(--aia-ink))]">AIA 运营后台</span>
          <span className="ml-auto bg-[hsl(var(--aia-tag))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--aia-red-deep))]">{accessLabel}</span>
        </header>

        <main className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
