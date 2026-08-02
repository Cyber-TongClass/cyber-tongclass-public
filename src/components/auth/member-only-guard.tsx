"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { canAccessMemberArea } from "@/lib/member-area-access"
import { siteCopy } from "@/config/site-copy"

export function MemberOnlyGuard({
  children,
  title = siteCopy.intranet.guard.loginTitle,
  description = siteCopy.intranet.guard.loginDescription,
  allowedIdentityTypes = [],
}: {
  children: React.ReactNode
  title?: string
  description?: string
  allowedIdentityTypes?: readonly string[]
}) {
  const pathname = usePathname()
  const { currentUser, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">{siteCopy.intranet.guard.loading}</p>
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
              <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`}>{siteCopy.intranet.guard.loginAction}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!canAccessMemberArea(currentUser, allowedIdentityTypes)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {siteCopy.intranet.guard.deniedTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              {siteCopy.intranet.guard.deniedDescription}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/list">{siteCopy.intranet.guard.returnAction}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
