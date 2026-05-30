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
import { MoreHorizontal, Plus, Search, Filter, Trash2, Edit, Eye } from "lucide-react"
import { useUsers, useDeleteUser } from "@/lib/api"
import type { User } from "@/types"
import { getCohortLabel } from "@/lib/cohort"

const roleLabels: Record<string, string> = {
  member: "成员",
  admin: "管理员",
  super_admin: "超级管理员",
}

const roleColors: Record<string, string> = {
  member: "bg-gray-100 text-gray-800",
  admin: "bg-blue-100 text-blue-800",
  super_admin: "bg-purple-100 text-purple-800",
}

const organizationLabels: Record<string, string> = {
  pku: "北大通班",
  thu: "清华通班",
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const { confirm, ConfirmDialog } = useConfirmDialog()

  // Fetch users from Convex
  const usersData = useUsers({ limit: 1000 })
  const users = (usersData || []) as User[]
  const deleteUserMutation = useDeleteUser()

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase()
    const searchableText = [
      user.englishName,
      user.chineseName,
      user.username,
      user.email,
      user.studentId,
      organizationLabels[user.organization],
      getCohortLabel(user.cohort),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    const matchesSearch = !query || searchableText.includes(query)
    const matchesRole = !roleFilter || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleDeleteUser = async (id: string, englishName: string) => {
    await confirm({
      title: "确认删除用户",
      description: `将删除 ${englishName} 的账号信息。此操作不可撤销。`,
      confirmLabel: "确认删除",
      variant: "danger",
      onConfirm: async () => {
        await deleteUserMutation(id as any)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户账号和权限</p>
        </div>
        <Button asChild className="bg-blue-900 hover:bg-blue-800">
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4 mr-2" />
            新建用户
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索用户姓名、用户名或邮箱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {roleFilter ? roleLabels[roleFilter] : "全部角色"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRoleFilter(null)}>全部角色</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("member")}>成员</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("admin")}>管理员</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("super_admin")}>超级管理员</DropdownMenuItem>
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
                <TableHead>姓名</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>组织</TableHead>
                <TableHead>年级</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">
                    {user.chineseName}
                    {user.englishName ? ` ${user.englishName}` : ""}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell className="text-gray-500">{user.email}</TableCell>
                  <TableCell>{organizationLabels[user.organization] || user.organization}</TableCell>
                  <TableCell>{getCohortLabel(user.cohort)}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{new Date(user.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/members/${user.username || user._id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${user._id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑用户
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onSelect={() => handleDeleteUser(user._id, user.englishName)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除用户
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">共 {filteredUsers.length} 条记录</p>
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
