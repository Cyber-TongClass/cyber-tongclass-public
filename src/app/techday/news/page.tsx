"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTechDayActorArgs, useTechDayCurrentPrincipal, useTechDayPosts } from "@/lib/api"

export default function TechDayNewsPage() {
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const posts = useTechDayPosts(actorArgs)
  const techDayRole = principal?.techDayUser?.role
  const isAdmin = techDayRole === "admin" || principal?.mainUser?.role === "admin" || principal?.mainUser?.role === "super_admin"
  const canManageNews = isAdmin || Boolean(principal?.techDayUser?.canPublishNews)

  return (
    <TechDayShell title="TechDay 新闻公告" description="查看活动公告、投稿通知、志愿者信息和面向特定角色的更新。">
      {canManageNews ? (
        <div className="mb-4 flex justify-end">
          <Button asChild variant="outline"><Link href="/techday/news/manage">管理公告</Link></Button>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {posts?.map((post: any) => (
          <Card key={post._id}>
            <CardHeader>
              <div className="mb-2 flex flex-wrap gap-2">
                {post.category ? <Badge variant="secondary">{post.category}</Badge> : null}
                <Badge variant="outline">{post.date}</Badge>
              </div>
              <CardTitle>{post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-6 text-slate-600">{post.summary}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/techday/news/${post.slug}`}>阅读全文 <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {posts === undefined ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {posts && posts.length === 0 ? <p className="text-sm text-slate-600">暂无公告。</p> : null}
    </TechDayShell>
  )
}
