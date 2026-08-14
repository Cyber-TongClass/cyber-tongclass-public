"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { Award, FileCheck2, Loader2, Plus, Send, Trash2, Upload } from "lucide-react"

import {
  useGenerateTeacherRecognitionProofUploadUrl,
  useMyTeacherRecognitions,
  useRemoveTeacherRecognitionDraft,
  useSaveTeacherRecognitionDraft,
  useSubmitTeacherRecognitionDraft,
  useTeacherRecognitionAccess,
  useTeacherRecognitionCategories,
  useUpdateTeacherRecognitionNeedsChanges,
} from "@/lib/api"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import { getTeacherRecognitionStatusLabel } from "@/lib/teacher-recognition"
import { useAuth } from "@/lib/hooks/use-auth"

type Proof = { storageId: string; fileName: string; mimeType: string; size: number }
type DraftForm = {
  reportingYear: number; categoryId: string; name: string; organization: string
  startDate: string; endDate: string; explanation: string; proof: Proof[]
}

const currentYear = new Date().getFullYear()
const emptyForm: DraftForm = {
  reportingYear: currentYear, categoryId: "", name: "", organization: "",
  startDate: "", endDate: "", explanation: "", proof: [],
}

function Status({ value }: { value: string }) {
  return <span className="aia-mono border aia-border-rule px-2 py-1 text-[11px] aia-text-muted">{getTeacherRecognitionStatusLabel(value)}</span>
}

