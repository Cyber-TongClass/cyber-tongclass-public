"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Clock3, ExternalLink, Loader2, MessageSquareWarning, X } from "lucide-react"

import {
  useActOnTeacherRecognitionReview,
  useTeacherRecognitionProofUrl,
  useTeacherRecognitionReviewDetail,
  useTeacherRecognitionReviewQueue,
} from "@/lib/api"
import { formatTeacherRecognitionDateRange, getTeacherRecognitionStatusLabel } from "@/lib/teacher-recognition"

function ProofLink({ submissionId, file }: { submissionId: string; file: any }) {
  const url = useTeacherRecognitionProofUrl(submissionId, file.storageId)
  return <li>{url ? <a href={url} target="_blank" rel="noreferrer" className="aia-link inline-flex items-center gap-1 text-sm">{file.fileName}<ExternalLink className="h-3.5 w-3.5" /></a> : <span className="aia-text-muted text-sm">正在签发：{file.fileName}</span>}</li>
}

export function TeacherRecognitionReviewQueue() {
  const [status, setStatus] = useState("pending")
  const rows = useTeacherRecognitionReviewQueue(status || undefined) as any[] | undefined
  return <div><div className="flex flex-wrap items-end justify-between gap-4 border-b aia-border-rule pb-4"><div><p className="aia-kicker">Review · Queue</p><h2 className="aia-serif mt-2 text-2xl font-semibold">我的审核任务</h2></div><select aria-label="审核状态" value={status} onChange={(e) => setStatus(e.target.value)} className="aia-focus border aia-border-rule bg-transparent px-3 py-2 text-sm"><option value="pending">待处理</option><option value="approved">已通过</option><option value="rejected">已驳回</option><option value="changes_requested">已要求补充</option><option value="">全部</option></select></div>{rows === undefined ? <p className="aia-text-muted py-8 text-sm">正在读取审核任务…</p> : rows.length === 0 ? <p className="aia-text-muted py-8 text-sm">当前没有符合条件的审核任务。</p> : <ul className="divide-y divide-[hsl(var(--aia-rule))]">{rows.map((row) => <li key={row.taskId}><Link href={`/services/teacher-recognitions/review/${row.taskId}`} className="aia-focus group grid gap-3 py-5 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold group-hover:text-[hsl(var(--aia-red))]">{row.submission.name}</p><p className="aia-text-muted mt-1 text-sm">{row.submission.teacherName} · {row.submission.categoryLabel} · {row.submission.reportingYear}</p></div><div className="flex items-center gap-2 text-xs aia-text-muted"><Clock3 className="h-4 w-4" />{getTeacherRecognitionStatusLabel(row.submission.reviewStatus)}</div></Link></li>)}</ul>}</div>
}

export function TeacherRecognitionReviewDetail({ taskId }: { taskId: string }) {
  const detail = useTeacherRecognitionReviewDetail(taskId) as any
  const act = useActOnTeacherRecognitionReview()
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  if (detail === undefined) return <p className="aia-text-muted py-8 text-sm">正在读取申报内容…</p>
  if (!detail) return <p role="alert" className="border-y aia-border-rule py-8 text-sm">任务不存在或不属于当前账户。</p>
  const item = detail.submission
  async function action(value: "approve" | "reject" | "request_changes") { setBusy(true); setMessage(""); try { const result = await act({ taskId, action: value, comment: comment || undefined, expectedVersion: detail.workflowVersion, idempotencyKey: crypto.randomUUID() }) as any; setMessage(result.updated ? "处理成功。" : "任务已被处理或版本已更新，请刷新页面。") } catch (e) { setMessage(e instanceof Error ? e.message : "处理失败") } finally { setBusy(false) } }
  return <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]"><article><Link href="/services/teacher-recognitions/review" className="aia-link text-sm">← 返回审核队列</Link><div className="mt-6 border-b aia-border-rule pb-5"><p className="aia-kicker">{item.categoryLabel} · {item.reportingYear}</p><h2 className="aia-serif mt-2 text-3xl font-semibold">{item.name}</h2><p className="aia-text-muted mt-2">{item.teacherName} · {item.organization}</p></div><dl className="grid gap-5 py-6 sm:grid-cols-2"><div><dt className="aia-kicker">任职时间</dt><dd className="mt-1 text-sm">{formatTeacherRecognitionDateRange(item.startDate, item.endDate)}</dd></div><div><dt className="aia-kicker">当前状态</dt><dd className="mt-1 text-sm">{getTeacherRecognitionStatusLabel(item.reviewStatus)}</dd></div>{item.explanation ? <div className="sm:col-span-2"><dt className="aia-kicker">申请说明</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.explanation}</dd></div> : null}</dl><section className="border-t aia-border-rule pt-5"><h3 className="aia-serif text-xl font-semibold">证明材料</h3><ul className="mt-3 space-y-2">{item.proof?.map((file: any) => <ProofLink key={file.storageId} submissionId={item.id} file={file} />)}</ul></section></article><aside className="border-t-2 border-[hsl(var(--aia-red))] pt-5"><p className="aia-kicker">Decision</p><h3 className="aia-serif mt-1 text-xl font-semibold">审核处理</h3><textarea aria-label="审核意见" value={comment} onChange={(e) => setComment(e.target.value)} rows={5} placeholder="驳回或要求补充时必须填写意见" className="aia-focus mt-5 w-full border aia-border-rule bg-transparent p-3 text-sm" />{message ? <p role="status" className="mt-3 text-sm text-[hsl(var(--aia-red))]">{message}</p> : null}<div className="mt-5 grid gap-2"><button disabled={busy || detail.taskStatus !== "pending"} onClick={() => action("approve")} className="aia-focus inline-flex min-h-11 items-center justify-center gap-2 bg-[hsl(var(--aia-red))] px-4 text-sm font-medium text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}通过</button><button disabled={busy || detail.taskStatus !== "pending" || !comment.trim()} onClick={() => action("request_changes")} className="aia-focus inline-flex min-h-11 items-center justify-center gap-2 border aia-border-rule px-4 text-sm"><MessageSquareWarning className="h-4 w-4" />要求补充</button><button disabled={busy || detail.taskStatus !== "pending" || !comment.trim()} onClick={() => action("reject")} className="aia-focus inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm text-[hsl(var(--aia-red))]"><X className="h-4 w-4" />驳回</button></div><p className="aia-text-muted mt-4 text-xs leading-5">任一审核人完成处理后，本轮其他分支将自动结束。</p></aside></div>
}
