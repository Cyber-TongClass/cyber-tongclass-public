"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { OAFormSubmissionsTable } from "@/components/oa-forms/oa-form-submissions-table"
import { parseOAResultBatchText } from "@/lib/oa-forms"
import { useAdminBatchUpdateOAFormResults, useAdminOAForm, useAdminOAFormSubmissions, useAdminReviewOAFormSubmission, useAdminUpdateOAFormResultConfig } from "@/lib/api"
import type { OAForm, OAFormSubmission, OAResultField, OAResultFieldType, OAReviewStatus } from "@/types"
import { useEffect, useState } from "react"

function createResultField(): OAResultField {
  return { id: `result_${Date.now().toString(36)}`, label: "结果", type: "text", visibleToSubmitter: true }
}

export default function AdminFormSubmissionsPage() {
  const params = useParams<{ id: string }>()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<OAReviewStatus | "all">("all")
  const form = useAdminOAForm(params.id) as OAForm | null | undefined
  const submissions = useAdminOAFormSubmissions({ formId: params.id, search: search.trim() || undefined, status: status === "all" ? undefined : status }) as OAFormSubmission[] | undefined
  const review = useAdminReviewOAFormSubmission()
  const batchUpdate = useAdminBatchUpdateOAFormResults()
  const updateResultConfig = useAdminUpdateOAFormResultConfig()
  const [batchText, setBatchText] = useState("")
  const [batchMessage, setBatchMessage] = useState("")
  const [batching, setBatching] = useState(false)
  const [resultFields, setResultFields] = useState<OAResultField[]>([])
  const [resultsVisible, setResultsVisible] = useState(false)
  const [resultConfigMessage, setResultConfigMessage] = useState("")
  const [savingResultConfig, setSavingResultConfig] = useState(false)
  const [showBatchTools, setShowBatchTools] = useState(false)

  useEffect(() => {
    if (!form) return
    setResultFields(form.resultFields || [])
    setResultsVisible(Boolean(form.resultsVisible))
  }, [form])

  if (form === undefined) return <p role="status" className="aia-text-muted py-6 text-sm">正在加载表单…</p>
  if (!form) return <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6 text-[hsl(var(--aia-ink))]">表单不存在。</p>

  return (
    <div className="space-y-10">
      <div>
        <Link href={`/admin/forms/${form._id}`} className="aia-link aia-mono text-xs uppercase tracking-[0.14em]">
          ← 返回表单编辑
        </Link>
        <p className="aia-kicker mt-6">提交审核 · Submissions</p>
        <h1 className="aia-serif mt-2 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">{form.title}</h1>
        <p className="aia-text-muted mt-2 text-sm leading-6">查看提交、下载附件、导出 CSV 并维护审核状态。</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名、学号或邮箱" className="aia-focus rounded-none border aia-border-rule bg-transparent pr-10" />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 aia-text-muted" aria-hidden="true" />
        </div>
        <select className="aia-focus h-10 rounded-none border aia-border-rule bg-transparent px-3 text-sm text-[hsl(var(--aia-ink))]" value={status} onChange={(event) => setStatus(event.target.value as OAReviewStatus | "all")}>
          <option value="all">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
          <option value="needs_changes">需补材料</option>
        </select>
        <Button
          type="button"
          className="min-h-11 rounded-none bg-[hsl(var(--aia-red))] px-5 hover:bg-[hsl(var(--aia-red-deep))] md:shrink-0"
          aria-expanded={showBatchTools}
          onClick={() => setShowBatchTools((current) => !current)}
        >
          批量批复与修改
        </Button>
      </div>

      {showBatchTools ? (
        <div className="admin-submissions-batch-tools space-y-10">
          <section className="space-y-4 border-t aia-border-rule pt-6" aria-labelledby="oa-result-config-heading">
            <div>
              <h2 id="oa-result-config-heading" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">结果展示配置</h2>
              <p className="aia-text-muted mt-1 text-sm leading-6">这里用于管理员审核后回填“是否通过、核定金额、打款状态”等结果，不是申请人需要填写的问题。</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-[hsl(var(--aia-ink))]"><input type="checkbox" checked={resultsVisible} onChange={(event) => setResultsVisible(event.target.checked)} />允许申请人查看自己的结果</label>
            <div className="overflow-hidden border aia-border-rule">
              {resultFields.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm aia-text-muted">暂未配置结果字段。</div>
              ) : resultFields.map((field, index) => (
                <div key={field.id} className="grid gap-3 border-b aia-border-rule px-4 py-3 last:border-b-0 md:grid-cols-[1fr_160px_140px_80px] md:items-center">
                  <Input value={field.label} onChange={(event) => setResultFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="例如：是否通过" className="aia-focus rounded-none border aia-border-rule bg-transparent" />
                  <select className="aia-focus h-10 rounded-none border aia-border-rule bg-transparent px-3 text-sm text-[hsl(var(--aia-ink))]" value={field.type} onChange={(event) => setResultFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as OAResultFieldType } : item))}>
                    <option value="text">文本</option>
                    <option value="number">数字</option>
                    <option value="date">日期</option>
                    <option value="select">选择</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-[hsl(var(--aia-ink))]"><input type="checkbox" checked={field.visibleToSubmitter !== false} onChange={(event) => setResultFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, visibleToSubmitter: event.target.checked } : item))} />申请人可见</label>
                  <button type="button" className="aia-focus text-sm text-[hsl(var(--aia-red-deep))] hover:text-[hsl(var(--aia-red))]" onClick={() => setResultFields((current) => current.filter((_, itemIndex) => itemIndex !== index))}>删除</button>
                  <div className="aia-mono text-xs aia-text-muted md:col-span-4">批量导入字段 ID：{field.id}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-none border aia-border-rule bg-transparent px-3 text-xs" onClick={() => setResultFields((current) => [...current, createResultField()])}>增加结果项</Button>
              <div className="flex items-center gap-3">
                {resultConfigMessage ? <span className="text-sm aia-text-muted">{resultConfigMessage}</span> : null}
                <Button
                  type="button"
                  className="min-h-11 rounded-none bg-[hsl(var(--aia-red))] px-5 hover:bg-[hsl(var(--aia-red-deep))]"
                  disabled={savingResultConfig}
                  onClick={async () => {
                    setSavingResultConfig(true)
                    setResultConfigMessage("")
                    try {
                      await updateResultConfig({ formId: form._id, resultFields: resultFields.filter((field) => field.label.trim()), resultsVisible })
                      setResultConfigMessage("结果配置已保存")
                    } catch (error) {
                      setResultConfigMessage(error instanceof Error ? error.message : "保存失败")
                    } finally {
                      setSavingResultConfig(false)
                    }
                  }}
                >
                  {savingResultConfig ? "保存中..." : "保存结果配置"}
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t aia-border-rule pt-6" aria-labelledby="oa-result-batch-heading">
            <div>
              <h2 id="oa-result-batch-heading" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">批量关联结果</h2>
              <p className="aia-text-muted mt-1 text-sm leading-6">
                第一行写表头，可用逗号或 Tab 分隔。至少包含 studentId 或 submissionId；可选 reviewStatus；其余列使用结果字段 ID，例如：studentId,reviewStatus,decision,amount。
              </p>
            </div>
            <Textarea value={batchText} onChange={(event) => setBatchText(event.target.value)} rows={5} placeholder="studentId,reviewStatus,decision&#10;20260001,approved,通过" className="aia-focus rounded-none border aia-border-rule bg-transparent" />
            {batchMessage ? <p className="text-sm aia-text-muted">{batchMessage}</p> : null}
            <Button
              type="button"
              className="min-h-11 rounded-none bg-[hsl(var(--aia-red))] px-5 hover:bg-[hsl(var(--aia-red-deep))]"
              disabled={batching || !batchText.trim()}
              onClick={async () => {
                setBatching(true)
                setBatchMessage("")
                try {
                  const rows = parseOAResultBatchText(batchText, form.resultFields || [])
                  if (rows.length === 0) throw new Error("没有可导入的结果行")
                  const result = await batchUpdate({ formId: form._id, rows })
                  const updated = (result as any)?.updated ?? rows.length
                  const skippedWorkflow = (result as any)?.skippedWorkflow ?? 0
                  setBatchMessage(
                    skippedWorkflow > 0
                      ? `已更新 ${updated} 条结果；另有 ${skippedWorkflow} 条工作流提交未改动，请到审批处理台处理。`
                      : `已更新 ${updated} 条结果`,
                  )
                } catch (error) {
                  setBatchMessage(error instanceof Error ? error.message : "导入失败")
                } finally {
                  setBatching(false)
                }
              }}
            >
              {batching ? "导入中..." : "导入结果"}
            </Button>
          </section>
        </div>
      ) : null}

      {submissions === undefined ? (
        <p role="status" className="aia-text-muted py-6 text-sm">正在加载提交记录…</p>
      ) : (
        <OAFormSubmissionsTable form={form} submissions={submissions} onReview={review} />
      )}
    </div>
  )
}
