"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ExternalLink,
  FileCheck2,
  FileText,
  Github,
  Lock,
  Save,
  Send,
  Sparkles,
} from "lucide-react"
import { ReimbursementFileUploadField } from "@/components/reimbursements/reimbursement-file-upload-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCC2026List, useCC2026Set } from "@/lib/api"
import {
  formatCreativeChallengeMembers,
  challengeStageDetails,
  createDefaultCreativeChallengeSettings,
  getCCSessionToken,
  statusBadgeVariants,
  type CreativeChallengeSettings,
  type CreativeChallengeRegistration,
} from "@/lib/creative-challenge-2026"

type ProjectMaterialDraft = {
  projectSummary: string
  githubUrl: string
  demoUrl: string
}

const emptyMaterialDraft: ProjectMaterialDraft = {
  projectSummary: "",
  githubUrl: "",
  demoUrl: "",
}

const MAX_COMPUTE_REPORT_PDF_BYTES = 30 * 1024 * 1024
const COMPUTE_REPORT_PDF_MIME_TYPES = new Set(["application/pdf", "application/octet-stream", ""])

function compactDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatFileSize(size?: number) {
  if (!Number.isFinite(size) || !size || size <= 0) return "0 B"
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function autoResizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto"
  element.style.height = `${element.scrollHeight}px`
}

function validateComputeReportPdf(file: File | null) {
  if (!file) return null
  const mimeType = file.type || ""
  const fileName = file.name.toLowerCase()

  if (!fileName.endsWith(".pdf") || !COMPUTE_REPORT_PDF_MIME_TYPES.has(mimeType)) {
    return "算力使用说明仅支持 PDF 文件。"
  }
  if (file.size <= 0) {
    return "PDF 文件不能为空。"
  }
  if (file.size > MAX_COMPUTE_REPORT_PDF_BYTES) {
    return "PDF 文件不能超过 30MB。"
  }
  return null
}

function getComputeReportPatch(file: File) {
  return {
    computeReportFileName: file.name,
    computeReportMimeType: file.type || "application/pdf",
    computeReportSize: file.size,
    computeReportUpdatedAt: Date.now(),
  }
}

