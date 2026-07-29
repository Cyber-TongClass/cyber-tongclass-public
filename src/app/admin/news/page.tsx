"use client"

import Link from "next/link"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { MoreHorizontal, Plus, Search, Filter, Trash2, Edit, Eye, Send, XCircle } from "lucide-react"
import { useAllNews, useDeleteNews, useUpdateNews } from "@/lib/api"
import type { News } from "@/types"
import { NEWS_CATEGORY_OPTIONS } from "@/lib/news"

const statusLabels: Record<string, string> = {
  published: "已发布",
  draft: "草稿",
}

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
}

export default function NewsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const { confirm, ConfirmDialog } = useConfirmDialog()

  // Fetch news from Convex
  const newsData = useAllNews()
  const newsList: News[] = newsData || []
  const deleteNewsMutation = useDeleteNews()
  const updateNewsMutation = useUpdateNews()

  const filteredNews = newsList
    .filter((news: any) => {
      const status = news.isPublished ? "published" : "draft"
      const matchesSearch = news.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !categoryFilter || news.category === categoryFilter
      const matchesStatus = !statusFilter || status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
    .sort((a: any, b: any) => b.publishedAt - a.publishedAt)

  const handleDelete = async (id: string, title: string) => {
    await confirm({
      title: "确认删除新闻",
      description: `将永久删除《${title}》。此操作不可撤销。`,
      confirmLabel: "删除",
      variant: "danger",
      onConfirm: async () => {
        await deleteNewsMutation(id as any)
      },
    })
  }

  const handleStatusChange = async (news: any, nextStatus: "published" | "draft") => {
    const actionLabel = nextStatus === "published" ? "发布" : "撤回"
    await confirm({
      title: `确认${actionLabel}新闻`,
      description: `确定要${actionLabel}《${news.title}》吗？`,
      confirmLabel: actionLabel,
          onConfirm: async () => {
        await updateNewsMutation({
          id: news._id,
          isPublished: nextStatus === "published",
          publishedAt: nextStatus === "published" ? news.publishedAt || Date.now() : news.publishedAt,
        })
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">新闻管理</h1>
          <p className="text-gray-500 mt-1">管理网站新闻内容</p>
        </div>
        <Button asChild className="bg-blue-900 hover:bg-blue-800">
          <Link href="/admin/news/new">
            <Plus className="h-4 w-4 mr-2" />
            创建新闻
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索新闻标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {categoryFilter || "全部分类"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setCategoryFilter(null)}>全部分类</DropdownMenuItem>
                {NEWS_CATEGORY_OPTIONS.map((category) => (
                  <DropdownMenuItem key={category} onClick={() => setCategoryFilter(category)}>
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {statusFilter ? statusLabels[statusFilter] : "全部状态"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>全部状态</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("published")}>已发布</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("draft")}>草稿</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNews.map((news) => {
                const status = news.isPublished ? "published" : "draft"
                return (
                  <TableRow key={news._id}>
                    <TableCell className="font-medium max-w-md truncate">{news.title}</TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-800">{news.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">{new Date(news.publishedAt).toLocaleDateString("zh-CN")}</TableCell>
                    <TableCell className="text-gray-500">{new Date(news.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tong-class/news/${news._id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/news/${news._id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </Link>
                          </DropdownMenuItem>
                          {status === "draft" && (
                            <DropdownMenuItem onSelect={() => handleStatusChange(news, "published")}>
                              <Send className="h-4 w-4 mr-2" />
                              发布
                            </DropdownMenuItem>
                          )}
                          {status === "published" && (
                            <DropdownMenuItem onSelect={() => handleStatusChange(news, "draft")}>
                              <XCircle className="h-4 w-4 mr-2" />
                              撤回
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onSelect={() => handleDelete(news._id, news.title)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">共 {filteredNews.length} 条记录</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            上一页
          </Button>
          <Button variant="outline" size="sm" disabled>
            下一页
          </Button>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  )
}
