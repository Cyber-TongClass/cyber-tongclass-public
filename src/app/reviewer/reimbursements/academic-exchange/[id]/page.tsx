"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { ArrowLeft, Check, Download, MessageSquareWarning, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate, formatPaperAuthors } from "@/lib/academic-exchange"
import { getAcademicExchangePaperPdfLabel, hasAcademicExchangePaperPdfAttachment } from "@/lib/academic-exchange-pdf-source"
import { reviewerAccessHeaders, useReviewerAccess, type ReviewerAccess } from "@/app/reviewer/reviewer-access-context"
import type { AcademicExchangeSupportApplication } from "@/types"

type ReviewAction = "start_review" | "request_changes" | "approve" | "reject"

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
    <div className="rounded-sm border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{value || "-"}</div>
    </div>
  )
}

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

async function downloadReviewerPdf(
  application: AcademicExchangeSupportApplication,
  reviewerAccess: ReviewerAccess,
) {
  const response = await fetch(`/api/reviewer/academic-exchange/${application._id}/pdf`, {
    method: "POST",
    headers: reviewerAccessHeaders(reviewerAccess),
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

export default function ReviewerAcademicExchangeDetailPage() {
  const reviewerAccess = useReviewerAccess()
  const params = useParams<{ id: string }>()
  const [application, setApplication] = useState<AcademicExchangeSupportApplication | null | undefined>(undefined)
  const [message, setMessage] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [reviewNote, setReviewNote] = useState("")
  const [reviewingAction, setReviewingAction] = useState<ReviewAction | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadApplication() {
      setMessage("")
      try {
        const response = await fetch(`/api/reviewer/academic-exchange/${params.id}`, {
          cache: "no-store",
          headers: reviewerAccessHeaders(reviewerAccess),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          setMessage(payload?.message || "无法读取申请详情")
          if (!cancelled) setApplication(null)
          return
        }
        if (!cancelled) {
          setApplication(payload.application)
          setReviewNote(payload.application?.reviewNote || "")
        }
      } catch {
        if (!cancelled) {
          setMessage("无法读取申请详情")
          setApplication(null)
        }
      }
    }
    loadApplication()
    return () => {
      cancelled = true
    }
  }, [params.id, reviewerAccess])

  const handleDownload = async () => {
    if (!application) return
    setMessage("")
    setDownloading(true)
    try {
      await downloadReviewerPdf(application, reviewerAccess)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF 下载失败")
    } finally {
      setDownloading(false)
    }
  }

  const handleReview = async (action: ReviewAction) => {
    if (!application) return
    const note = reviewNote.trim()
    if ((action === "request_changes" || action === "reject") && !note) {
      setMessage("退回补充或驳回申请时，请先填写审核意见。")
      return
    }

    setMessage("")
    setReviewingAction(action)
    try {
      const response = await fetch(`/api/reviewer/academic-exchange/${application._id}`, {
        method: "POST",
        headers: reviewerAccessHeaders(reviewerAccess, { "Content-Type": "application/json" }),
        body: JSON.stringify({ action, note: note || undefined }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.message || "审核操作失败")
      }
      setApplication(payload.application)
      setReviewNote(payload.application?.reviewNote || "")
      setMessage(`审核状态已更新为“${STATUS_LABELS[payload.application.status as AcademicExchangeSupportApplication["status"]]}”。`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "审核操作失败")
    } finally {
      setReviewingAction(null)
    }
  }

  if (application === undefined) {
    return <p className="text-sm text-slate-500">Loading...</p>
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost">
          <Link href="/reviewer/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请列表
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-slate-600">{message || "未找到该申请记录。"}</CardContent>
        </Card>
      </div>
    )
  }

  const hasPaperInfo = Boolean(application.paperTitle || hasAcademicExchangePaperPdfAttachment(application))
  const paperAuthors = formatPaperAuthors(application.paperAuthors || [], application.applicantAuthorName)
  const paperPdfLabel = getAcademicExchangePaperPdfLabel(application)
  const isTerminal = ["approved", "rejected", "withdrawn"].includes(application.status)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost">
          <Link href="/reviewer/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请列表
          </Link>
        </Button>
        <Button type="button" onClick={handleDownload} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "下载中..." : "下载申请表 PDF"}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-slate-950">{application.projectName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          提交时间：{formatDate(application.submittedAt)}。当前状态：{STATUS_LABELS[application.status]}。
        </p>
      </div>

      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>审核处理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="当前状态" value={STATUS_LABELS[application.status]} />
            <Field label="最近审核人" value={application.reviewerName} />
            <Field label="最近处理时间" value={application.reviewedAt ? formatDate(application.reviewedAt) : "-"} />
          </div>
          <div className="space-y-2">
            <label htmlFor="academic-exchange-review-note" className="text-sm font-medium text-slate-900">
              审核意见
            </label>
            <Textarea
              id="academic-exchange-review-note"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="退回补充或驳回时必填；通过时可填写说明。"
              rows={4}
              disabled={isTerminal || reviewingAction !== null}
            />
          </div>
          {isTerminal ? (
            <p className="text-sm text-slate-600">该申请已结束，审核状态不能再次变更。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {application.status !== "reviewing" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleReview("start_review")}
                  disabled={reviewingAction !== null}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {reviewingAction === "start_review" ? "处理中..." : "开始审核"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleReview("request_changes")}
                disabled={reviewingAction !== null || !reviewNote.trim()}
              >
                <MessageSquareWarning className="mr-2 h-4 w-4" />
                {reviewingAction === "request_changes" ? "处理中..." : "退回补充"}
              </Button>
              <Button
                type="button"
                onClick={() => handleReview("approve")}
                disabled={reviewingAction !== null}
              >
                <Check className="mr-2 h-4 w-4" />
                {reviewingAction === "approve" ? "处理中..." : "通过"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleReview("reject")}
                disabled={reviewingAction !== null || !reviewNote.trim()}
              >
                <X className="mr-2 h-4 w-4" />
                {reviewingAction === "reject" ? "处理中..." : "驳回"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <span className={author.emphasized ? "font-semibold underline underline-offset-4 decoration-slate-900" : ""}>{author.name}</span>
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
              application.paperPdfStorageId ? paperPdfLabel : application.paperPdfUrl ? (
                <a href={application.paperPdfUrl} target="_blank" rel="noreferrer" className="text-slate-950 underline underline-offset-4">{application.paperPdfUrl}</a>
              ) : "-"
            }
          />
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
          <p className="text-right text-lg font-semibold text-slate-950">总计：{formatCurrency(application.totalAmount)}</p>
        </CardContent>
      </Card>
    </div>
  )
}
