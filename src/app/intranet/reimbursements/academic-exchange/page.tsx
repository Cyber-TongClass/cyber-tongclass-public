"use client"

import Link from "next/link"
import { ArrowLeft, Eye, FilePlus2, FileText, TableProperties } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/academic-exchange"
import {
  ACADEMIC_EXCHANGE_REIMBURSEMENT_CATEGORY,
  reimbursementMaterialTableCards,
} from "@/lib/reimbursement-material-tables"
import {
  ACADEMIC_EXCHANGE_MATERIAL_CATEGORY,
  reimbursementMaterialPages,
} from "@/lib/reimbursement-material-pages"
import { useAcademicExchangeApplications, usePublishedReimbursementMaterialTables } from "@/lib/api"
import type { AcademicExchangeSupportApplication, ReimbursementMaterialTable } from "@/types"

export default function AcademicExchangeSupportPage() {
  const applications = useAcademicExchangeApplications() as AcademicExchangeSupportApplication[] | undefined
  const publishedTables = usePublishedReimbursementMaterialTables({
    category: ACADEMIC_EXCHANGE_REIMBURSEMENT_CATEGORY,
  }) as ReimbursementMaterialTable[] | undefined
  const visibleTables = publishedTables === undefined
    ? undefined
    : publishedTables.length > 0
      ? publishedTables
      : reimbursementMaterialTableCards
  const materialPages = reimbursementMaterialPages.filter((item) => item.category === ACADEMIC_EXCHANGE_MATERIAL_CATEGORY)

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[4rem] md:text-[7rem] lg:text-[9rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none">
            ACADEMIC
          </div>
          <Link href="/intranet/reimbursements" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回报销
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">学术交流支持</h1>
              <p className="text-lg text-white/70 max-w-2xl mt-2">
                查看学术交流材料和标准表格，提交新的支持申请，或查看已经提交的历史记录。
              </p>
            </div>
            <Button asChild className="bg-white text-primary hover:bg-white/90">
              <Link href="/intranet/reimbursements/academic-exchange/new">
                <FilePlus2 className="mr-2 h-4 w-4" />
                新增学术交流支持申请
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>学术交流报销相关资料</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {materialPages.map((item) => (
              <Link
                key={item.slug}
                href={`/intranet/reimbursements/materials/${item.slug}`}
                className="flex min-w-0 items-center gap-3 rounded-sm border border-slate-200 bg-white px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                  <span className="text-xs text-slate-400">查看页面</span>
                </span>
              </Link>
            ))}
            {visibleTables === undefined ? (
              <div className="flex min-w-0 items-center gap-3 rounded-sm border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                正在读取网页表格...
              </div>
            ) : (
              visibleTables.map((item) => (
                <Link
                  key={item.slug}
                  href={`/intranet/reimbursements/tables/${item.slug}`}
                  className="flex min-w-0 items-center gap-3 rounded-sm border border-slate-200 bg-white px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <TableProperties className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                    <span className="text-xs text-slate-400">查看表单</span>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>过往申请历史</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>项目类别</TableHead>
                  <TableHead>交流地点</TableHead>
                  <TableHead>申请金额</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications === undefined ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">Loading...</TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      暂无申请记录
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((application) => (
                    <TableRow key={application._id}>
                      <TableCell className="max-w-[260px] truncate font-medium">{application.projectName}</TableCell>
                      <TableCell>{application.projectCategory}</TableCell>
                      <TableCell>{application.exchangeLocation}</TableCell>
                      <TableCell>{formatCurrency(application.totalAmount)}</TableCell>
                      <TableCell>{formatDate(application.submittedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/intranet/reimbursements/academic-exchange/${application._id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
