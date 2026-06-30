"use client"

import { FormEvent, useMemo, useState } from "react"
import { Download, Plus } from "lucide-react"
import { ReimbursementFileUploadField } from "@/components/reimbursements/reimbursement-file-upload-field"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDayReimbursementStatusBadge } from "@/components/techday/techday-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  useCreateTechDayReimbursement,
  useDeleteTechDayReimbursement,
  useExportTechDayReimbursements,
  useFinalizeTechDayReimbursementAttachment,
  useGenerateTechDayUploadUrl,
  useReviewTechDayReimbursement,
  useTechDayActorArgs,
  useTechDayCurrentPrincipal,
  useTechDayReimbursements,
} from "@/lib/api"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import { downloadCsv, type TechDayReimbursementStatus } from "@/types/techday"

const reviewOptions: Array<{ status: TechDayReimbursementStatus; label: string }> = [
  { status: "approved", label: "通过" },
  { status: "rejected", label: "拒绝" },
  { status: "waiting_more", label: "补材料" },
]

const reimbursementCsvHeaders = {
  project_name: "项目名称",
  organization: "组织",
  amount: "金额",
  invoice_company: "发票抬头公司",
  content: "报销内容",
  quantity: "数量",
  status: "状态",
  submitter: "提交人",
  reviewer: "审核人",
  submitted_at: "提交时间",
  reviewed_at: "审核时间",
  attachment: "附件",
}

const formatDateTime = (value?: number | null) => {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function TechDayReimbursementsPage() {
  const actorArgs = useTechDayActorArgs()
  const principal = useTechDayCurrentPrincipal(actorArgs)
  const create = useCreateTechDayReimbursement()
  const remove = useDeleteTechDayReimbursement()
  const review = useReviewTechDayReimbursement()
  const generateUploadUrl = useGenerateTechDayUploadUrl()
  const finalizeAttachment = useFinalizeTechDayReimbursementAttachment()
  const [form, setForm] = useState({ projectName: "", organization: "", content: "", quantity: "", amount: "", invoiceCompany: "" })
  const [file, setFile] = useState<File | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const isAdmin = principal?.techDayUser?.role === "admin" || principal?.mainUser?.role === "admin" || principal?.mainUser?.role === "super_admin"
  const canUseReimbursements = principal !== undefined && (isAdmin || principal?.techDayUser?.role === "volunteer")
  const reimbursements = useTechDayReimbursements(canUseReimbursements ? actorArgs : null)
  const exportRows = useExportTechDayReimbursements(isAdmin ? actorArgs : null)
  const orgOptions = useMemo(() => principal?.techDayUser?.assignedTracks?.length ? principal.techDayUser.assignedTracks : principal?.techDayUser?.volunteerTracks || ["待分配"], [principal])

  const resetForm = () => {
    setForm({ projectName: "", organization: "", content: "", quantity: "", amount: "", invoiceCompany: "" })
    setFile(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const id = await create({
        ...actorArgs,
        projectName: form.projectName,
        organization: form.organization || orgOptions[0] || "待分配",
        content: form.content,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        amount: Number(form.amount),
        invoiceCompany: form.invoiceCompany,
      })
      if (file) {
        const uploadTarget = await generateUploadUrl({
          ...actorArgs,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileKind: "reimbursement",
        } as any)
        const storageId = await uploadFileToStorageTarget(uploadTarget as any, file, "附件上传失败")
        await finalizeAttachment({
          ...actorArgs,
          reimbursementId: id as any,
          storageId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        } as any)
      }
      resetForm()
      setDialogOpen(false)
      setMessage(file ? "报销和附件已提交" : "报销已提交")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TechDayShell title="报销管理" description="志愿者提交自己的报销，管理员审核和导出。">
      <TechDayAccessGuard role="volunteer">
        <div className="grid min-w-0 gap-4">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>报销记录</CardTitle>
                  {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (open) setMessage(null)
                  }}>
                    <DialogTrigger asChild>
                      <Button type="button" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        新建报销
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto sm:rounded-md">
                      <DialogHeader>
                        <DialogTitle>新建报销</DialogTitle>
                        <DialogDescription>提交项目、金额、发票信息和附件，管理员会在记录列表中审核。</DialogDescription>
                      </DialogHeader>
                      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
                        <div className="grid gap-2">
                          <Label>项目名称</Label>
                          <Input value={form.projectName} onChange={(event) => setForm((value) => ({ ...value, projectName: event.target.value }))} required />
                        </div>
                        <div className="grid gap-2">
                          <Label>组织</Label>
                          <Input value={form.organization} placeholder={orgOptions[0] || "待分配"} onChange={(event) => setForm((value) => ({ ...value, organization: event.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                          <Label>金额</Label>
                          <Input value={form.amount} type="number" step="0.01" onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} required />
                        </div>
                        <div className="grid gap-2">
                          <Label>数量</Label>
                          <Input value={form.quantity} type="number" onChange={(event) => setForm((value) => ({ ...value, quantity: event.target.value }))} />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                          <Label>发票抬头</Label>
                          <Input value={form.invoiceCompany} onChange={(event) => setForm((value) => ({ ...value, invoiceCompany: event.target.value }))} required />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                          <Label>内容</Label>
                          <Textarea className="min-h-28" value={form.content} onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))} required />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                          <ReimbursementFileUploadField
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            description="支持 PDF、PNG、JPG、WebP，最大 20MB。"
                            file={file}
                            inputId="techday-reimbursement-attachment"
                            onFileChange={setFile}
                          />
                        </div>
                        {message ? <p className="text-sm text-slate-600 md:col-span-2">{message}</p> : null}
                        <div className="flex justify-end gap-2 md:col-span-2">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                          <Button type="submit" disabled={submitting}>{submitting ? "提交中..." : "提交"}</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  {isAdmin ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!exportRows?.length}
                      onClick={() => downloadCsv("techday-reimbursements.csv", exportRows as any, reimbursementCsvHeaders)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      导出报销
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 overflow-x-auto">
              <Table className="min-w-[1040px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>项目</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>提交人</TableHead>
                    <TableHead>审核人</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead>审核时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>附件</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements?.map((item: any) => (
                    <TableRow key={item._id}>
                      <TableCell className="min-w-44">{item.projectName}<p className="text-xs text-slate-500">{item.organization}</p></TableCell>
                      <TableCell>¥{item.amount}</TableCell>
                      <TableCell className="min-w-56 max-w-xs text-sm text-slate-600">{item.content}</TableCell>
                      <TableCell>{item.submitterName || item.applicantName || "-"}</TableCell>
                      <TableCell>{item.reviewerName || "-"}</TableCell>
                      <TableCell className="min-w-32">{formatDateTime(item.submittedAt)}</TableCell>
                      <TableCell className="min-w-32">{formatDateTime(item.reviewedAt)}</TableCell>
                      <TableCell><TechDayReimbursementStatusBadge status={item.status} /></TableCell>
                      <TableCell>{item.hasAttachment ? item.attachmentFileName || "有" : "-"}</TableCell>
                      <TableCell className="min-w-52 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isAdmin ? reviewOptions.map((option) => (
                            <Button
                              key={option.status}
                              size="sm"
                              variant={item.status === option.status ? "secondary" : "outline"}
                              onClick={() => review({ ...actorArgs, id: item._id, status: option.status })}
                            >
                              {option.label}
                            </Button>
                          )) : null}
                          {isAdmin || item.status !== "approved" ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("确认删除该报销记录？")) void remove({ ...actorArgs, id: item._id })
                              }}
                            >
                              删除
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
