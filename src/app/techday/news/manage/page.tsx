"use client"

import Link from "next/link"
import { Download } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeleteTechDayPost, useExportTechDayPosts, useManageTechDayPosts, usePublishTechDayPost, useTechDayActorArgs } from "@/lib/api"
import { downloadCsv } from "@/types/techday"

export default function TechDayNewsManagePage() {
  const actorArgs = useTechDayActorArgs()
  const posts = useManageTechDayPosts(actorArgs)
  const exportRows = useExportTechDayPosts(actorArgs)
  const publish = usePublishTechDayPost()
  const remove = useDeleteTechDayPost()

  return (
    <TechDayShell title="公告管理" description="管理 TechDay 新闻公告、草稿和可见范围。">
      <TechDayAccessGuard role="admin" allowPublisher>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>公告</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!exportRows?.length}
                onClick={() => downloadCsv("techday-news.csv", exportRows as any)}
              >
                <Download className="mr-2 h-4 w-4" />
                导出公告
              </Button>
              <Button asChild><Link href="/techday/news/editor/new">新建公告</Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[760px]">
              <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>日期</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {posts?.map((post: any) => (
                  <TableRow key={post._id}>
                    <TableCell>{post.title}</TableCell>
                    <TableCell>{post.date}</TableCell>
                    <TableCell>{post.published ? "已发布" : "草稿"}</TableCell>
                    <TableCell className="min-w-44 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" asChild><Link href={`/techday/news/editor/${post.slug}`}>编辑</Link></Button>
                        <Button size="sm" variant="outline" onClick={() => publish({ ...actorArgs, id: post._id, published: !post.published })}>{post.published ? "下线" : "发布"}</Button>
                        <Button size="sm" variant="destructive" onClick={() => remove({ ...actorArgs, id: post._id })}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
