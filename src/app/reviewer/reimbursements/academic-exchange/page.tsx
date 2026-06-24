"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Download, Eye, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/academic-exchange"
import type { AcademicExchangeSupportApplication } from "@/types"

function getDownloadFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") || ""
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/)
  if (!match) return fallback
  try {
    return decodeURIComponent(match[1])
  } catch {
    return fallback
  }
}

async function downloadReviewerPdf(application: AcademicExchangeSupportApplication) {
  const response = await fetch(`/api/reviewer/academic-exchange/${application._id}/pdf`, {
    method: "POST",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || "PDF 下载失败")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = getDownloadFileName(response, `通班学术交流支持项目申请表-${application.projectName}-${application.applicantName}.pdf`)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function ReviewerAcademicExchangePage() {
  const [applications, setApplications] = useState<AcademicExchangeSupportApplication[] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadApplications() {
      setMessage("")
      try {
        const response = await fetch("/api/reviewer/academic-exchange", { cache: "no-store" })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          setMessage(payload?.message || "无法读取申请列表")
          return
        }
        if (!cancelled) setApplications(payload.applications || [])
      } catch {
        if (!cancelled) setMessage("无法读取申请列表")
      }
    }
    loadApplications()
    return () => {
      cancelled = true
    }
  }, [])

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
      ].join(" ").toLowerCase().includes(query)
    })
  }, [applications, searchQuery])

  const handleDownload = async (application: AcademicExchangeSupportApplication) => {
    setMessage("")
    setDownloadingId(application._id)
    try {
      await downloadReviewerPdf(application)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF 下载失败")
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">学术交流支持申请</h1>
          <p className="mt-1 text-sm text-slate-500">只读查看同学已提交的学术交流支持申请，并按需下载单份申请 PDF。</p>
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="搜索姓名、学号、项目名称、类别或地点..."
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
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>申请人</TableHead>
                <TableHead>学号</TableHead>
                <TableHead>项目名称</TableHead>
                <TableHead>项目类别</TableHead>
                <TableHead>交流地点</TableHead>
                <TableHead>申请金额</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications === null ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">Loading...</TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">暂无申请记录</TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application._id}>
                    <TableCell className="font-medium">{application.applicantName}</TableCell>
                    <TableCell>{application.studentId}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{application.projectName}</TableCell>
                    <TableCell>{application.projectCategory}</TableCell>
                    <TableCell>{application.exchangeLocation}</TableCell>
                    <TableCell>{formatCurrency(application.totalAmount)}</TableCell>
                    <TableCell>{formatDate(application.submittedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/reviewer/reimbursements/academic-exchange/${application._id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleDownload(application)}
                          disabled={downloadingId === application._id}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {downloadingId === application._id ? "下载中..." : "下载 PDF"}
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
    </div>
  )
}
