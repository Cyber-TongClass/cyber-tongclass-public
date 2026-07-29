"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MemberOnlyGuard({
  children,
  title = "需要登录后访问",
  description = "请先使用学号登录后再访问此页面。",
}: {
  children: React.ReactNode
  title?: string
  description?: string
}) {
  const pathname = usePathname()
  const { currentUser, isAuthenticated, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{description}</p>
            <Button asChild className="w-full">
              <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`}>前往登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentUser?.isClassMember !== true && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              仅限通班成员
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              当前账户已登录，但尚未被标记为通班成员。如身份信息有误，请联系管理员核验。
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/list">返回内网</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
