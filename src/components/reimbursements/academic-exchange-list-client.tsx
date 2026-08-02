"use client"

import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Eye, FilePlus2, FileText, TableProperties } from "lucide-react"
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
import { useAuth } from "@/lib/hooks/use-auth"
import { AiaOAAuthLoading, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import type { AcademicExchangeSupportApplication, ReimbursementMaterialTable } from "@/types"

export function AcademicExchangeListClient() {
  const { isAuthenticated, isLoading } = useAuth()
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

  if (isLoading) return <AiaOAAuthLoading />
  if (!isAuthenticated) {
    return (
      <div className="container-custom max-w-5xl py-10">
        <AiaOALoginRequired
          nextPath="/services/oa/reimbursements/academic-exchange"
          action="办理学术交流支持申请"
        />
      </div>
    )
  }

  return (
    <main className="aia-scope min-h-screen">
      <header className="border-b aia-border-rule">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <Link href="/services/oa" className="aia-focus aia-link aia-mono mb-8 inline-flex items-center gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" />
            返回 OA
          </Link>
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="aia-kicker">REIMBURSEMENT · ACADEMIC EXCHANGE</p>
              <h1 className="aia-serif mt-3 text-4xl font-medium tracking-tight md:text-5xl">学术交流支持</h1>
              <p className="aia-text-muted mt-4 max-w-2xl text-sm leading-7 md:text-base">
                查看学术交流材料和标准表格，提交新的支持申请，或查看已经提交的历史记录。
              </p>
            </div>
            <Link
              href="/services/oa/reimbursements/academic-exchange/new"
              className="aia-focus aia-mono inline-flex w-fit items-center gap-2 border border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[hsl(var(--aia-red-deep))]"
            >
              <FilePlus2 className="h-4 w-4" />
              新增申请
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <section aria-labelledby="academic-exchange-resources">
          <div className="mb-5 flex items-baseline justify-between border-b aia-border-rule pb-3">
            <h2 id="academic-exchange-resources" className="aia-serif text-2xl">相关资料</h2>
            <span className="aia-mono aia-text-muted text-[0.68rem] tracking-[0.16em]">REFERENCE</span>
          </div>
          <div className="grid border-t border-l aia-border-rule md:grid-cols-3">
            {materialPages.map((item) => (
              <Link
                key={item.slug}
                href={`/services/oa/materials/${item.slug}`}
                className="aia-focus group flex min-w-0 items-center gap-3 border-r border-b aia-border-rule px-4 py-4"
              >
                <span className="aia-bg-tag aia-text-red flex h-9 w-9 flex-shrink-0 items-center justify-center">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium transition-colors group-hover:text-[hsl(var(--aia-red))]">{item.title}</span>
                  <span className="aia-mono aia-text-muted mt-1 block text-[0.68rem]">查看页面</span>
                </span>
                <ArrowUpRight className="aia-text-muted ml-auto h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ))}
            {visibleTables === undefined ? (
              <div role="status" className="aia-text-muted flex min-w-0 items-center gap-3 border-r border-b aia-border-rule px-4 py-4 text-sm">
                正在读取网页表格…
              </div>
            ) : (
              visibleTables.map((item) => (
                <Link
                  key={item.slug}
                  href={`/services/oa/tables/${item.slug}`}
                  className="aia-focus group flex min-w-0 items-center gap-3 border-r border-b aia-border-rule px-4 py-4"
                >
                  <span className="aia-bg-tag aia-text-red flex h-9 w-9 flex-shrink-0 items-center justify-center">
                    <TableProperties className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium transition-colors group-hover:text-[hsl(var(--aia-red))]">{item.title}</span>
                    <span className="aia-mono aia-text-muted mt-1 block text-[0.68rem]">查看表格</span>
                  </span>
                  <ArrowUpRight className="aia-text-muted ml-auto h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="academic-exchange-history">
          <div className="mb-5 flex items-baseline justify-between border-b aia-border-rule pb-3">
            <h2 id="academic-exchange-history" className="aia-serif text-2xl">过往申请</h2>
            <span className="aia-mono aia-text-muted text-[0.68rem] tracking-[0.16em]">HISTORY</span>
          </div>
          <div className="overflow-x-auto border-t aia-border-rule">
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
                    <TableCell colSpan={6} className="aia-text-muted h-24 text-center">
                      <span role="status">正在加载申请记录…</span>
                    </TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="aia-text-muted h-24 text-center">
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
                        <Link
                          href={`/services/oa/reimbursements/academic-exchange/${application._id}`}
                          className="aia-focus aia-link aia-mono inline-flex items-center gap-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          查看
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </main>
  )
}
