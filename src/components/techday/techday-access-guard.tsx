"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTechDayActorArgs, useTechDayCurrentPrincipal } from "@/lib/api"
import { canUseTechDayAuthorTools, type TechDayRole } from "@/types/techday"

export function TechDayAccessGuard({
  role,
  adminAllowed = true,
  allowInternalAuthorBootstrap = false,
  allowPublisher = false,
  children,
}: {
  role?: TechDayRole
  adminAllowed?: boolean
  allowInternalAuthorBootstrap?: boolean
  allowPublisher?: boolean
  children: React.ReactNode
}) {
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)

  if (principal === undefined) {
    return <p className="text-sm text-slate-600">Loading...</p>
  }

  const techDayRole = principal?.techDayUser?.role
  const isAdmin = adminAllowed && (techDayRole === "admin" || principal?.mainUser?.role === "admin" || principal?.mainUser?.role === "super_admin")
  const hasAuthorAccess = role === "author" && (
    canUseTechDayAuthorTools(principal?.techDayUser) ||
    Boolean(allowInternalAuthorBootstrap && principal?.mainUser)
  )
  const hasPublisherAccess = allowPublisher && Boolean(principal?.techDayUser?.canPublishNews)
  const hasAccess = !role ? Boolean(principal?.techDayUser || principal?.mainUser) : isAdmin || techDayRole === role || hasAuthorAccess || hasPublisherAccess

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            需要 TechDay 权限
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">请使用通班账号登录，或使用 TechDay-only 账号进入该功能。</p>
          <Button asChild>
            <Link href="/techday/login">前往 TechDay 登录</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
