"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Save } from "lucide-react"
import { ReimbursementExpenseItems, type ReimbursementExpenseRow } from "@/components/reimbursements/reimbursement-expense-items"
import { ReimbursementFileUploadField } from "@/components/reimbursements/reimbursement-file-upload-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/hooks/use-auth"
import { getTongClassStoredSessionToken, useCreateAcademicExchangeApplication, useGenerateAcademicExchangeUploadUrl, usePublications, useStudentFormProfile } from "@/lib/api"
import { formatCurrency, formatPaperAuthors, getApplicantAuthorInfo } from "@/lib/academic-exchange"
import {
  getAcademicExchangeBrandTitle,
  resolveAcademicExchangeBrand,
} from "@/lib/academic-exchange-brand"
import { validateAcademicExchangePaperPdfUpload } from "@/lib/academic-exchange-pdf-source"
import { isSafeExternalAcademicPaperPdfUrl } from "@/lib/academic-exchange-paper-url"
import { validateAcademicExchangeProjectTime } from "@/lib/academic-exchange-project-time"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import { publicationBelongsToUser } from "@/lib/publication-authors"
import { AiaOAAuthLoading, AiaOALoginRequired } from "@/components/oa/aia-oa-shared"
import type { Publication, StudentFormProfile } from "@/types"

