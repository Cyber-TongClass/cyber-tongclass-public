"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/hooks/use-auth"
import { useCreateAcademicExchangeApplication, usePublications, useStudentFormProfile } from "@/lib/api"
import { formatCurrency, formatPaperAuthors, getApplicantAuthorInfo } from "@/lib/academic-exchange"
import { publicationBelongsToUser } from "@/lib/publication-authors"
import type { Publication, StudentFormProfile } from "@/types"

type ExpenseRow = {
  key: string
  item: string
  amount: string
  note: string
}

const newExpenseRow = (): ExpenseRow => ({
  key: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  item: "",
  amount: "",
  note: "",
})

const todayDateInput = () => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

const resizeTextarea = (event: FormEvent<HTMLTextAreaElement>) => {
  const target = event.currentTarget
  target.style.height = "auto"
  target.style.height = `${target.scrollHeight}px`
}

export default function NewAcademicExchangeApplicationPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const profile = useStudentFormProfile() as StudentFormProfile | null | undefined
  const publicationsData = usePublications({ limit: 1000 })
  const publications: Publication[] = useMemo(() => {
    return (publicationsData || []).filter((publication: Publication) => publicationBelongsToUser(publication, currentUser?._id))
  }, [currentUser?._id, publicationsData])
  const createApplication = useCreateAcademicExchangeApplication()

  const defaultName = currentUser?.chineseName || currentUser?.englishName || currentUser?.username || ""
  const defaultEmail = currentUser?.studentId ? `${currentUser.studentId}@stu.pku.edu.cn` : currentUser?.email || ""

  const [form, setForm] = useState({
    applicantName: "",
    email: "",
    gender: "",
    phone: "",
    projectCategory: "",
    projectName: "",
    exchangeLocation: "",
    projectTime: "",
    otherFunding: "",
    projectPlan: "",
    applicationDate: todayDateInput(),
    publicationId: "",
    applicantAffiliation: "",
    totalPages: "",
    bodyPages: "",
    paperPdfUrl: "",
  })
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([newExpenseRow()])
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      applicantName: previous.applicantName || defaultName,
      email: previous.email || defaultEmail,
      gender: previous.gender || profile?.gender || "",
      phone: previous.phone || profile?.phone || "",
    }))
  }, [defaultEmail, defaultName, profile?.gender, profile?.phone])

  const selectedPublication = useMemo(() => {
    return publications.find((publication) => String(publication._id) === form.publicationId) || null
  }, [form.publicationId, publications])

  const applicantAuthorInfo = selectedPublication ? getApplicantAuthorInfo(selectedPublication, currentUser?._id) : null
  const formattedAuthors = selectedPublication ? formatPaperAuthors(selectedPublication.authors, applicantAuthorInfo?.name) : []

  const totalAmount = useMemo(() => {
    return expenseRows.reduce((sum, row) => {
      const amount = Number(row.amount)
      return Number.isFinite(amount) ? sum + amount : sum
    }, 0)
  }, [expenseRows])

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const updateExpenseRow = (key: string, patch: Partial<ExpenseRow>) => {
    setExpenseRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")

    if (!selectedPublication) {
      setMessage("请选择关联论文。")
      return
    }

    if (!applicantAuthorInfo) {
      setMessage("无法在该论文作者列表中识别申请人，请先去个人学术修正作者关联。")
      return
    }

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

    const totalPages = Number(form.totalPages)
    const bodyPages = Number(form.bodyPages)
    if (!Number.isInteger(totalPages) || !Number.isInteger(bodyPages) || totalPages <= 0 || bodyPages <= 0) {
      setMessage("总页数和正文页数必须是正整数。")
      return
    }

    if (!/^https?:\/\//i.test(form.paperPdfUrl.trim())) {
      setMessage("论文 arXiv PDF 链接必须是点开即 PDF 的 http(s) 链接。")
      return
    }

    setSubmitting(true)
    try {
      const id = await createApplication({
        applicantName: form.applicantName,
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
        publicationId: form.publicationId,
        applicantAffiliation: form.applicantAffiliation,
        totalPages,
        bodyPages,
        paperPdfUrl: form.paperPdfUrl,
      })
      router.push(`/intranet/reimbursements/academic-exchange/${id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button asChild variant="ghost">
          <Link href="/intranet/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回学术交流支持
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">新增学术交流支持申请</h1>
          <p className="mt-1 text-sm text-slate-500">提交后申请将进入历史记录，不能再编辑。</p>
        </div>

        <div className="flex gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">请先在个人学术中登记论文并完成作者关联。</p>
            <p>如果系统没有找到论文，或选中论文后无法识别你在作者列表中的位置，将无法提交学术交流支持申请。</p>
          </div>
        </div>

        {publicationsData !== undefined && publications.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-slate-600">系统没有找到可用于申请的个人学术论文。请先去个人学术完成论文登记和作者关联，否则无法报销。</p>
              <Button asChild>
                <Link href="/my-publications">前往个人学术</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <form className="space-y-6" onSubmit={submit}>
          <Card>
            <CardHeader>
              <CardTitle>申请人信息</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>姓名</Label>
                <Input value={form.applicantName} onChange={(event) => updateForm("applicantName", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>学号</Label>
                <Input value={currentUser?.studentId || ""} readOnly />
              </div>
              <div className="grid gap-2">
                <Label>邮箱</Label>
                <Input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>性别</Label>
                <Input value={form.gender} onChange={(event) => updateForm("gender", event.target.value)} placeholder="首次填写后将自动记住" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>联系电话</Label>
                <Input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="首次填写后将自动记住" />
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
                <Input value={form.projectTime} onChange={(event) => updateForm("projectTime", event.target.value)} placeholder="如 2026.08.01-2026.08.18" required />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>有无其他资助来源</Label>
                <Textarea value={form.otherFunding} onInput={resizeTextarea} onChange={(event) => updateForm("otherFunding", event.target.value)} required />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>项目计划</Label>
                <Textarea className="min-h-28" value={form.projectPlan} onInput={resizeTextarea} onChange={(event) => updateForm("projectPlan", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>申请时间</Label>
                <Input type="date" value={form.applicationDate} onChange={(event) => updateForm("applicationDate", event.target.value)} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>关联接收论文及其作者单位</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>选择个人学术论文</Label>
                <p className="text-xs text-slate-500">
                  这里直接读取你的个人学术记录；若列表为空，或选中后无法识别申请人，请先前往个人学术上传论文并确认作者关联。
                </p>
                <select
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.publicationId}
                  onChange={(event) => updateForm("publicationId", event.target.value)}
                  required
                  disabled={publications.length === 0}
                >
                  <option value="">请选择论文</option>
                  {publications.map((publication) => (
                    <option key={publication._id} value={publication._id}>
                      {publication.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPublication ? (
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{selectedPublication.title}</p>
                  <p className="mt-2 leading-7">
                    {formattedAuthors.map((author, index) => (
                      <span key={`${author.raw}-${index}`}>
                        {index > 0 ? "，" : ""}
                        <span className={author.emphasized ? "font-semibold underline underline-offset-4 decoration-primary" : ""}>{author.name}</span>
                      </span>
                    ))}
                  </p>
                  {applicantAuthorInfo ? (
                    <p className="mt-2 text-primary">已识别申请人：{applicantAuthorInfo.name}，{applicantAuthorInfo.label}</p>
                  ) : (
                    <p className="mt-2 text-red-600">无法识别申请人在作者列表中的位置，请先去【个人学术】模块上传/修正论文，并确认作者关联到你的账号。</p>
                  )}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-3">
                  <Label>申请人所在单位</Label>
                  <Input value={form.applicantAffiliation} onChange={(event) => updateForm("applicantAffiliation", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>总页数</Label>
                  <Input type="number" min={1} step={1} value={form.totalPages} onChange={(event) => updateForm("totalPages", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>正文页数</Label>
                  <Input type="number" min={1} step={1} value={form.bodyPages} onChange={(event) => updateForm("bodyPages", event.target.value)} required />
                </div>
                <div className="grid gap-2 md:col-span-3">
                  <Label>论文 arXiv PDF 链接</Label>
                  <Input type="url" value={form.paperPdfUrl} onChange={(event) => updateForm("paperPdfUrl", event.target.value)} placeholder="必须是点开就是 PDF 的链接（例：https://arxiv.org/pdf/......），否则后续无法拼接" required />
                  <p className="text-xs text-slate-500">请确认链接直接返回 PDF 文件，并与上方总页数、正文页数对应。</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>申请金额</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>开支项目</TableHead>
                    <TableHead>预计金额（人民币元）</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Input value={row.item} onChange={(event) => updateExpenseRow(row.key, { item: event.target.value })} required />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} step="0.01" value={row.amount} onChange={(event) => updateExpenseRow(row.key, { amount: event.target.value })} required />
                      </TableCell>
                      <TableCell>
                        <Input value={row.note} onChange={(event) => updateExpenseRow(row.key, { note: event.target.value })} />
                      </TableCell>
                      <TableCell>
                        {expenseRows.length > 1 ? (
                          <Button type="button" variant="ghost" size="icon" onClick={() => setExpenseRows((rows) => rows.filter((item) => item.key !== row.key))}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setExpenseRows((rows) => [...rows, newExpenseRow()])}>
                  <Plus className="mr-2 h-4 w-4" />
                  增加一行
                </Button>
                <p className="text-lg font-semibold text-slate-900">总计：{formatCurrency(totalAmount)}</p>
              </div>
            </CardContent>
          </Card>

          {message ? <p className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

          <div className="flex justify-end gap-3">
            <Button asChild type="button" variant="outline">
              <Link href="/intranet/reimbursements/academic-exchange">取消</Link>
            </Button>
            <Button type="submit" disabled={submitting || publications.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? "提交中..." : "提交申请"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