export function TeacherRecognitionWorkspace() {
  const { isAuthenticated, isLoading } = useAuth()
  const access = useTeacherRecognitionAccess() as { isTeacher: boolean; canReview: boolean; canManage: boolean } | undefined
  const categories = useTeacherRecognitionCategories() as Array<{ id: string; label: string }> | undefined
  const rows = useMyTeacherRecognitions(access?.isTeacher === true) as any[] | undefined
  const saveDraft = useSaveTeacherRecognitionDraft()
  const removeDraft = useRemoveTeacherRecognitionDraft()
  const submitDraft = useSubmitTeacherRecognitionDraft()
  const generateUpload = useGenerateTeacherRecognitionProofUploadUrl()
  const [form, setForm] = useState(emptyForm)
  const updateNeedsChanges = useUpdateTeacherRecognitionNeedsChanges()
  const [editing, setEditing] = useState<{ id?: string; version?: number; submissionId?: string; workflowVersion?: number }>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const selectedCategory = useMemo(
    () => categories?.find((item) => item.id === form.categoryId),
    [categories, form.categoryId],
  )

  if (isLoading || (isAuthenticated && access === undefined)) return <p className="aia-text-muted py-8 text-sm">正在确认申报资格…</p>
  if (!isAuthenticated) return <p className="border-y aia-border-rule py-8 text-sm">请先登录后申报教师奖励。</p>
  if (!access?.isTeacher) return <p role="alert" className="border-y aia-border-rule py-8 text-sm">教师奖励申报仅对教师账户开放。</p>

  const value = () => ({
    reportingYear: form.reportingYear,
    categoryId: form.categoryId,
    name: form.name,
    organization: form.organization,
    startDate: form.startDate,
    ...(form.endDate ? { endDate: form.endDate } : {}),
    ...(form.explanation ? { explanation: form.explanation } : {}),
    proof: form.proof,
  })

  async function persist() {
    if (!form.categoryId || !form.name.trim() || !form.organization.trim() || !form.startDate) throw new Error("请填写全部必填项")
    const result = await saveDraft({
      ...(editing.id ? { draftId: editing.id, expectedVersion: editing.version } : {}),
      value: value(),
    }) as any
    setEditing({ id: String(result.draftId), version: result.version })
    return result
  }

  async function onSave(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("")
    if (editing.submissionId) { setMessage("补充材料后请点击“重新提交审核”。"); setBusy(false); return }
    try { await persist(); setMessage("草稿已保存。") }
    catch (error) { setMessage(error instanceof Error ? error.message : "保存失败") }
    finally { setBusy(false) }
  }

  async function onSubmit() {
    setBusy(true); setMessage("")
    try {
      if (!form.proof.length) throw new Error("请至少上传一份证明材料")
      if (editing.submissionId) {
        await updateNeedsChanges({ submissionId: editing.submissionId, expectedVersion: editing.workflowVersion, value: value() })
      } else {
        const result = await persist()
        await submitDraft({ draftId: result.draftId, expectedVersion: result.version, idempotencyKey: crypto.randomUUID() })
      }
      setForm(emptyForm); setEditing({}); setMessage("申报已提交审核。")
    } catch (error) { setMessage(error instanceof Error ? error.message : "提交失败") }
    finally { setBusy(false) }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    if (form.proof.length + files.length > 5) { setMessage("证明材料最多上传 5 个文件"); return }
    setBusy(true); setMessage("")
    try {
      const uploaded: Proof[] = []
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} 超过 20MB`)
        const target = await generateUpload({ fileName: file.name, mimeType: file.type || "application/octet-stream" })
        const storageId = await uploadFileToStorageTarget(target as any, file, `${file.name} 上传失败`)
        uploaded.push({ storageId, fileName: file.name, mimeType: file.type, size: file.size })
      }
      setForm((current) => ({ ...current, proof: [...current.proof, ...uploaded] }))
    } catch (error) { setMessage(error instanceof Error ? error.message : "上传失败") }
    finally { setBusy(false) }
  }

  function edit(row: any) {
    if (row.recordType !== "draft" && row.reviewStatus !== "needs_changes") return
    setEditing(row.recordType === "draft"
      ? { id: row.id, version: row.version }
      : { submissionId: row.id, workflowVersion: row.workflowVersion })
    setForm({
      reportingYear: row.reportingYear, categoryId: row.categoryId, name: row.name,
      organization: row.organization, startDate: row.startDate, endDate: row.endDate || "",
      explanation: row.explanation || "", proof: row.proof || [],
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.75fr)]">
      <form onSubmit={onSave} className="space-y-6">
        <div className="border-b aia-border-rule pb-4">
          <p className="aia-kicker">Teacher · Recognition</p>
          <h2 className="aia-serif mt-2 text-2xl font-semibold">{editing.submissionId ? "补充申报材料" : editing.id ? "编辑申报草稿" : "新建申报"}</h2>
          <p className="aia-text-muted mt-2 text-sm">奖励、荣誉、审稿人、领域主席等专业服务均可申报；证明材料仅审核人可见。</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm">申报年度 *<input type="number" value={form.reportingYear} onChange={(e) => setForm({ ...form, reportingYear: Number(e.target.value) })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2" /></label>
          <label className="text-sm">类别 *<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2"><option value="">请选择</option>{categories?.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="text-sm sm:col-span-2">荣誉、职务或专业服务 *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2" placeholder="例如：ACL Area Chair" /></label>
          <label className="text-sm sm:col-span-2">授予或任职机构 *<input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2" /></label>
          <label className="text-sm">开始日期 *<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2" /></label>
          <label className="text-sm">结束日期<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">说明（可选）<textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={4} className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2" /></label>
        </div>
        <div className="border-y aia-border-rule py-5">
          <label className="aia-focus inline-flex min-h-11 cursor-pointer items-center gap-2 border border-[hsl(var(--aia-red))] px-4 text-sm font-medium text-[hsl(var(--aia-red))]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 上传证明材料 *
            <input className="sr-only" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => upload(e.target.files)} />
          </label>
          <p className="aia-text-muted mt-2 text-xs">PDF、图片或 Word；最多 5 份，每份不超过 20MB。</p>
          <ul className="mt-3 space-y-2">{form.proof.map((file, index) => <li key={file.storageId} className="flex items-center gap-2 text-sm"><FileCheck2 className="h-4 w-4 text-[hsl(var(--aia-red))]" /><span className="min-w-0 flex-1 truncate">{file.fileName}</span><button type="button" aria-label={`移除 ${file.fileName}`} onClick={() => setForm({ ...form, proof: form.proof.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></button></li>)}</ul>
        </div>
        {message ? <p role="status" className="text-sm text-[hsl(var(--aia-red))]">{message}</p> : null}
        <div className="flex flex-wrap gap-3">
          {!editing.submissionId ? <button disabled={busy} type="submit" className="aia-focus min-h-11 border aia-border-rule px-4 text-sm">保存草稿</button> : null}
          <button disabled={busy} type="button" onClick={onSubmit} className="aia-focus inline-flex min-h-11 items-center gap-2 bg-[hsl(var(--aia-red))] px-4 text-sm font-medium text-white"><Send className="h-4 w-4" />{editing.submissionId ? "重新提交审核" : "提交审核"}</button>
          {(editing.id || editing.submissionId) ? <button type="button" onClick={() => { setForm(emptyForm); setEditing({}) }} className="aia-focus min-h-11 px-3 text-sm aia-text-muted">取消编辑</button> : null}
        </div>
        <span className="sr-only">当前类别：{selectedCategory?.label || "未选择"}</span>
      </form>

      <aside>
        <div className="flex items-end justify-between border-b aia-border-rule pb-3"><div><p className="aia-kicker">History</p><h2 className="aia-serif mt-1 text-xl font-semibold">我的申报</h2></div><Award className="h-5 w-5 text-[hsl(var(--aia-red))]" /></div>
        {rows === undefined ? <p className="aia-text-muted py-6 text-sm">正在读取…</p> : rows.length === 0 ? <p className="aia-text-muted py-6 text-sm">还没有申报记录。</p> : <ul className="divide-y divide-[hsl(var(--aia-rule))]">{rows.map((row) => <li key={`${row.recordType}-${row.id}`} className="py-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="font-medium">{row.name}</p><p className="aia-text-muted mt-1 text-xs">{row.reportingYear} · {row.categoryLabel} · {row.organization}</p></div><Status value={row.recordType === "draft" ? "draft" : row.reviewStatus} /></div><div className="mt-3 flex gap-4">{row.recordType === "draft" ? <><button type="button" onClick={() => edit(row)} className="aia-link text-xs">继续编辑</button><button type="button" onClick={() => removeDraft({ draftId: row.id, expectedVersion: row.version })} className="text-xs text-[hsl(var(--aia-red))]">删除</button></> : <>{row.reviewStatus === "needs_changes" ? <button type="button" onClick={() => edit(row)} className="aia-link text-xs">补充材料</button> : null}<Link className="aia-link text-xs" href={`/services/teacher-recognitions/submission/${row.id}`}>查看详情</Link></>}</div></li>)}</ul>}
        {(access?.canReview || access?.canManage) ? <div className="mt-8 border-t aia-border-rule pt-5"><p className="aia-kicker">Reviewer</p><div className="mt-3 flex flex-col gap-2"><Link className="aia-link text-sm" href="/services/teacher-recognitions/review">进入奖励审核队列 →</Link>{access.canManage ? <Link className="aia-link text-sm" href="/services/teacher-recognitions/manage">统计与导出 →</Link> : null}</div></div> : null}
      </aside>
    </div>
  )
}