const newExpenseRow = (): ReimbursementExpenseRow => ({
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

const projectCategoryOptions = ["出境访学", "学术会议", "其他"] as const
const ACADEMIC_EXCHANGE_DRAFT_KEY = "aia:academic-exchange:draft:v1"

function FormSection({ title, marker, children }: { title: string; marker: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between border-b aia-border-rule pb-3">
        <h2 className="aia-serif text-2xl">{title}</h2>
        <span className="aia-mono aia-text-muted text-[0.68rem] tracking-[0.16em]">{marker}</span>
      </div>
      {children}
    </section>
  )
}

export function AcademicExchangeFormClient() {
  const router = useRouter()
  const submissionIdempotencyKeyRef = useRef(
    globalThis.crypto?.randomUUID?.()
      || `academic-exchange-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
  const { currentUser, isAuthenticated, isLoading } = useAuth()
  const profile = useStudentFormProfile() as StudentFormProfile | null | undefined
  const publicationsData = usePublications({ limit: 1000 })
  const publications: Publication[] = useMemo(() => {
    return (publicationsData || []).filter((publication: Publication) => publicationBelongsToUser(publication, currentUser?._id))
  }, [currentUser?._id, publicationsData])
  const createApplication = useCreateAcademicExchangeApplication()
  const generateUploadUrl = useGenerateAcademicExchangeUploadUrl()

  const defaultName = currentUser?.chineseName || currentUser?.englishName || currentUser?.username || ""
  const defaultEmail = currentUser?.studentId ? `${currentUser.studentId}@stu.pku.edu.cn` : currentUser?.email || ""
  const pdfBrandTitle = getAcademicExchangeBrandTitle(
    resolveAcademicExchangeBrand({ ownerIdentity: currentUser }),
  )

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
  const [expenseRows, setExpenseRows] = useState<ReimbursementExpenseRow[]>([newExpenseRow()])
  const [paperPdfSource, setPaperPdfSource] = useState<"url" | "upload">("url")
  const [paperPdfFile, setPaperPdfFile] = useState<File | null>(null)
  const [paperPdfFileError, setPaperPdfFileError] = useState<string | null>(null)
  const [projectCategoryOption, setProjectCategoryOption] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [draftReady, setDraftReady] = useState(false)

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(ACADEMIC_EXCHANGE_DRAFT_KEY)
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as {
          form?: Partial<typeof form>
          expenseRows?: ReimbursementExpenseRow[]
          paperPdfSource?: "url" | "upload"
          projectCategoryOption?: string
        }
        if (draft.form && typeof draft.form === "object") {
          setForm((current) => ({ ...current, ...draft.form }))
        }
        if (Array.isArray(draft.expenseRows) && draft.expenseRows.length) {
          setExpenseRows(draft.expenseRows.map((row) => ({
            key: typeof row.key === "string" && row.key ? row.key : newExpenseRow().key,
            item: typeof row.item === "string" ? row.item : "",
            amount: typeof row.amount === "string" ? row.amount : "",
            note: typeof row.note === "string" ? row.note : "",
          })))
        }
        if (draft.paperPdfSource === "url" || draft.paperPdfSource === "upload") {
          setPaperPdfSource(draft.paperPdfSource)
        }
        if (typeof draft.projectCategoryOption === "string") {
          setProjectCategoryOption(draft.projectCategoryOption)
        }
      }
    } catch {
      window.localStorage.removeItem(ACADEMIC_EXCHANGE_DRAFT_KEY)
    } finally {
      setDraftReady(true)
    }
  }, [])

  useEffect(() => {
    if (!draftReady) return
    window.localStorage.setItem(ACADEMIC_EXCHANGE_DRAFT_KEY, JSON.stringify({
      form,
      expenseRows,
      paperPdfSource,
      projectCategoryOption,
    }))
  }, [draftReady, expenseRows, form, paperPdfSource, projectCategoryOption])

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

  const skipsPaperSection = form.projectCategory === "出境访学"
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

  const updateProjectCategoryOption = (value: string) => {
    setProjectCategoryOption(value)
    setForm((previous) => ({
      ...previous,
      projectCategory: value === "其他" ? "" : value,
    }))
  }

  const updateExpenseRow = (key: string, patch: Partial<ReimbursementExpenseRow>) => {
    setExpenseRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const updatePaperPdfFile = (file: File | null) => {
    setPaperPdfFile(file)
    setPaperPdfFileError(file ? validateAcademicExchangePaperPdfUpload({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }) : null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    let paperPdfUpload: File | null = null

    if (!form.projectCategory.trim()) {
      setMessage(projectCategoryOption === "其他" ? "请填写其他项目类别。" : "请选择项目类别。")
      return
    }
    const projectTimeError = validateAcademicExchangeProjectTime(form.projectTime)
    if (projectTimeError) {
      setMessage(projectTimeError)
      return
    }

    if (!skipsPaperSection) {
      if (!selectedPublication) {
        setMessage("请选择关联论文。")
        return
      }

      if (!applicantAuthorInfo) {
        setMessage("无法在该论文作者列表中识别申请人，请先去个人学术修正作者关联。")
        return
      }
    }

    const expenseItems = expenseRows
      .map((row) => ({
        item: row.item.trim(),
        amount: Number(row.amount),
        note: row.note.trim() || undefined,
      }))
      .filter((row) => row.item || row.amount || row.note)

    if (!expenseItems.length || expenseItems.some((row) => !row.item || !Number.isFinite(row.amount) || row.amount <= 0)) {
      setMessage("请完整填写申请金额明细，每项金额必须大于 0。")
      return
    }

    const totalPages = Number(form.totalPages)
    const bodyPages = Number(form.bodyPages)
    if (!skipsPaperSection) {
      if (!Number.isInteger(totalPages) || !Number.isInteger(bodyPages) || totalPages <= 0 || bodyPages <= 0) {
        setMessage("总页数和正文页数必须是正整数。")
        return
      }

      if (paperPdfSource === "url") {
        if (!isSafeExternalAcademicPaperPdfUrl(form.paperPdfUrl.trim())) {
          setMessage("论文 PDF 链接必须使用 https://arxiv.org 上可直接打开的 PDF 地址。")
          return
        }
      } else {
        if (!paperPdfFile) {
          setMessage("请上传论文 PDF 文件。")
          return
        }
        const uploadError = validateAcademicExchangePaperPdfUpload({
          fileName: paperPdfFile.name,
          mimeType: paperPdfFile.type || "application/octet-stream",
          size: paperPdfFile.size,
        })
        if (uploadError) {
          setPaperPdfFileError(uploadError)
          setMessage(uploadError)
          return
        }
        paperPdfUpload = paperPdfFile
      }
    }

    setSubmitting(true)
    let uploadedPaperStorageId: string | undefined
    try {
      const payload: Record<string, unknown> & { idempotencyKey: string } = {
        idempotencyKey: submissionIdempotencyKeyRef.current,
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
      }

      if (!skipsPaperSection) {
        payload.publicationId = form.publicationId
        payload.applicantAffiliation = form.applicantAffiliation
        payload.totalPages = totalPages
        payload.bodyPages = bodyPages
        if (paperPdfSource === "upload" && paperPdfUpload) {
          const uploadTarget = await generateUploadUrl({
            fileName: paperPdfUpload.name,
            mimeType: paperPdfUpload.type || "application/octet-stream",
          })
          uploadedPaperStorageId = String(await uploadFileToStorageTarget(uploadTarget as any, paperPdfUpload, "论文 PDF 上传失败"))
          payload.paperPdfStorageId = uploadedPaperStorageId
          payload.paperPdfFileName = paperPdfUpload.name
          payload.paperPdfMimeType = paperPdfUpload.type || "application/octet-stream"
          payload.paperPdfSize = paperPdfUpload.size
        } else {
          payload.paperPdfUrl = form.paperPdfUrl
        }
      }

      const id = await createApplication(payload)
      window.localStorage.removeItem(ACADEMIC_EXCHANGE_DRAFT_KEY)
      router.push(`/services/oa/reimbursements/academic-exchange/${id}`)
    } catch (error) {
      if (uploadedPaperStorageId) {
        const sessionToken = getTongClassStoredSessionToken()
        if (sessionToken) {
          await fetch("/api/academic-exchange/cleanup-upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ storageId: uploadedPaperStorageId }),
          }).catch(() => null)
        }
      }
      setMessage(error instanceof Error ? error.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <AiaOAAuthLoading />
  if (!isAuthenticated) {
    return (
      <div className="container-custom max-w-5xl py-10">
        <AiaOALoginRequired
          nextPath="/services/oa/reimbursements/academic-exchange/new"
          action="新建学术交流支持申请"
        />
      </div>
    )
  }

  return (
    <main className="aia-scope min-h-screen px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <Button asChild variant="ghost">
          <Link href="/services/oa/reimbursements/academic-exchange">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回学术交流支持
          </Link>
        </Button>

        <header className="border-b aia-border-rule pb-8">
          <p className="aia-kicker">ACADEMIC EXCHANGE · NEW APPLICATION</p>
          <h1 className="aia-serif mt-3 text-3xl font-medium md:text-4xl">新增学术交流支持申请</h1>
          <p className="aia-text-muted mt-3 max-w-3xl text-sm leading-7">填写内容会自动保存在当前浏览器；提交后可查看审核进度，待补充时可修改后重新提交。</p>
          <p className="aia-mono aia-text-muted mt-3 text-xs">
            申请表抬头：{pdfBrandTitle}
          </p>
        </header>

        {!skipsPaperSection ? (
          <div className="aia-bg-tag flex gap-3 border-y aia-border-rule px-4 py-3 text-sm text-[hsl(var(--aia-red-deep))]">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">请先在个人学术中登记论文并完成作者关联。</p>
              <p>如果系统没有找到论文，或选中论文后无法识别你在作者列表中的位置，将无法提交学术交流支持申请。</p>
            </div>
          </div>
        ) : null}

        {!skipsPaperSection && publicationsData !== undefined && publications.length === 0 ? (
          <div className="space-y-4 border-t border-b aia-border-rule py-5">
            <p className="aia-text-muted text-sm">系统没有找到可用于申请的个人学术论文。请先去个人学术完成论文登记和作者关联，否则无法报销。</p>
            <Button asChild>
              <Link href="/my-publications">前往个人学术</Link>
            </Button>
          </div>
        ) : null}

        <form className="space-y-12" onSubmit={submit}>
          <FormSection title="申请人信息" marker="APPLICANT">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="academic-applicant-name">姓名</Label>
                <Input id="academic-applicant-name" value={form.applicantName} onChange={(event) => updateForm("applicantName", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academic-applicant-account">学号 / 账号</Label>
                <Input id="academic-applicant-account" value={currentUser?.studentId || currentUser?.username || currentUser?.email || ""} readOnly />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academic-applicant-email">邮箱</Label>
                <Input id="academic-applicant-email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academic-applicant-gender">性别</Label>
                <Input id="academic-applicant-gender" value={form.gender} onChange={(event) => updateForm("gender", event.target.value)} placeholder="首次填写后将自动记住" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="academic-applicant-phone">联系电话</Label>
                <Input id="academic-applicant-phone" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="首次填写后将自动记住" />
              </div>
            </div>
          </FormSection>

          <FormSection title="项目信息" marker="PROJECT">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="academic-project-category">项目类别</Label>
                <Select value={projectCategoryOption} onValueChange={updateProjectCategoryOption} required>
                  <SelectTrigger id="academic-project-category">
                    <SelectValue placeholder="请选择项目类别" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectCategoryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projectCategoryOption === "其他" ? (
                  <Input
                    id="academic-project-category-other"
                    aria-label="其他项目类别"
                    value={form.projectCategory}
                    onChange={(event) => updateForm("projectCategory", event.target.value)}
                    placeholder="请填写其他项目类别"
                    required
                  />
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academic-project-name">项目名称</Label>
                <Input id="academic-project-name" value={form.projectName} onChange={(event) => updateForm("projectName", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academic-exchange-location">交流地点</Label>
                <Input id="academic-exchange-location" value={form.exchangeLocation} onChange={(event) => updateForm("exchangeLocation", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academic-project-time">项目时间</Label>
                <Input id="academic-project-time" value={form.projectTime} onChange={(event) => updateForm("projectTime", event.target.value)} placeholder="如 2026-08-01 至 2026-08-18" required />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="academic-other-funding">有无其他资助来源</Label>
                <Textarea id="academic-other-funding" value={form.otherFunding} onInput={resizeTextarea} onChange={(event) => updateForm("otherFunding", event.target.value)} required />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="academic-project-plan">项目计划</Label>
                <Textarea id="academic-project-plan" className="min-h-28" value={form.projectPlan} onInput={resizeTextarea} onChange={(event) => updateForm("projectPlan", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="academic-application-date">申请时间</Label>
                <Input id="academic-application-date" type="date" value={form.applicationDate} onChange={(event) => updateForm("applicationDate", event.target.value)} required />
              </div>
            </div>
          </FormSection>

          {!skipsPaperSection ? (
            <FormSection title="关联接收论文及其作者单位" marker="PUBLICATION">
              <div className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="academic-publication">选择个人学术论文</Label>
                  <p id="academic-publication-help" className="aia-text-muted text-xs">
                    这里直接读取你的个人学术记录；若列表为空，或选中后无法识别申请人，请先前往个人学术上传论文并确认作者关联。
                  </p>
                  <select
                    id="academic-publication"
                    aria-describedby="academic-publication-help"
                    className="aia-focus h-10 w-full border border-input bg-transparent px-3 text-sm"
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
                <div className="aia-bg-tag border-y aia-border-rule p-4 text-sm">
                  <p className="font-medium">{selectedPublication.title}</p>
                  <p className="mt-2 leading-7">
                    {formattedAuthors.map((author, index) => (
                      <span key={`${author.raw}-${index}`}>
                        {index > 0 ? "，" : ""}
                        <span className={author.emphasized ? "font-semibold underline underline-offset-4 decoration-primary" : ""}>{author.name}</span>
                      </span>
                    ))}
                  </p>
                  {applicantAuthorInfo ? (
                    <p className="aia-text-red mt-2">已识别申请人：{applicantAuthorInfo.name}，{applicantAuthorInfo.label}</p>
                  ) : (
                    <p className="aia-text-red mt-2">无法识别申请人在作者列表中的位置，请先去【个人学术】模块上传/修正论文，并确认作者关联到你的账号。</p>
                  )}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="academic-applicant-affiliation">申请人所在单位</Label>
                  <Input id="academic-applicant-affiliation" value={form.applicantAffiliation} onChange={(event) => updateForm("applicantAffiliation", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="academic-total-pages">总页数</Label>
                  <Input id="academic-total-pages" type="number" min={1} step={1} value={form.totalPages} onChange={(event) => updateForm("totalPages", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="academic-body-pages">正文页数</Label>
                  <Input id="academic-body-pages" type="number" min={1} step={1} value={form.bodyPages} onChange={(event) => updateForm("bodyPages", event.target.value)} required />
                </div>
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="academic-paper-source-url">论文 PDF 来源</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 border border-[hsl(var(--aia-rule))] p-3 text-sm">
                      <input
                        id="academic-paper-source-url"
                        className="mt-1"
                        type="radio"
                        name="paperPdfSource"
                        checked={paperPdfSource === "url"}
                        onChange={() => setPaperPdfSource("url")}
                      />
                      <span>
                        <span className="block font-medium">外部 PDF 链接</span>
                        <span className="aia-text-muted text-xs">适合 arXiv / Archive 已经更新且链接能直接返回 PDF 的情况。</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 border border-[hsl(var(--aia-rule))] p-3 text-sm">
                      <input
                        id="academic-paper-source-upload"
                        className="mt-1"
                        type="radio"
                        name="paperPdfSource"
                        checked={paperPdfSource === "upload"}
                        onChange={() => setPaperPdfSource("upload")}
                      />
                      <span>
                        <span className="block font-medium">上传 PDF</span>
                        <span className="aia-text-muted text-xs">适合最新版论文 PDF 尚未同步到 Archive / arXiv 的情况。</span>
                      </span>
                    </label>
                  </div>
                  {paperPdfSource === "url" ? (
                    <>
                      <Input id="academic-paper-url" aria-label="论文 PDF 链接" type="url" value={form.paperPdfUrl} onChange={(event) => updateForm("paperPdfUrl", event.target.value)} placeholder="仅支持 https://arxiv.org 上可直接打开的 PDF 地址" required />
                      <p className="aia-text-muted text-xs">请确认链接直接返回 PDF 文件，并与上方总页数、正文页数对应。</p>
                    </>
                  ) : (
                    <ReimbursementFileUploadField
                      accept="application/pdf"
                      description="仅支持 PDF，最大 30MB；导出申请表时会自动拼接到申请表后。"
                      error={paperPdfFileError}
                      file={paperPdfFile}
                      inputId="academic-exchange-paper-pdf"
                      label="上传论文 PDF"
                      onFileChange={updatePaperPdfFile}
                    />
                  )}
                </div>
              </div>
              </div>
            </FormSection>
          ) : null}

          <FormSection title="申请金额" marker="EXPENSES">
            <div className="border-t aia-border-rule pt-4">
              <ReimbursementExpenseItems
                rows={expenseRows}
                totalLabel={formatCurrency(totalAmount)}
                onAddRow={() => setExpenseRows((rows) => [...rows, newExpenseRow()])}
                onAppendRows={(parsedRows) => setExpenseRows((rows) => [
                  ...rows,
                  ...parsedRows.map((row) => ({
                    ...newExpenseRow(),
                    item: row.item,
                    amount: row.amount,
                    note: row.note,
                  })),
                ])}
                onRemoveRow={(key) => setExpenseRows((rows) => rows.filter((item) => item.key !== key))}
                onUpdateRow={updateExpenseRow}
              />
            </div>
          </FormSection>

          {message ? <p role="status" aria-live="polite" className="border-y aia-border-rule bg-[hsl(var(--aia-tag))] px-4 py-3 text-sm text-[hsl(var(--aia-red-deep))]">{message}</p> : null}

          <div className="aia-mono flex justify-end gap-3 border-t aia-border-rule pt-4">
            <Button asChild type="button" variant="outline">
              <Link href="/services/oa/reimbursements/academic-exchange">取消</Link>
            </Button>
            <Button type="submit" disabled={submitting || (!skipsPaperSection && publications.length === 0)}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? "提交中..." : "提交申请"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
