"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Save } from "lucide-react"
import {
  ReimbursementExpenseItems,
  type ReimbursementExpenseRow,
} from "@/components/reimbursements/reimbursement-expense-items"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/academic-exchange"
import { validateAcademicExchangeProjectTime } from "@/lib/academic-exchange-project-time"
import { useAcademicExchangeApplication, useUpdateAcademicExchangeApplication } from "@/lib/api"
import { useUnsavedChangesWarning } from "@/lib/hooks/use-unsaved-changes-warning"
import type { AcademicExchangeSupportApplication } from "@/types"

const newExpenseKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

type CorrectionForm = {
  applicantName: string
  email: string
  gender: string
  phone: string
  projectName: string
  exchangeLocation: string
  projectTime: string
  otherFunding: string
  projectPlan: string
  applicationDate: string
  applicantAffiliation: string
  totalPages: string
  bodyPages: string
}

export default function EditAcademicExchangeApplicationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const application = useAcademicExchangeApplication(params.id) as
    | AcademicExchangeSupportApplication
    | null
    | undefined
  const updateApplication = useUpdateAcademicExchangeApplication()
  const [form, setForm] = useState<CorrectionForm | null>(null)
  const [expenseRows, setExpenseRows] = useState<ReimbursementExpenseRow[]>([])
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useUnsavedChangesWarning(dirty && !saving)

  useEffect(() => {
    if (!application || form) return
    setForm({
      applicantName: application.applicantName,
      email: application.email,
      gender: application.gender || "",
      phone: application.phone || "",
      projectName: application.projectName,
      exchangeLocation: application.exchangeLocation,
      projectTime: application.projectTime,
      otherFunding: application.otherFunding,
      projectPlan: application.projectPlan,
      applicationDate: application.applicationDate,
      applicantAffiliation: application.applicantAffiliation || "",
      totalPages: application.totalPages ? String(application.totalPages) : "",
      bodyPages: application.bodyPages ? String(application.bodyPages) : "",
    })
    setExpenseRows(application.expenseItems.map((item) => ({
      key: newExpenseKey(),
      item: item.item,
      amount: String(item.amount),
      note: item.note || "",
    })))
  }, [application, form])

  const totalAmount = useMemo(
    () => expenseRows.reduce((sum, row) => {
      const amount = Number(row.amount)
      return Number.isFinite(amount) ? sum + amount : sum
    }, 0),
    [expenseRows],
  )

  const updateForm = (key: keyof CorrectionForm, value: string) => {
    setDirty(true)
    setForm((current) => current ? { ...current, [key]: value } : current)
  }

  const updateExpenseRow = (key: string, patch: Partial<ReimbursementExpenseRow>) => {
    setDirty(true)
    setExpenseRows((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!application || !form) return
    setMessage("")
    const projectTimeError = validateAcademicExchangeProjectTime(form.projectTime)
    if (projectTimeError) {
      setMessage(projectTimeError)
      return
    }
    const expenseItems = expenseRows.map((row) => ({
      item: row.item.trim(),
      amount: Number(row.amount),
      note: row.note.trim() || undefined,
    }))
    if (!expenseItems.length || expenseItems.some((item) => !item.item || !Number.isFinite(item.amount) || item.amount <= 0)) {
      setMessage("请完整填写申请金额明细，每项金额必须大于 0。")
      return
    }

    setSaving(true)
    try {
      await updateApplication({
        id: application._id,
        ...form,
        expenseItems,
        totalPages: form.totalPages ? Number(form.totalPages) : undefined,
        bodyPages: form.bodyPages ? Number(form.bodyPages) : undefined,
      })
      setDirty(false)
      router.push(`/tong-class/intranet/reimbursements/academic-exchange/${application._id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新提交失败")
    } finally {
      setSaving(false)
    }
  }

  if (application === undefined || (application && !form)) {
    return <p className="py-16 text-center text-sm text-slate-500">正在读取申请...</p>
  }

  if (!application || !form) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Button asChild variant="ghost">
          <Link href="/tong-class/intranet/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回学术交流支持
          </Link>
        </Button>
        <Card><CardContent className="pt-6 text-sm text-slate-600">未找到该申请记录。</CardContent></Card>
      </div>
    )
  }

  if (application.status !== "needs_changes") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Button asChild variant="ghost">
          <Link href={`/tong-class/intranet/reimbursements/academic-exchange/${application._id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请详情
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-slate-600">只有 Reviewer 退回为“待补充”的申请可以修改后重新提交。</CardContent>
        </Card>
      </div>
    )
  }

  const requiresPaper = application.projectCategory !== "出境访学"

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button asChild variant="ghost">
          <Link href={`/tong-class/intranet/reimbursements/academic-exchange/${application._id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请详情
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">补充学术交流支持申请</h1>
          <p className="mt-1 text-sm text-slate-600">请根据审核意见修改；提交后会重新进入待审核状态。</p>
        </div>
        {application.reviewNote ? (
          <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">审核意见</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{application.reviewNote}</p>
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={submit}>
          <Card>
            <CardHeader><CardTitle>申请人与项目</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {([
                ["applicantName", "姓名", "text"],
                ["email", "邮箱", "email"],
                ["gender", "性别", "text"],
                ["phone", "联系电话", "text"],
                ["projectName", "项目名称", "text"],
                ["exchangeLocation", "交流地点", "text"],
                ["projectTime", "项目时间", "text"],
                ["applicationDate", "申请时间", "date"],
              ] as const).map(([key, label, type]) => (
                <div className="grid gap-2" key={key}>
                  <Label htmlFor={`correction-${key}`}>{label}</Label>
                  <Input
                    id={`correction-${key}`}
                    type={type}
                    value={form[key]}
                    onChange={(event) => updateForm(key, event.target.value)}
                    required={!["gender", "phone"].includes(key)}
                  />
                </div>
              ))}
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="correction-other-funding">有无其他资助来源</Label>
                <Textarea id="correction-other-funding" value={form.otherFunding} onChange={(event) => updateForm("otherFunding", event.target.value)} required />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="correction-project-plan">项目计划</Label>
                <Textarea id="correction-project-plan" className="min-h-32" value={form.projectPlan} onChange={(event) => updateForm("projectPlan", event.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {requiresPaper ? (
            <Card>
              <CardHeader><CardTitle>论文信息</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="correction-affiliation">申请人所在单位</Label>
                  <Input id="correction-affiliation" value={form.applicantAffiliation} onChange={(event) => updateForm("applicantAffiliation", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="correction-total-pages">总页数</Label>
                  <Input id="correction-total-pages" type="number" min={1} step={1} value={form.totalPages} onChange={(event) => updateForm("totalPages", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="correction-body-pages">正文页数</Label>
                  <Input id="correction-body-pages" type="number" min={1} step={1} value={form.bodyPages} onChange={(event) => updateForm("bodyPages", event.target.value)} required />
                </div>
                <p className="self-end text-sm text-slate-600">论文关联与 PDF 保持原记录；如需更换，请联系管理员。</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>申请金额</CardTitle></CardHeader>
            <CardContent>
              <ReimbursementExpenseItems
                rows={expenseRows}
                totalLabel={formatCurrency(totalAmount)}
                onAddRow={() => {
                  setDirty(true)
                  setExpenseRows((rows) => [...rows, { key: newExpenseKey(), item: "", amount: "", note: "" }])
                }}
                onRemoveRow={(key) => {
                  setDirty(true)
                  setExpenseRows((rows) => rows.filter((row) => row.key !== key))
                }}
                onUpdateRow={updateExpenseRow}
              />
            </CardContent>
          </Card>

          {message ? (
            <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button asChild type="button" variant="outline">
              <Link href={`/tong-class/intranet/reimbursements/academic-exchange/${application._id}`}>取消</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "重新提交中..." : "重新提交审核"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
