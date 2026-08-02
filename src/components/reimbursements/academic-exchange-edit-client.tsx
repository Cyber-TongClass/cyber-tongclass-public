"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeft, Save } from "lucide-react"
import {
  ReimbursementExpenseItems,
  type ReimbursementExpenseRow,
} from "@/components/reimbursements/reimbursement-expense-items"
import { AiaOAAuthLoading, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/academic-exchange"
import { validateAcademicExchangeProjectTime } from "@/lib/academic-exchange-project-time"
import { useAcademicExchangeApplication, useUpdateAcademicExchangeApplication } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
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

function EditSection({
  title,
  marker,
  children,
}: {
  title: string
  marker: string
  children: ReactNode
}) {
  return (
    <section className="border-t aia-border-rule pt-6">
      <div className="mb-5 flex items-baseline justify-between border-b aia-border-rule pb-3">
        <h2 className="aia-serif text-2xl">{title}</h2>
        <span className="aia-mono aia-text-muted text-[0.68rem] tracking-[0.16em]">{marker}</span>
      </div>
      {children}
    </section>
  )
}

export function AcademicExchangeEditClient() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
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
      router.push(`/services/oa/reimbursements/academic-exchange/${application._id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新提交失败")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <AiaOAAuthLoading />

  if (!isAuthenticated) {
    return (
      <div className="container-custom max-w-5xl py-10">
        <AiaOALoginRequired
          nextPath={`/services/oa/reimbursements/academic-exchange/${params.id}/edit`}
          action="补充学术交流支持申请"
        />
      </div>
    )
  }

  if (application === undefined || (application && !form)) {
    return <p role="status" className="aia-mono aia-text-muted py-16 text-center text-xs">正在读取申请…</p>
  }

  if (!application || !form) {
    return (
      <main className="aia-scope mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
        <Button asChild variant="ghost">
          <Link href="/services/oa/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回学术交流支持
          </Link>
        </Button>
        <p role="status" className="aia-text-muted border-y aia-border-rule py-6 text-sm">未找到该申请记录。</p>
      </main>
    )
  }

  if (application.status !== "needs_changes") {
    return (
      <main className="aia-scope mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
        <Button asChild variant="ghost">
          <Link href={`/services/oa/reimbursements/academic-exchange/${application._id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请详情
          </Link>
        </Button>
        <p role="status" className="aia-text-muted border-y aia-border-rule py-6 text-sm">
          只有审核人退回为“待补充”的申请可以修改后重新提交。
        </p>
      </main>
    )
  }

  const requiresPaper = application.projectCategory !== "出境访学"

  return (
    <main className="aia-scope min-h-screen px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <Button asChild variant="ghost">
          <Link href={`/services/oa/reimbursements/academic-exchange/${application._id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回申请详情
          </Link>
        </Button>
        <header className="border-b aia-border-rule pb-8">
          <p className="aia-kicker">ACADEMIC EXCHANGE · REVISION</p>
          <h1 className="aia-serif mt-3 text-3xl font-medium md:text-4xl">补充学术交流支持申请</h1>
          <p className="aia-text-muted mt-3 text-sm leading-7">请根据审核意见修改；提交后会重新进入待审核状态。</p>
        </header>
        {application.reviewNote ? (
          <div className="aia-bg-tag border-y aia-border-rule px-4 py-3 text-sm">
            <p className="aia-mono text-xs font-medium text-[hsl(var(--aia-red))]">审核意见</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{application.reviewNote}</p>
          </div>
        ) : null}

        <form className="space-y-10" onSubmit={submit}>
          <EditSection title="申请人与项目" marker="APPLICATION">
            <div className="grid gap-5 md:grid-cols-2">
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
            </div>
          </EditSection>

          {requiresPaper ? (
            <EditSection title="论文信息" marker="PUBLICATION">
              <div className="grid gap-5 md:grid-cols-3">
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
                <p className="aia-text-muted self-end text-sm">论文关联与 PDF 保持原记录；如需更换，请联系管理员。</p>
              </div>
            </EditSection>
          ) : null}

          <EditSection title="申请金额" marker="EXPENSES">
            <div className="border-t aia-border-rule pt-4">
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
            </div>
          </EditSection>

          {message ? (
            <p role="status" aria-live="polite" className="aia-bg-tag border-y aia-border-rule px-4 py-3 text-sm text-[hsl(var(--aia-red-deep))]">{message}</p>
          ) : null}
          <div className="aia-mono flex flex-wrap justify-end gap-3 border-t aia-border-rule pt-4">
            <Button asChild type="button" variant="outline">
              <Link href={`/services/oa/reimbursements/academic-exchange/${application._id}`}>取消</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "重新提交中..." : "重新提交审核"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
