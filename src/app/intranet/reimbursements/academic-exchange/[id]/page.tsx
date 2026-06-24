"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState, type ReactNode } from "react"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadAcademicExchangePdf, formatCurrency, formatDate, formatPaperAuthors } from "@/lib/academic-exchange"
import { useAcademicExchangeApplication } from "@/lib/api"
import type { AcademicExchangeSupportApplication } from "@/types"

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{value || "-"}</div>
    </div>
  )
}

export default function AcademicExchangeApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const application = useAcademicExchangeApplication(params.id) as AcademicExchangeSupportApplication | null | undefined
  const [message, setMessage] = useState("")
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!application) return
    setMessage("")
    setDownloading(true)
    try {
      await downloadAcademicExchangePdf(application)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF 导出失败")
    } finally {
      setDownloading(false)
    }
  }

  if (application === undefined) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button asChild variant="ghost">
            <Link href="/intranet/reimbursements/academic-exchange">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回学术交流支持
            </Link>
          </Button>
          <Card>
            <CardContent className="pt-6 text-sm text-slate-600">未找到该申请记录。</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const hasPaperInfo = Boolean(application.paperTitle || application.paperPdfUrl)
  const paperAuthors = formatPaperAuthors(application.paperAuthors || [], application.applicantAuthorName)

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost">
            <Link href="/intranet/reimbursements/academic-exchange">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回学术交流支持
            </Link>
          </Button>
          <Button type="button" onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "导出中..." : "下载申请表 PDF"}
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">{application.projectName}</h1>
          <p className="mt-1 text-sm text-slate-500">提交时间：{formatDate(application.submittedAt)}。该申请已提交，不能编辑。</p>
        </div>

        {message ? <p className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>申请人信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Field label="姓名" value={application.applicantName} />
            <Field label="学号" value={application.studentId} />
            <Field label="邮箱" value={application.email} />
            <Field label="性别" value={application.gender} />
            <Field label="联系电话" value={application.phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>项目信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="项目类别" value={application.projectCategory} />
            <Field label="项目名称" value={application.projectName} />
            <Field label="交流地点" value={application.exchangeLocation} />
            <Field label="项目时间" value={application.projectTime} />
            <Field label="有无其他资助来源" value={application.otherFunding} />
            <Field label="申请时间" value={application.applicationDate} />
            <div className="md:col-span-2">
              <Field label="项目计划" value={application.projectPlan} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关联论文</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field label="论文题目" value={application.paperTitle} />
            <Field
              label="作者"
              value={
                <span>
                  {paperAuthors.map((author, index) => (
                    <span key={`${author.raw}-${index}`}>
                      {index > 0 ? "，" : ""}
                      <span className={author.emphasized ? "font-semibold underline underline-offset-4 decoration-primary" : ""}>{author.name}</span>
                    </span>
                  ))}
                </span>
              }
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="申请人位次" value={application.applicantAuthorName ? `${application.applicantAuthorName}，${application.applicantAuthorIndexLabel || ""}` : "-"} />
              <Field label="申请人所在单位" value={application.applicantAffiliation} />
              <Field label="页数" value={hasPaperInfo ? `总页数 ${application.totalPages || ""}，正文页数 ${application.bodyPages || ""}` : "-"} />
            </div>
            <Field label="论文 PDF 链接" value={application.paperPdfUrl ? <a href={application.paperPdfUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{application.paperPdfUrl}</a> : "-"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申请金额</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>开支项目</TableHead>
                  <TableHead>预计金额（人民币元）</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {application.expenseItems.map((item, index) => (
                  <TableRow key={`${item.item}-${index}`}>
                    <TableCell>{item.item}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{item.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-right text-lg font-semibold text-slate-900">总计：{formatCurrency(application.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
