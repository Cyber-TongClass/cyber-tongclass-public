"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Calendar,
  Star,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Cog,
  ShieldCheck,
  TableProperties,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useTechDayActorArgs, useTechDayCurrentPrincipal } from "@/lib/api"

const navItems = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/reviewers", label: "Reviewer", icon: ShieldCheck },
  { href: "/admin/reviews", label: "课程测评", icon: Star },
  { href: "/admin/publications", label: "成果管理", icon: BookOpen },
  { href: "/admin/news", label: "新闻管理", icon: FileText },
  { href: "/admin/events", label: "活动管理", icon: Calendar },
  { href: "/admin/reimbursements", label: "报销管理", icon: TableProperties },
  { href: "/admin/forms", label: "OA 表单", icon: ClipboardList },
  { href: "/admin/techday/settings", label: "TechDay", icon: Calendar },
  { href: "/admin/treehole", label: "树洞管理", icon: MessageSquare },
  { href: "/admin/feedback", label: "反馈管理", icon: FileText },
]

type AdminNavItem = (typeof navItems)[number]

function SidebarContent({
  pathname,
  visibleNavItems,
  onNavigate,
}: {
  pathname: string
  visibleNavItems: AdminNavItem[]
  onNavigate: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-6 border-b">
        <Cog className="h-6 w-6 text-blue-900" />
        <span className="font-semibold text-lg">通班管理</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t space-y-1">
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <Settings className="h-5 w-5" />
          设置
        </Link>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          返回前台
        </Link>
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated, isAdmin, isSuperAdmin, isLoading } = useAuth()
  const actorArgs = useTechDayActorArgs()
  const techDayPrincipal = useTechDayCurrentPrincipal(actorArgs)

  const adminAllowedPrefixes = ["/admin/news", "/admin/events", "/admin/reviews", "/admin/treehole", "/admin/feedback", "/admin/reimbursements", "/admin/forms", "/admin/techday"]
  const isAdminAllowed =
    isSuperAdmin || adminAllowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const isTechDayAdminRoute = pathname === "/admin/techday" || pathname.startsWith("/admin/techday/")
  const isTechDayAdmin = Boolean(
    techDayPrincipal?.techDayUser?.role === "admin" ||
    techDayPrincipal?.mainUser?.role === "admin" ||
    techDayPrincipal?.mainUser?.role === "super_admin"
  )
  const hasTechDayAdminAccess = isTechDayAdminRoute && isTechDayAdmin

  // Permission check - redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isTechDayAdminRoute || techDayPrincipal !== undefined)) {
      if (hasTechDayAdminAccess) return
      if (!isAuthenticated) {
        router.push(isTechDayAdminRoute ? "/techday/login" : `/login?next=${encodeURIComponent(pathname)}`)
      } else if (!isAdmin) {
        router.push("/?error=unauthorized")
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router, pathname, isTechDayAdminRoute, hasTechDayAdminAccess, techDayPrincipal])

  // Show loading while checking auth
  if (isLoading || (isTechDayAdminRoute && techDayPrincipal === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !hasTechDayAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>需要登录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">正在跳转到登录页。如果未自动跳转，请点击下方按钮。</p>
            <Button asChild className="w-full">
              <Link href={isTechDayAdminRoute ? "/techday/login" : `/login?next=${encodeURIComponent(pathname)}`}>前往登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin && !hasTechDayAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>无权限访问后台</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">你的账号不是管理员，无法访问该页面。</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdminAllowed && !hasTechDayAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>管理员后台</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">作为管理员，你可以管理课程测评、新闻、活动以及内网内容。如需管理成员，请联系超级管理员。</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/reviews">前往课程测评、新闻、活动和内网管理</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const visibleNavItems = hasTechDayAdminAccess && !isAdmin
    ? navItems.filter((item) => item.href.startsWith("/admin/techday"))
    : isSuperAdmin
    ? navItems
    : navItems.filter((item) => adminAllowedPrefixes.some((prefix) => item.href === prefix || item.href.startsWith(`${prefix}/`)))

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0">
        <div className="flex flex-col flex-1 bg-white border-r lg:sticky lg:top-0 lg:h-screen">
          <SidebarContent pathname={pathname} visibleNavItems={visibleNavItems} onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b flex items-center px-4 z-40">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>管理菜单</SheetTitle>
              </SheetHeader>
              <SidebarContent pathname={pathname} visibleNavItems={visibleNavItems} onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="ml-2 font-semibold">通班管理后台</span>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 pt-20 lg:pt-6 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
