"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OAFormRenderer } from "@/components/oa-forms/oa-form-renderer"
import { isOAFormCollecting, oaReviewStatusLabels } from "@/lib/oa-forms"
import { useMyOAFormSubmissions, useOAFormAttachmentUrl, usePublishedOAFormBySlug, useSubmitOAForm, useUpdateOAFormSubmission } from "@/lib/api"
import type { OAFileAnswer, OAForm, OAFormSubmission } from "@/types"

function formatTime(value?: number) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function formatResult(form: OAForm, resultValues?: Record<string, unknown>) {
  if (!resultValues || Object.keys(resultValues).length === 0) return "-"
  const labelById = new Map((form.resultFields || []).map((field) => [field.id, field.label]))
  return Object.entries(resultValues).map(([key, value]) => `${labelById.get(key) || key}: ${String(value ?? "")}`).join("；")
}

function isFileAnswer(value: unknown): value is OAFileAnswer[] {
  return Array.isArray(value) && value.some((item) => item && typeof item === "object" && "storageId" in item)
}

function AttachmentLink({ submissionId, file }: { submissionId: string; file: OAFileAnswer }) {
  const url = useOAFormAttachmentUrl({ submissionId, storageId: file.storageId })
  if (!url) return <span>{file.fileName}</span>
  return (
    <a href={url as string} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
      {file.fileName}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function formatAnswerValue(submissionId: string, value: unknown) {
  if (isFileAnswer(value)) {
    return (
      <div className="space-y-1">
        {value.map((file) => <AttachmentLink key={`${submissionId}-${file.storageId}`} submissionId={submissionId} file={file} />)}
      </div>
    )
  }
  if (Array.isArray(value)) {
    return <span className="whitespace-pre-wrap">{value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("；")}</span>
  }
  if (value && typeof value === "object") return <span className="whitespace-pre-wrap">{JSON.stringify(value)}</span>
  return <span className="whitespace-pre-wrap">{String(value ?? "-")}</span>
}

function SubmissionDialog({ form, submission, canEdit, initialMode, triggerLabel }: { form: OAForm; submission: OAFormSubmission; canEdit: boolean; initialMode: "view" | "edit"; triggerLabel: string }) {
  const updateSubmission = useUpdateOAFormSubmission()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"view" | "edit">(initialMode)

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) setMode(initialMode)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="text-sm font-medium text-primary hover:underline">{triggerLabel}</button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "修改提交内容" : "提交内容"}</DialogTitle>
          <DialogDescription>{formatTime(submission.submittedAt)} · {oaReviewStatusLabels[submission.reviewStatus]}</DialogDescription>
        </DialogHeader>
        {mode === "edit" ? (
          <OAFormRenderer
            form={form}
            initialAnswers={submission.answers}
            heading="修改提交"
            submitLabel="保存修改"
            onSubmit={async (answers) => {
              await updateSubmission({ id: submission._id, answers })
              window.location.reload()
            }}
          />
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {form.fields.map((field) => (
                <div key={field.id} className="rounded-md border bg-slate-50 px-3 py-2">
                  <div className="text-xs font-medium text-slate-500">{field.label}</div>
                  <div className="mt-1 break-words text-sm text-slate-900">{formatAnswerValue(submission._id, submission.answers?.[field.id])}</div>
                </div>
              ))}
            </div>
            {submission.adminNote ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="font-medium">管理员备注</div>
                <div className="mt-1 whitespace-pre-wrap">{submission.adminNote}</div>
              </div>
            ) : null}
            {form.resultsVisible && submission.resultValues && Object.keys(submission.resultValues).length > 0 ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950">
                <div className="font-medium">结果</div>
                <div className="mt-1">{formatResult(form, submission.resultValues)}</div>
              </div>
            ) : null}
            {canEdit ? (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setMode("edit")}>修改提交</Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function IntranetFormDetailPage() {
  const params = useParams<{ slug: string }>()
  const form = usePublishedOAFormBySlug(params.slug) as OAForm | null | undefined
  const submissions = useMyOAFormSubmissions(form?._id || null) as OAFormSubmission[] | undefined
  const submitForm = useSubmitOAForm()
  const collecting = form ? isOAFormCollecting(form) : false
  const canEditSubmissions = Boolean(form?.allowSubmissionEdits && collecting)

  if (form === undefined) {
    return <div className="min-h-screen bg-[hsl(211,30%,97%)] flex items-center justify-center text-slate-500">Loading...</div>
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button asChild variant="ghost"><Link href="/intranet/forms"><ArrowLeft className="mr-2 h-4 w-4" />返回 OA 填报</Link></Button>
          <Card><CardContent className="py-10 text-center text-sm text-slate-500">表单不存在或尚未发布。</CardContent></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <Button asChild variant="ghost"><Link href="/intranet/forms"><ArrowLeft className="mr-2 h-4 w-4" />返回 OA 填报</Link></Button>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{form.category}</Badge>{form.resultsVisible ? <Badge>可查看结果</Badge> : null}</div>
          <h1 className="text-3xl font-extrabold text-slate-900">{form.title}</h1>
          {form.description ? <p className="max-w-3xl text-sm leading-7 text-slate-600">{form.description}</p> : null}
        </div>

        {collecting ? (
          <OAFormRenderer
            form={form}
            heading="新建提交"
            onSubmit={async (answers) => {
              await submitForm({ formId: form._id, answers })
              window.location.reload()
            }}
            submitLabel="提交填报"
          />
        ) : (
          <Card><CardContent className="py-8 text-sm text-slate-600">该表单已停止收集，你仍可查看自己的提交记录。</CardContent></Card>
        )}

        <Card>
          <CardHeader><CardTitle>我的提交记录</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-48">提交时间</TableHead><TableHead className="w-32">状态</TableHead><TableHead>详情</TableHead></TableRow></TableHeader>
              <TableBody>
                {submissions === undefined ? <TableRow><TableCell colSpan={3} className="text-center text-slate-500">Loading...</TableCell></TableRow> : submissions.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-slate-500">暂无提交记录</TableCell></TableRow> : submissions.map((submission) => (
                  <TableRow key={submission._id}>
                    <TableCell className="whitespace-nowrap">{formatTime(submission.submittedAt)}</TableCell>
                    <TableCell>{oaReviewStatusLabels[submission.reviewStatus]}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <SubmissionDialog form={form} submission={submission} canEdit={canEditSubmissions} initialMode="view" triggerLabel="查看内容" />
                        {canEditSubmissions ? <SubmissionDialog form={form} submission={submission} canEdit={canEditSubmissions} initialMode="edit" triggerLabel="修改" /> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
