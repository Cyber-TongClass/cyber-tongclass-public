"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, ClipboardList, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { OAFormRenderer } from "@/components/oa-forms/oa-form-renderer"
import { isOAFormCollecting } from "@/lib/oa-forms"
import { useMyOAFormSubmissions, usePublishedOAFormBySlug, useSubmitOAForm, useUpdateOAFormSubmission } from "@/lib/api"
import type { OAForm, OAFormSubmission } from "@/types"

function formatTime(value?: number) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function EditSubmissionDialog({ form, submission }: { form: OAForm; submission: OAFormSubmission }) {
  const updateSubmission = useUpdateOAFormSubmission()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm"><Pencil className="mr-1.5 h-3.5 w-3.5" />修改</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>修改提交内容</DialogTitle></DialogHeader>
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
          <Card><CardContent className="py-8 text-sm text-slate-600">该表单已停止收集。你可在“我的提交”中查看提交内容与审核进度。</CardContent></Card>
        )}

        <Card>
          <CardHeader><CardTitle>我的提交</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline"><Link href="/intranet/forms/submissions"><ClipboardList className="mr-2 h-4 w-4" />查看我的提交与审核进度</Link></Button>
            {canEditSubmissions ? (
              submissions === undefined ? <p className="text-sm text-slate-500">Loading...</p> : submissions.length === 0 ? <p className="text-sm text-slate-500">暂无可修改的提交。</p> : (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium text-slate-700">当前表单允许修改提交：</p>
                  {submissions.map((submission) => <div key={submission._id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"><span className="text-sm text-slate-600">{formatTime(submission.submittedAt)}</span><EditSubmissionDialog form={form} submission={submission} /></div>)}
                </div>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
