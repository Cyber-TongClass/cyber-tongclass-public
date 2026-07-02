"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Edit, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAdminAcademicExchangeApplications, useDeleteAdminAcademicExchangeApplication } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/academic-exchange"
import type { AcademicExchangeSupportApplication } from "@/types"

export default function AdminAcademicExchangeApplicationsPage() {
  const { isSuperAdmin, isLoading } = useAuth()
  const applications = useAdminAcademicExchangeApplications(Boolean(isSuperAdmin)) as AcademicExchangeSupportApplication[] | undefined
  const deleteApplication = useDeleteAdminAcademicExchangeApplication()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return (applications || []).filter((application) => {
      if (!query) return true
      return [
        application.applicantName,
        application.studentId,
        application.projectName,
        application.projectCategory,
        application.exchangeLocation,
        application.paperTitle,
      ].join(" ").toLowerCase().includes(query)
    })
  }, [applications, searchQuery])

  const handleDelete = async (application: AcademicExchangeSupportApplication) => {
    await confirm({
      title: "删除学术交流支持申请",
      description: `确定删除“${application.applicantName} - ${application.projectName}”吗？删除后该记录不会再出现在学生历史记录和 Reviewer 列表中。`,
      confirmLabel: "确定删除",
      variant: "danger",
      onConfirm: async () => {
        setMessage("")
        setDeletingId(application._id)
        try {
          await deleteApplication(application._id)
          setMessage("申请记录已删除。")
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "删除失败")
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>无权限访问</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">只有超级管理员可以查看和编辑学术交流支持申请。</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">学术交流支持申请</h1>
        <p className="mt-1 text-gray-500">超级管理员可查看、编辑或删除所有申请记录；此后台不提供 PDF 下载和批量导出。</p>
      </div>

      {message ? <p className="rounded-md border bg-white px-4 py-3 text-sm text-slate-600">{message}</p> : null}

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="搜索姓名、学号、项目名称、类别、地点或论文题目..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>申请列表</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>申请人</TableHead>
                <TableHead>学号</TableHead>
                <TableHead>项目名称</TableHead>
                <TableHead>项目类别</TableHead>
                <TableHead>交流地点</TableHead>
                <TableHead>申请金额</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications === undefined ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-slate-500">Loading...</TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-slate-500">暂无申请记录</TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application._id}>
                    <TableCell className="font-medium">{application.applicantName}</TableCell>
                    <TableCell>{application.studentId}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{application.projectName}</TableCell>
                    <TableCell>{application.projectCategory}</TableCell>
                    <TableCell>{application.exchangeLocation}</TableCell>
                    <TableCell>{formatCurrency(application.totalAmount)}</TableCell>
                    <TableCell>{application.applicationDate}</TableCell>
                    <TableCell>{formatDate(application.submittedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/reimbursements/academic-exchange/${application._id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === application._id}
                          onClick={() => void handleDelete(application)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === application._id ? "删除中..." : "删除"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ConfirmDialog />
    </div>
  )
}
