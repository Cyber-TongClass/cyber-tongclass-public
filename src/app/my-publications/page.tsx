"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { MoreHorizontal, Plus, Search, Filter, Trash2, Edit, Eye } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { usePublicationsByUser, useDeletePublication } from "@/lib/api"
import { getPublicationCategoryOptions } from "@/lib/publication-taxonomy"
import type { Publication } from "@/types"

export default function MyPublicationsPage() {
  const router = useRouter()
  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Fetch publications from Convex
  const publicationsData = usePublicationsByUser(currentUser?._id || "")
  const publications: Publication[] = publicationsData || []
  const deletePublication = useDeletePublication()

  const { confirm, ConfirmDialog } = useConfirmDialog()

  const categoryLabelMap = useMemo(
    () => new Map(getPublicationCategoryOptions().map((option) => [option.value, option.label])),
    []
  )

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent("/my-publications")}`)
    }
  }, [authLoading, isAuthenticated, router])

  // Data is automatically refreshed through Convex hooks

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(publications.map((item) => item.category)))
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: categoryLabelMap.get(value) || value,
      }))
  }, [categoryLabelMap, publications])

  const filteredPublications = useMemo(() => {
    return publications.filter((publication) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        publication.title.toLowerCase().includes(query) ||
        publication.venue.toLowerCase().includes(query) ||
        publication.authors.some((author) => author.toLowerCase().includes(query))
      const matchesCategory = !categoryFilter || publication.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, publications, searchQuery])

  const handleDelete = async (publication: Publication) => {
    await confirm({
      title: "确认删除学术成果",
      description: `将永久删除《${publication.title}》。此操作不可撤销。`,
      confirmLabel: "删除",
      variant: "danger",
      onConfirm: async () => {
        await deletePublication(publication._id as any)
      },
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">个人学术</h1>
            <p className="text-gray-500 mt-1">管理你发布的学术成果（新增、编辑、删除）</p>
          </div>
          <Button asChild className="bg-blue-900 hover:bg-blue-800">
            <Link href="/my-publications/new">
              <Plus className="h-4 w-4 mr-2" />
              新建成果
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索标题、作者、会议期刊..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    {categoryFilter ? categoryLabelMap.get(categoryFilter) || categoryFilter : "全部领域"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCategoryFilter(null)}>全部领域</DropdownMenuItem>
                  {categoryOptions.map((category) => (
                    <DropdownMenuItem key={category.value} onClick={() => setCategoryFilter(category.value)}>
                      {category.label}
                    </DropdownMenuItem>
                  ))}
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
                  <TableHead>作者</TableHead>
                  <TableHead>领域</TableHead>
                  <TableHead>会议/期刊</TableHead>
                  <TableHead>年份</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPublications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      暂无符合条件的成果记录
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPublications.map((publication) => (
                    <TableRow key={publication._id}>
                      <TableCell className="font-medium max-w-[320px] truncate">{publication.title}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-gray-600">{publication.authors.join(", ")}</TableCell>
                      <TableCell>
                        <span className="text-xs font-bold uppercase tracking-wider text-[hsl(211,60%,35%)]">
                          {categoryLabelMap.get(publication.category) || publication.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{publication.venue}</TableCell>
                      <TableCell>{publication.year}</TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(publication.updatedAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/publications/${publication._id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/my-publications/${publication._id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onSelect={() => handleDelete(publication)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-sm text-gray-500">共 {filteredPublications.length} 条成果记录</p>
      </div>

      <ConfirmDialog />
    </div>
  )
}
