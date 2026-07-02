"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { ReimbursementExpenseItems, type ReimbursementExpenseRow } from "@/components/reimbursements/reimbursement-expense-items"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  useAdminAcademicExchangeApplication,
  useDeleteAdminAcademicExchangeApplication,
  useUpdateAdminAcademicExchangeApplication,
} from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/academic-exchange"
import type { AcademicExchangeSupportApplication } from "@/types"

const newExpenseRow = (patch?: Partial<ReimbursementExpenseRow>): ReimbursementExpenseRow => ({
  key: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  item: "",
  amount: "",
  note: "",
  ...patch,
})

const toOptionalNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : NaN
}

const resizeTextarea = (event: FormEvent<HTMLTextAreaElement>) => {
  const target = event.currentTarget
  target.style.height = "auto"
  target.style.height = `${target.scrollHeight}px`
}

export default function AdminAcademicExchangeApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { isSuperAdmin, isLoading } = useAuth()
  const application = useAdminAcademicExchangeApplication(params.id, Boolean(isSuperAdmin)) as AcademicExchangeSupportApplication | null | undefined
  const updateApplication = useUpdateAdminAcademicExchangeApplication()
  const deleteApplication = useDeleteAdminAcademicExchangeApplication()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    applicantName: "",
    studentId: "",
    email: "",
    gender: "",
    phone: "",
    projectCategory: "",
    projectName: "",
    exchangeLocation: "",
    projectTime: "",
    otherFunding: "",
    projectPlan: "",
    applicationDate: "",
    paperTitle: "",
    paperAuthors: "",
    applicantAuthorName: "",
    applicantAuthorIndexLabel: "",
    applicantAffiliation: "",
    totalPages: "",
    bodyPages: "",
    paperPdfUrl: "",
    paperPdfSource: "",
    paperPdfFileName: "",
    paperPdfMimeType: "",
    paperPdfSize: "",
  })
  const [expenseRows, setExpenseRows] = useState<ReimbursementExpenseRow[]>([newExpenseRow()])
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!application || loadedId === application._id) return
    setLoadedId(application._id)
    setForm({
      applicantName: application.applicantName || "",
      studentId: application.studentId || "",
      email: application.email || "",
      gender: application.gender || "",
      phone: application.phone || "",
      projectCategory: application.projectCategory || "",
      projectName: application.projectName || "",
      exchangeLocation: application.exchangeLocation || "",
      projectTime: application.projectTime || "",
      otherFunding: application.otherFunding || "",
      projectPlan: application.projectPlan || "",
      applicationDate: application.applicationDate || "",
      paperTitle: application.paperTitle || "",
      paperAuthors: (application.paperAuthors || []).join("\n"),
      applicantAuthorName: application.applicantAuthorName || "",
      applicantAuthorIndexLabel: application.applicantAuthorIndexLabel || "",
      applicantAffiliation: application.applicantAffiliation || "",
      totalPages: application.totalPages ? String(application.totalPages) : "",
      bodyPages: application.bodyPages ? String(application.bodyPages) : "",
      paperPdfUrl: application.paperPdfUrl || "",
      paperPdfSource: application.paperPdfSource || "",
      paperPdfFileName: application.paperPdfFileName || "",
      paperPdfMimeType: application.paperPdfMimeType || "",
      paperPdfSize: application.paperPdfSize ? String(application.paperPdfSize) : "",
    })
    setExpenseRows(
      application.expenseItems.length
        ? application.expenseItems.map((item) => newExpenseRow({
          item: item.item,
          amount: String(item.amount),
          note: item.note || "",
        }))
        : [newExpenseRow()]
    )
  }, [application, loadedId])

  const totalAmount = useMemo(() => {
    return expenseRows.reduce((sum, row) => {
      const amount = Number(row.amount)
      return Number.isFinite(amount) ? sum + amount : sum
    }, 0)
  }, [expenseRows])

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const updateExpenseRow = (key: string, patch: Partial<ReimbursementExpenseRow>) => {
    setExpenseRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")

    const expenseItems = expenseRows
      .map((row) => ({
        item: row.item.trim(),
        amount: Number(row.amount),
        note: row.note.trim() || undefined,
      }))
      .filter((row) => row.item || row.amount || row.note)

    if (!expenseItems.length || expenseItems.some((row) => !row.item || !Number.isFinite(row.amount) || row.amount < 0)) {
      setMessage("请完整填写申请金额明细，金额需为非负数字。")
      return
    }

    const totalPages = toOptionalNumber(form.totalPages)
    const bodyPages = toOptionalNumber(form.bodyPages)
    const paperPdfSize = toOptionalNumber(form.paperPdfSize)
    if ([totalPages, bodyPages, paperPdfSize].some((value) => Number.isNaN(value))) {
      setMessage("页数和文件大小必须是数字。")
      return
    }

    setSaving(true)
    try {
      await updateApplication({
        id: params.id,
        applicantName: form.applicantName,
        studentId: form.studentId,
        email: form.email,
        gender: form.gender,
        phone: form.phone,
        projectCategory: form.projectCategory,
        projectName: form.projectName,
        exchangeLocation: form.exchangeLocation,
        projectTime: form.projectTime,
        otherFunding: form.otherFunding,
        projectPlan: form.projectPlan,
        expenseItems,
        applicationDate: form.applicationDate,
        paperTitle: form.paperTitle,
        paperAuthors: form.paperAuthors.split(/\r?\n/).map((author) => author.trim()).filter(Boolean),
        applicantAuthorName: form.applicantAuthorName,
        applicantAuthorIndexLabel: form.applicantAuthorIndexLabel,
        applicantAffiliation: form.applicantAffiliation,
        totalPages,
        bodyPages,
        paperPdfUrl: form.paperPdfUrl,
        paperPdfSource: form.paperPdfSource || undefined,
        paperPdfFileName: form.paperPdfFileName,
        paperPdfMimeType: form.paperPdfMimeType,
        paperPdfSize,
      })
      setMessage("申请记录已保存。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!application) return
    await confirm({
      title: "删除学术交流支持申请",
      description: `确定删除“${application.applicantName} - ${application.projectName}”吗？删除后无法从后台、学生历史或 Reviewer 列表查看。`,
      confirmLabel: "确定删除",
      variant: "danger",
      onConfirm: async () => {
        setDeleting(true)
        setMessage("")
        try {
          await deleteApplication(application._id)
          router.push("/admin/reimbursements/academic-exchange")
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "删除失败")
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>无权限访问</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">只有超级管理员可以查看和编辑学术交流支持申请。</CardContent>
      </Card>
    )
  }

  if (application === undefined) {
    return <p className="text-sm text-slate-500">Loading...</p>
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost">
          <Link href="/admin/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请列表
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-slate-600">未找到该申请记录。</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost">
          <Link href="/admin/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请列表
          </Link>
        </Button>
        <Button type="button" variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? "删除中..." : "删除申请"}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">编辑学术交流支持申请</h1>
        <p className="mt-1 text-sm text-slate-500">
          提交时间：{formatDate(application.submittedAt)}。超级管理员可修正已保存记录；本页不提供 PDF 下载和批量导出。
        </p>
      </div>

      {message ? <p className="rounded-md border bg-white px-4 py-3 text-sm text-slate-600">{message}</p> : null}

      <form className="space-y-6" onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>申请人信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>姓名</Label>
              <Input value={form.applicantName} onChange={(event) => updateForm("applicantName", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>学号</Label>
              <Input value={form.studentId} onChange={(event) => updateForm("studentId", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>邮箱</Label>
              <Input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>性别</Label>
              <Input value={form.gender} onChange={(event) => updateForm("gender", event.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>联系电话</Label>
              <Input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>项目信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>项目类别</Label>
              <Input value={form.projectCategory} onChange={(event) => updateForm("projectCategory", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>项目名称</Label>
              <Input value={form.projectName} onChange={(event) => updateForm("projectName", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>交流地点</Label>
              <Input value={form.exchangeLocation} onChange={(event) => updateForm("exchangeLocation", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>项目时间</Label>
              <Input value={form.projectTime} onChange={(event) => updateForm("projectTime", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>申请时间</Label>
              <Input type="date" value={form.applicationDate} onChange={(event) => updateForm("applicationDate", event.target.value)} required />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>有无其他资助来源</Label>
              <Textarea value={form.otherFunding} onInput={resizeTextarea} onChange={(event) => updateForm("otherFunding", event.target.value)} required />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>项目计划</Label>
              <Textarea className="min-h-28" value={form.projectPlan} onInput={resizeTextarea} onChange={(event) => updateForm("projectPlan", event.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关联论文快照</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-3">
              <Label>论文题目</Label>
              <Input value={form.paperTitle} onChange={(event) => updateForm("paperTitle", event.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-3">
              <Label>作者（一行一个作者；保留系统作者标记可维持导出时的作者关联）</Label>
              <Textarea className="min-h-28 font-mono text-sm" value={form.paperAuthors} onChange={(event) => updateForm("paperAuthors", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>申请人作者名</Label>
              <Input value={form.applicantAuthorName} onChange={(event) => updateForm("applicantAuthorName", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>申请人位次</Label>
              <Input value={form.applicantAuthorIndexLabel} onChange={(event) => updateForm("applicantAuthorIndexLabel", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>申请人所在单位</Label>
              <Input value={form.applicantAffiliation} onChange={(event) => updateForm("applicantAffiliation", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>总页数</Label>
              <Input type="number" min={1} step={1} value={form.totalPages} onChange={(event) => updateForm("totalPages", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>正文页数</Label>
              <Input type="number" min={1} step={1} value={form.bodyPages} onChange={(event) => updateForm("bodyPages", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>论文 PDF 来源类型</Label>
              <Select value={form.paperPdfSource || "none"} onValueChange={(value) => updateForm("paperPdfSource", value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择来源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  <SelectItem value="url">外部链接</SelectItem>
                  <SelectItem value="upload">上传文件</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-3">
              <Label>论文 PDF 链接</Label>
              <Input type="url" value={form.paperPdfUrl} onChange={(event) => updateForm("paperPdfUrl", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>上传文件名</Label>
              <Input value={form.paperPdfFileName} onChange={(event) => updateForm("paperPdfFileName", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>上传文件 MIME</Label>
              <Input value={form.paperPdfMimeType} onChange={(event) => updateForm("paperPdfMimeType", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>上传文件大小（bytes）</Label>
              <Input type="number" min={0} step={1} value={form.paperPdfSize} onChange={(event) => updateForm("paperPdfSize", event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申请金额</CardTitle>
          </CardHeader>
          <CardContent>
            <ReimbursementExpenseItems
              rows={expenseRows}
              totalLabel={formatCurrency(totalAmount)}
              onAddRow={() => setExpenseRows((rows) => [...rows, newExpenseRow()])}
              onAppendRows={(parsedRows) => setExpenseRows((rows) => [
                ...rows,
                ...parsedRows.map((row) => newExpenseRow({
                  item: row.item,
                  amount: row.amount,
                  note: row.note,
                })),
              ])}
              onRemoveRow={(key) => setExpenseRows((rows) => rows.filter((item) => item.key !== key))}
              onUpdateRow={updateExpenseRow}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button asChild type="button" variant="outline">
            <Link href="/admin/reimbursements/academic-exchange">取消</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "保存中..." : "保存修改"}
          </Button>
        </div>
      </form>
      <ConfirmDialog />
    </div>
  )
}