export default function CreativeChallengeProjectsPage() {
  const searchParams = useSearchParams()
  const requestedProjectId = searchParams.get("project")
  const summaryRef = useRef<HTMLTextAreaElement | null>(null)
  const setCC2026Mutation = useCC2026Set()
  const cc2026Settings = useCC2026List("settings")
  const cc2026Registrations = useCC2026List("registration")
  const [registrations, setRegistrations] = useState<CreativeChallengeRegistration[]>([])
  const [settings, setSettings] = useState<CreativeChallengeSettings>(() => createDefaultCreativeChallengeSettings())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProjectMaterialDraft>(emptyMaterialDraft)
  const [computeReportFile, setComputeReportFile] = useState<File | null>(null)
  const [computeReportFileError, setComputeReportFileError] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  const selectedRegistration = useMemo(
    () => registrations.find((item) => item.id === selectedId) || null,
    [registrations, selectedId]
  )
  const canEdit = settings.stage === "registration"
  const stageDetails = challengeStageDetails[settings.stage]

  useEffect(() => {
    const raw = (cc2026Settings || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setSettings(JSON.parse(raw.value)) } catch { setSettings(createDefaultCreativeChallengeSettings()) }
    }
  }, [cc2026Settings])

  useEffect(() => {
    const doc = (cc2026Registrations || []).find((d: any) => d.key === "_")
    const records = doc ? (() => { try { return JSON.parse(doc.value) } catch { return [] } })() : []
    setRegistrations(records)

    const requestedRecord = requestedProjectId
      ? records.find((item: any) => item.id === requestedProjectId)
      : null
    const fallbackRecord = records.find((item: any) => !item.finalSubmittedAt) || records[0] || null
    const nextSelected = requestedRecord || fallbackRecord
    setSelectedId(nextSelected?.id || null)
    setDraft(nextSelected ? {
      projectSummary: nextSelected.projectSummary,
      githubUrl: nextSelected.githubUrl,
      demoUrl: nextSelected.demoUrl,
    } : emptyMaterialDraft)
    setComputeReportFile(null)
    setComputeReportFileError(null)
  }, [cc2026Registrations, requestedProjectId])

  useEffect(() => {
    if (summaryRef.current) {
      autoResizeTextarea(summaryRef.current)
    }
  }, [draft.projectSummary, selectedId])

  function selectRegistration(registration: CreativeChallengeRegistration) {
    setSelectedId(registration.id)
    setDraft({
      projectSummary: registration.projectSummary,
      githubUrl: registration.githubUrl,
      demoUrl: registration.demoUrl,
    })
    setComputeReportFile(null)
    setComputeReportFileError(null)
    setMessage("")
  }

  function updateDraft<K extends keyof ProjectMaterialDraft>(key: K, value: ProjectMaterialDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function persist(nextRegistrations: CreativeChallengeRegistration[]) {
    setRegistrations(nextRegistrations)
    const st = getCCSessionToken()
    setCC2026Mutation({
      collection: "registration",
      key: "_",
      value: JSON.stringify(nextRegistrations),
      sessionToken: st || undefined,
    })
  }

  function updateComputeReportFile(file: File | null) {
    setComputeReportFile(file)
    setComputeReportFileError(validateComputeReportPdf(file))
  }

  function saveMaterials() {
    if (!selectedRegistration) return
    if (!canEdit) {
      setMessage("报名和最终提交已截止，当前阶段不能再修改项目材料。")
      return
    }
    if (selectedRegistration.finalSubmittedAt) {
      setMessage("该项目已最终提交，不能再修改材料。")
      return
    }
    if (computeReportFileError) {
      setMessage(computeReportFileError)
      return
    }

    const now = Date.now()
    const nextRegistrations = registrations.map((item) =>
      item.id === selectedRegistration.id
        ? {
            ...item,
            projectSummary: draft.projectSummary,
            githubUrl: draft.githubUrl,
            demoUrl: draft.demoUrl,
            ...(computeReportFile ? getComputeReportPatch(computeReportFile) : {}),
            updatedAt: now,
          }
        : item
    )
    persist(nextRegistrations)
    setComputeReportFile(null)
    setMessage("项目材料已保存。")
  }

  function finalSubmit() {
    if (!selectedRegistration) return
    if (!canEdit) {
      setMessage("报名和最终提交已截止，当前阶段不能再最终提交。")
      return
    }
    if (selectedRegistration.finalSubmittedAt) {
      setMessage("该项目已经最终提交。")
      return
    }

    const summary = draft.projectSummary.trim()
    const githubUrl = draft.githubUrl.trim()
    if (!summary || !githubUrl) {
      setMessage("最终提交前，请填写作品简介和 GitHub 公开仓库链接。")
      return
    }
    if (computeReportFileError) {
      setMessage(computeReportFileError)
      return
    }
    if (selectedRegistration.wantsCompute && !selectedRegistration.computeReportFileName && !computeReportFile) {
      setMessage("你申请了算力支持，请上传算力使用说明 PDF 后再最终提交。")
      return
    }

    if (!window.confirm("确认最终提交吗？提交后将不能再修改报名信息和项目材料。")) return

    const now = Date.now()
    const nextRegistrations = registrations.map((item) =>
      item.id === selectedRegistration.id
        ? {
            ...item,
            projectSummary: draft.projectSummary,
            githubUrl: draft.githubUrl,
            demoUrl: draft.demoUrl,
            ...(computeReportFile ? getComputeReportPatch(computeReportFile) : {}),
            finalSubmittedAt: now,
            updatedAt: now,
          }
        : item
    )
    persist(nextRegistrations)
    setComputeReportFile(null)
    setMessage("项目已最终提交。")
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/intranet/creative-challenge-2026"
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回挑战赛
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="mb-3 rounded-md border-blue-200 bg-blue-50 text-blue-800">
                {stageDetails.label}
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                项目材料与最终提交
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {canEdit
                  ? "报名后可随时补充或修改作品简介、GitHub 公开仓库和 Demo。确认最终提交后，报名信息和项目材料将锁定。"
                  : "报名和最终提交已截止，本页仅可查看已保存的项目材料。"}
              </p>
            </div>
            {canEdit ? (
            <Button asChild>
              <Link href="/intranet/creative-challenge-2026#registration">
                <Sparkles className="mr-2 h-4 w-4" />
                新项目报名
              </Link>
            </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">已有项目</CardTitle>
          </CardHeader>
          <CardContent>
            {registrations.length > 0 ? (
              <div className="space-y-3">
                {registrations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectRegistration(item)}
                    className={`block w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedId === item.id
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 bg-white hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-950">{item.projectName}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{item.teamName}</div>
                      </div>
                      <Badge variant={item.finalSubmittedAt ? "success" : statusBadgeVariants[item.status]} className="rounded-md">
                        {item.finalSubmittedAt ? "已提交" : "可编辑"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      报名：{compactDate(item.createdAt)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <FileCheck2 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">暂无报名记录。</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/intranet/creative-challenge-2026#registration">先去报名</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileCheck2 className="h-5 w-5 text-primary" />
              项目材料
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRegistration ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={selectedRegistration.track === "custom" ? "success" : "warning"} className="rounded-md">
                      {selectedRegistration.track === "custom" ? "自定义开发" : "悬赏任务"}
                    </Badge>
                    {selectedRegistration.finalSubmittedAt ? (
                      <Badge variant="success" className="rounded-md">
                        <Lock className="mr-1 h-3.5 w-3.5" />
                        已最终提交
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-md">尚未最终提交</Badge>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold text-slate-950">{selectedRegistration.projectName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedRegistration.teamName}</p>
                  <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    <div className="mb-1 font-semibold text-slate-700">核心成员</div>
                    <div className="whitespace-pre-wrap">{formatCreativeChallengeMembers(selectedRegistration.members) || "未填写"}</div>
                  </div>
                  <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    <div className="mb-1 font-semibold text-slate-700">2026 级新生参与</div>
                    <div className="whitespace-pre-wrap">{selectedRegistration.freshmen.trim() || "未填写"}</div>
                  </div>
                </div>

                <fieldset disabled={Boolean(selectedRegistration.finalSubmittedAt) || !canEdit} className="space-y-4 disabled:opacity-70">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">作品简介</span>
                    <Textarea
                      ref={summaryRef}
                      value={draft.projectSummary}
                      onChange={(event) => {
                        updateDraft("projectSummary", event.target.value)
                        autoResizeTextarea(event.currentTarget)
                      }}
                      onInput={(event) => autoResizeTextarea(event.currentTarget)}
                      placeholder="简要说明项目背景、设计思路、目标用户、技术路线、应用场景和实际价值等内容（更详细内容请于 README 文档中阐明）。"
                      className="min-h-[140px] resize-none overflow-hidden"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">GitHub 链接（请设置为公开仓库）</span>
                    <Input value={draft.githubUrl} onChange={(event) => updateDraft("githubUrl", event.target.value)} placeholder="https://github.com/..." />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">Demo 链接</span>
                    <Input value={draft.demoUrl} onChange={(event) => updateDraft("demoUrl", event.target.value)} placeholder="视频 / 在线演示" />
                  </label>

                  {selectedRegistration.wantsCompute ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <ReimbursementFileUploadField
                        accept="application/pdf,.pdf"
                        description="仅支持 PDF，最大 30MB；请上传算力使用情况、主要用途及与项目开发对应关系的说明。"
                        error={computeReportFileError}
                        file={computeReportFile}
                        inputId="creative-challenge-compute-report"
                        label="上传算力使用说明 PDF"
                        onFileChange={updateComputeReportFile}
                      />
                      {selectedRegistration.computeReportFileName ? (
                        <div className="mt-3 flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-600">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>
                            已保存：{selectedRegistration.computeReportFileName}
                            {selectedRegistration.computeReportSize ? ` · ${formatFileSize(selectedRegistration.computeReportSize)}` : ""}
                            {selectedRegistration.computeReportUpdatedAt ? ` · ${compactDate(selectedRegistration.computeReportUpdatedAt)}` : ""}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                      该项目未申请算力支持，无需上传算力使用说明。
                    </div>
                  )}
                </fieldset>

                {message ? (
                  <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">{message}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {!selectedRegistration.finalSubmittedAt && canEdit ? (
                    <>
                      <Button type="button" onClick={saveMaterials}>
                        <Save className="mr-2 h-4 w-4" />
                        保存材料
                      </Button>
                      <Button type="button" variant="outline" onClick={finalSubmit}>
                        <Send className="mr-2 h-4 w-4" />
                        最终提交
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {selectedRegistration.finalSubmittedAt ? "该项目已锁定，不能再修改。" : "当前阶段不能再修改或提交。"}
                    </p>
                  )}
                  {selectedRegistration.githubUrl ? (
                    <Button asChild type="button" variant="outline">
                      <a href={selectedRegistration.githubUrl} target="_blank" rel="noreferrer">
                        <Github className="mr-2 h-4 w-4" />
                        GitHub
                      </a>
                    </Button>
                  ) : null}
                  {selectedRegistration.demoUrl ? (
                    <Button asChild type="button" variant="outline">
                      <a href={selectedRegistration.demoUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Demo
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-500">请选择一个项目。</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
