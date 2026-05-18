"use client"

import { useParams } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import { useTechDayActorArgs, useTechDayPostBySlug } from "@/lib/api"

export default function TechDayNewsDetailPage() {
  const params = useParams<{ slug: string }>()
  const actorArgs = useTechDayActorArgs()
  const post = useTechDayPostBySlug(params.slug, actorArgs)

  return (
    <TechDayShell title={post?.title || "TechDay 公告"} description={post?.summary}>
      {post === undefined ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {post === null ? <p className="text-sm text-slate-600">公告不存在。</p> : null}
      {post ? (
        <Card>
          <CardHeader>
            <div className="mb-2 flex flex-wrap gap-2">
              {post.category ? <Badge variant="secondary">{post.category}</Badge> : null}
              <Badge variant="outline">{post.date}</Badge>
              {post.tags?.map((tag: string) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
            <CardTitle>{post.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={post.content || ""} />
          </CardContent>
        </Card>
      ) : null}
    </TechDayShell>
  )
}
