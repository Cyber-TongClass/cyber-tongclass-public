"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
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
import { MoreHorizontal, Plus, Search, Filter, Trash2, Edit, Eye, MapPin, Clock } from "lucide-react"
import { useEvents, useDeleteEvent } from "@/lib/api"
import type { Event } from "@/types"

const colorToType: Record<string, string> = {
  "#0F4C81": "学术",
  "#DC143C": "会议",
  "#2E7D32": "活动",
  "#F57C00": "公告",
}

const typeColors: Record<string, string> = {
  学术: "bg-blue-100 text-blue-800",
  活动: "bg-purple-100 text-purple-800",
  实践: "bg-green-100 text-green-800",
  会议: "bg-gray-100 text-gray-800",
  公告: "bg-amber-100 text-amber-800",
  其他: "bg-slate-100 text-slate-800",
}

const statusLabels: Record<string, string> = {
  published: "已发布",
}

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-800",
}

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const eventsData = useEvents()
  const deleteEventMutation = useDeleteEvent()
  const events: Event[] = useMemo(() => eventsData || [], [eventsData])
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const eventTypes = useMemo(() => {
    return Array.from(new Set(events.map((event) => colorToType[event.color] || "其他"))).sort((a, b) => a.localeCompare(b))
  }, [events])

  const filteredEvents = events
    .filter((event) => {
      const eventType = colorToType[event.color] || "其他"
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = !typeFilter || eventType === typeFilter
      return matchesSearch && matchesType
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const handleDelete = async (id: string, title: string) => {
    await confirm({
      title: "确认删除活动",
      description: `将删除活动「${title}」。此操作不可撤销。`,
      confirmLabel: "删除",
      variant: "danger",
      onConfirm: async () => {
        await deleteEventMutation(id as any)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">活动管理</h1>
          <p className="text-gray-500 mt-1">管理网站活动内容</p>
        </div>
        <Button asChild className="bg-blue-900 hover:bg-blue-800">
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4 mr-2" />
            创建活动
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索活动标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {typeFilter || "全部类型"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter(null)}>全部类型</DropdownMenuItem>
                {eventTypes.map((type) => (
                  <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                    {type}
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
                <TableHead>活动名称</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>地点</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => {
                const eventType = colorToType[event.color] || "其他"
                return (
                  <TableRow key={event._id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.date}</TableCell>
                    <TableCell className="text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      <div className="flex items-center gap-1 max-w-[150px] truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {event.location || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[eventType] || typeColors["其他"]}>{eventType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors.published}>{statusLabels.published}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">{new Date(event.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/events/${event._id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/events/${event._id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onSelect={() => handleDelete(event._id, event.title)}>
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
        <p className="text-sm text-gray-500">共 {filteredEvents.length} 条记录</p>
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
