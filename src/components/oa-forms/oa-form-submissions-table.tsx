"use client"

import { useMemo, useState } from "react"
import { Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useOAFormAttachmentUrl } from "@/lib/api"
import { oaReviewStatusLabels, serializeOAFormSubmissionsToCsv } from "@/lib/oa-forms"
import type { OAFileAnswer, OAForm, OAFormSubmission, OAReviewStatus } from "@/types"

type Props = {
  form: OAForm
  submissions: OAFormSubmission[]
  onReview: (args: { id: string; reviewStatus: OAReviewStatus; adminNote?: string; resultValues?: Record<string, unknown> }) => Promise<void>
}

type SubmissionReviewDialogProps = {
  form: OAForm
  submission: OAFormSubmission
  initialMode: "view" | "edit"
  triggerLabel: string
  onReview: Props["onReview"]
  onSaved: (message: string) => void
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function isFileAnswer(value: unknown): value is OAFileAnswer[] {
  return Array.isArray(value) && value.some((item) => item && typeof item === "object" && "storageId" in item)
}

function AttachmentLink({ submissionId, file }: { submissionId: string; file: OAFileAnswer }) {
  const url = useOAFormAttachmentUrl({ submissionId, storageId: file.storageId })
  if (!url) return <span>{file.fileName}</span>
  return <a href={url as string} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">{file.fileName}<ExternalLink className="h-3 w-3" /></a>
}

function formatAnswer(submission: OAFormSubmission, fieldId: string) {
  const value = submission.answers?.[fieldId]
  if (isFileAnswer(value)) {
    return <div className="space-y-1">{value.map((file) => <AttachmentLink key={`${submission._id}-${file.storageId}`} submissionId={submission._id} file={file} />)}</div>
  }
  if (Array.isArray(value)) {
    return <span className="whitespace-pre-wrap">{value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("; ")}</span>
  }
  if (value && typeof value === "object") return <span className="whitespace-pre-wrap">{JSON.stringify(value)}</span>
  return <span className="whitespace-pre-wrap">{String(value ?? "-")}</span>
}

function summarizeAnswer(value: unknown) {
  if (isFileAnswer(value)) return value.map((file) => file.fileName).join("、") || "-"
  if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("；") || "-"
  if (value && typeof value === "object") return JSON.stringify(value)
  return String(value ?? "-")
}

function formatTime(value?: number) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function SubmissionReviewDialog({ form, submission, initialMode, triggerLabel, onReview, onSaved }: SubmissionReviewDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"view" | "edit">(initialMode)
  const [reviewStatus, setReviewStatus] = useState<OAReviewStatus>(submission.reviewStatus)
  const [adminNote, setAdminNote] = useState(submission.adminNote || "")
  const [resultValues, setResultValues] = useState<Record<string, string>>(() => Object.fromEntries((form.resultFields || []).map((field) => [field.id, String(submission.resultValues?.[field.id] ?? "")])) as Record<string, string>)
  const [saving, setSaving] = useState(false)

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setMode(initialMode)
      setReviewStatus(submission.reviewStatus)
      setAdminNote(submission.adminNote || "")
      setResultValues(Object.fromEntries((form.resultFields || []).map((field) => [field.id, String(submission.resultValues?.[field.id] ?? "")])) as Record<string, string>)
    }
  }

  const saveReview = async () => {
    setSaving(true)
    try {
      const normalizedResults = Object.fromEntries((form.resultFields || []).map((field) => {
        const value = resultValues[field.id] ?? ""
        return [field.id, field.type === "number" && value !== "" ? Number(value) : value]
      }).filter(([, value]) => value !== ""))
      await onReview({ id: submission._id, reviewStatus, adminNote, resultValues: normalizedResults })
      onSaved("审核结果已保存")
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="text-sm font-medium text-primary hover:underline">{triggerLabel}</button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "修改审核" : "查看提交"}</DialogTitle>
          <DialogDescription>{submission.submitterName} · {submission.studentId} · {formatTime(submission.submittedAt)}</DialogDescription>
        </DialogHeader>
        {mode === "edit" ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">审核状态</label>
                <select className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as OAReviewStatus)}>
                  {Object.entries(oaReviewStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">管理员备注</label>
                <Textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={4} placeholder="例如：请补充票据、审核意见等" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="font-medium text-slate-900">结果回填</div>
              {(form.resultFields || []).length === 0 ? <p className="text-sm text-slate-500">暂未配置结果字段。</p> : (form.resultFields || []).map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{field.label}</label>
                  <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={resultValues[field.id] || ""} onChange={(event) => setResultValues((current) => ({ ...current, [field.id]: event.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setMode("view")}>返回查看</Button>
              <Button type="button" disabled={saving} onClick={() => void saveReview()}>{saving ? "保存中..." : "保存修改"}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {form.fields.map((field) => (
                <div key={field.id} className="rounded-md border bg-slate-50 px-3 py-2">
                  <div className="text-xs font-medium text-slate-500">{field.label}</div>
                  <div className="mt-1 break-words text-sm text-slate-900">{formatAnswer(submission, field.id)}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border px-3 py-2 text-sm"><span className="text-slate-500">状态：</span>{oaReviewStatusLabels[submission.reviewStatus]}</div>
              {submission.adminNote ? <div className="rounded-md border px-3 py-2 text-sm"><span className="text-slate-500">管理员备注：</span>{submission.adminNote}</div> : null}
              {(form.resultFields || []).map((field) => (
                <div key={field.id} className="rounded-md border px-3 py-2 text-sm"><span className="text-slate-500">{field.label}：</span>{String(submission.resultValues?.[field.id] ?? "-")}</div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setMode("edit")}>修改审核</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function OAFormSubmissionsTable({ form, submissions, onReview }: Props) {
  const visibleFields = useMemo(() => form.fields.slice(0, 2), [form.fields])
  const [message, setMessage] = useState("")

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>提交记录</CardTitle>
          <Button type="button" variant="outline" disabled={submissions.length === 0} onClick={() => downloadTextFile(`${form.slug}-submissions.csv`, serializeOAFormSubmissionsToCsv(form, submissions))}>
            <Download className="mr-2 h-4 w-4" />导出 CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {message ? <p className="mb-3 text-sm text-slate-600">{message}</p> : null}
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>提交人</TableHead>
              <TableHead>学号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>提交时间</TableHead>
              <TableHead>摘要</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-500">暂无提交</TableCell></TableRow>
            ) : submissions.map((submission) => (
              <TableRow key={submission._id}>
                <TableCell className="font-medium">{submission.submitterName}</TableCell>
                <TableCell>{submission.studentId}</TableCell>
                <TableCell>{oaReviewStatusLabels[submission.reviewStatus]}</TableCell>
                <TableCell className="whitespace-nowrap">{formatTime(submission.submittedAt)}</TableCell>
                <TableCell className="max-w-[360px] truncate text-sm text-slate-600">
                  {visibleFields.map((field) => `${field.label}: ${summarizeAnswer(submission.answers?.[field.id])}`).join("；") || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-3">
                    <SubmissionReviewDialog form={form} submission={submission} initialMode="view" triggerLabel="查看" onReview={onReview} onSaved={setMessage} />
                    <SubmissionReviewDialog form={form} submission={submission} initialMode="edit" triggerLabel="修改" onReview={onReview} onSaved={setMessage} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
