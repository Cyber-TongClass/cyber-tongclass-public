"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, FileText, Receipt, Settings, Trophy, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTechDayActorArgs, useTechDayCurrentPrincipal, useSyncInternalTechDayUser } from "@/lib/api"
import { canUseTechDayAuthorTools } from "@/types/techday"
import { useEffect } from "react"

type LinkVisibilityContext = {
  role?: string
  isAdmin: boolean
}

const links: Array<{
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  visible: (context: LinkVisibilityContext) => boolean
}> = [
  { href: "/techday", label: "成果展示", icon: FileText, visible: () => true },
  { href: "/techday/news", label: "新闻公告", icon: CalendarDays, visible: () => true },
  { href: "/techday/reimbursements", label: "报销", icon: Receipt, visible: ({ role, isAdmin }: { role?: string; isAdmin: boolean }) => role === "volunteer" || isAdmin },
  { href: "/techday/awards", label: "奖项", icon: Trophy, visible: ({ role, isAdmin }: { role?: string; isAdmin: boolean }) => role === "reviewer" || isAdmin },
  { href: "/techday/profile", label: "个人中心", icon: UserRound, visible: ({ role }: { role?: string }) => Boolean(role) },
  { href: "/admin/techday/settings", label: "后台", icon: Settings, visible: ({ isAdmin }: { isAdmin: boolean }) => isAdmin },
]

export function TechDayShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const syncInternal = useSyncInternalTechDayUser()

  useEffect(() => {
    const shouldSyncAdmin = principal?.mainUser?.role === "admin" || principal?.mainUser?.role === "super_admin"
    if (actorArgs.mainSessionToken && principal?.kind === "internal" && !principal.techDayUser && shouldSyncAdmin) {
      void syncInternal({ mainSessionToken: actorArgs.mainSessionToken })
    }
  }, [actorArgs.mainSessionToken, principal?.kind, principal?.mainUser?.role, principal?.techDayUser, syncInternal])

  const userName = principal?.techDayUser?.name || principal?.mainUser?.englishName || principal?.mainUser?.username
  const role = principal?.techDayUser?.role
  const isAdmin = role === "admin" || principal?.mainUser?.role === "admin" || principal?.mainUser?.role === "super_admin"
  const visibleLinks = links.filter((item) => item.visible({ role, isAdmin }))

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="container-custom flex min-h-16 flex-col gap-3 py-3 xl:flex-row xl:items-center xl:justify-between">
          <Link href="/techday" className="flex items-center gap-3 text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-sm font-bold text-white">
              TD
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-semibold">TechDay</span>
              <span className="block text-xs text-slate-500">AI TechDay Online Platform</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {visibleLinks.map((item) => {
              const isActive = item.href === "/techday"
                ? pathname === "/techday"
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className={isActive ? "" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
            <span className="hidden h-6 w-px bg-slate-200 lg:block" />
            {userName ? (
              <Badge variant="secondary" className="h-9 px-3">
                {userName}
              </Badge>
            ) : (
              <Button asChild variant="outline" size="sm" className="bg-white">
                <Link href="/techday/login">TechDay 登录</Link>
              </Button>
            )}
            <Button asChild variant="secondary" size="sm">
              <Link href={principal?.mainUser || canUseTechDayAuthorTools(principal?.techDayUser) ? "/techday/author/submissions/new" : "/techday/register/author"}>
                {principal?.mainUser || canUseTechDayAuthorTools(principal?.techDayUser) ? "投稿" : "作者注册"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-white">
              <Link href="/">前往通班官网</Link>
            </Button>
          </div>
        </div>
      </header>
      <section className="border-b border-slate-200 bg-white">
        <div className="container-custom py-8">
          <div>
            <Badge variant="outline" className="mb-3 bg-white">TechDay</Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">{title}</h1>
            {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">{description}</p> : null}
          </div>
        </div>
      </section>
      <main className="container-custom py-8">{children}</main>
    </div>
  )
}
