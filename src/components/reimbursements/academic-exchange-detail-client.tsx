"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState, type ReactNode } from "react"
import { ArrowLeft, Download, Pencil, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadAcademicExchangePdf, formatCurrency, formatDate, formatPaperAuthors } from "@/lib/academic-exchange"
import {
  getAcademicExchangeBrandTitle,
  resolveAcademicExchangeBrand,
} from "@/lib/academic-exchange-brand"
import { getAcademicExchangePaperPdfLabel, hasAcademicExchangePaperPdfAttachment } from "@/lib/academic-exchange-pdf-source"
import {
  useAcademicExchangeApplication,
  useAcademicExchangePaperPdfUrl,
  useWithdrawAcademicExchangeApplication,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { AiaOAAuthLoading, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import type { AcademicExchangeSupportApplication } from "@/types"

const STATUS_LABELS: Record<AcademicExchangeSupportApplication["status"], string> = {
  submitted: "待审核",
  reviewing: "审核中",
  needs_changes: "待补充",
  approved: "已通过",
  rejected: "已驳回",
  withdrawn: "已撤回",
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="border-b aia-border-rule py-3">
      <dt className="aia-mono aia-text-muted text-[0.68rem] tracking-[0.08em]">{label}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6">{value || "-"}</dd>
    </div>
  )
}

function DetailSection({ title, marker, children }: { title: string; marker: string; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b aia-border-rule pb-3">
        <h2 className="aia-serif text-2xl">{title}</h2>
        <span className="aia-mono aia-text-muted text-[0.68rem] tracking-[0.16em]">{marker}</span>
      </div>
      {children}
    </section>
  )
}

export function AcademicExchangeDetailClient() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading } = useAuth()
  const application = useAcademicExchangeApplication(params.id) as AcademicExchangeSupportApplication | null | undefined
  const uploadedPaperPdfUrl = useAcademicExchangePaperPdfUrl(params.id) as string | null | undefined
  const withdrawApplication = useWithdrawAcademicExchangeApplication()
  const [message, setMessage] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

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

  const handleWithdraw = async () => {
    if (!application) return
    if (!window.confirm("确定撤回这份申请吗？撤回后不能继续审核，也不能恢复。")) return
    setMessage("")
    setWithdrawing(true)
    try {
      await withdrawApplication(application._id)
      setMessage("申请已撤回。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "申请撤回失败")
    } finally {
      setWithdrawing(false)
    }
  }

  if (isLoading) return <AiaOAAuthLoading />
  if (!isAuthenticated) {
    return (
      <div className="container-custom max-w-5xl py-10">
        <AiaOALoginRequired
          nextPath={`/services/oa/reimbursements/academic-exchange/${params.id}`}
          action="查看学术交流支持申请"
        />
      </div>
    )
  }

  if (application === undefined) {
    return (
      <main className="aia-scope flex min-h-screen items-center justify-center">
        <p role="status" className="aia-mono aia-text-muted text-xs">正在读取申请…</p>
      </main>
    )
  }

  if (!application) {
    return (
      <main className="aia-scope min-h-screen px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button asChild variant="ghost">
            <Link href="/services/oa/reimbursements/academic-exchange">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回学术交流支持
            </Link>
          </Button>
          <p role="status" className="aia-text-muted border-t border-b aia-border-rule py-8 text-sm">未找到该申请记录。</p>
        </div>
      </main>
    )
  }

  const hasPaperInfo = Boolean(application.paperTitle || hasAcademicExchangePaperPdfAttachment(application))
  const paperAuthors = formatPaperAuthors(application.paperAuthors || [], application.applicantAuthorName)
  const paperPdfLabel = getAcademicExchangePaperPdfLabel(application)
  const canWithdraw = ["submitted", "reviewing", "needs_changes"].includes(application.status)
  const pdfBrandTitle = getAcademicExchangeBrandTitle(resolveAcademicExchangeBrand(application))

  return (
    <main className="aia-scope min-h-screen px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost">
            <Link href="/services/oa/reimbursements/academic-exchange">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回学术交流支持
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            {application.status === "needs_changes" ? (
              <Button asChild>
                <Link href={`/services/oa/reimbursements/academic-exchange/${application._id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  补充并重新提交
                </Link>
              </Button>
            ) : null}
            {canWithdraw ? (
              <Button type="button" variant="outline" onClick={handleWithdraw} disabled={withdrawing}>
                <Undo2 className="mr-2 h-4 w-4" />
                {withdrawing ? "撤回中..." : "撤回申请"}
              </Button>
            ) : null}
            <Button type="button" onClick={handleDownload} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "导出中..." : "下载申请表 PDF"}
            </Button>
          </div>
        </div>

        <header className="border-b aia-border-rule pb-8">
          <p className="aia-kicker">ACADEMIC EXCHANGE · APPLICATION</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="aia-serif text-3xl font-medium md:text-4xl">{application.projectName}</h1>
            <span className="aia-bg-tag aia-mono w-fit px-2.5 py-1 text-xs text-[hsl(var(--aia-red))]">
              {STATUS_LABELS[application.status]}
            </span>
          </div>
          <p className="aia-mono aia-text-muted mt-3 text-xs">
            提交时间：{formatDate(application.submittedAt)}。当前状态：{STATUS_LABELS[application.status]}。
          </p>
          <p className="aia-mono aia-text-muted mt-1 text-xs">PDF 抬头：{pdfBrandTitle}</p>
        </header>

        {message ? <p role="status" aria-live="polite" className="border-y aia-border-rule bg-[hsl(var(--aia-tag))] px-4 py-3 text-sm text-[hsl(var(--aia-red-deep))]">{message}</p> : null}

        <DetailSection title="审核进度" marker="REVIEW">
          <dl className="grid gap-x-8 md:grid-cols-3">
            <Field label="当前状态" value={STATUS_LABELS[application.status]} />
            <Field label="最近审核人" value={application.reviewerName} />
            <Field label="最近处理时间" value={application.reviewedAt ? formatDate(application.reviewedAt) : "-"} />
            <div className="md:col-span-3">
              <Field
                label="审核意见"
                value={application.reviewNote || (application.status === "needs_changes" ? "Reviewer 尚未填写补充说明，请联系报销评审人员。" : "-")}
              />
            </div>
          </dl>
        </DetailSection>

        <DetailSection title="申请人信息" marker="APPLICANT">
          <dl className="grid gap-x-8 md:grid-cols-3">
            <Field label="姓名" value={application.applicantName} />
            <Field label="学号" value={application.studentId} />
            <Field label="邮箱" value={application.email} />
            <Field label="性别" value={application.gender} />
            <Field label="联系电话" value={application.phone} />
          </dl>
        </DetailSection>

        <DetailSection title="项目信息" marker="PROJECT">
          <dl className="grid gap-x-8 md:grid-cols-2">
            <Field label="项目类别" value={application.projectCategory} />
            <Field label="项目名称" value={application.projectName} />
            <Field label="交流地点" value={application.exchangeLocation} />
            <Field label="项目时间" value={application.projectTime} />
            <Field label="有无其他资助来源" value={application.otherFunding} />
            <Field label="申请时间" value={application.applicationDate} />
            <div className="md:col-span-2">
              <Field label="项目计划" value={application.projectPlan} />
            </div>
          </dl>
        </DetailSection>

        <DetailSection title="关联论文" marker="PUBLICATION">
          <dl className="grid gap-x-8">
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
            <Field
              label="论文 PDF 来源"
              value={
                application.paperPdfStorageId ? (
                  uploadedPaperPdfUrl ? (
                    <a href={uploadedPaperPdfUrl} target="_blank" rel="noreferrer" className="aia-link">{paperPdfLabel}</a>
                  ) : paperPdfLabel
                ) : application.paperPdfUrl ? (
                  <a href={application.paperPdfUrl} target="_blank" rel="noreferrer" className="aia-link">{application.paperPdfUrl}</a>
                ) : "-"
              }
            />
          </dl>
        </DetailSection>

        <DetailSection title="申请金额" marker="EXPENSES">
          <div className="space-y-4 overflow-x-auto border-t aia-border-rule">
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
            <p className="aia-serif text-right text-xl">总计：{formatCurrency(application.totalAmount)}</p>
          </div>
        </DetailSection>
      </div>
    </main>
  )
}
