"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

  if (form === undefined) return <div className="text-gray-500">Loading...</div>
  if (!form) return <Card><CardContent className="py-10 text-center text-sm text-gray-500">表单不存在。</CardContent></Card>

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="self-start"><Link href={`/admin/forms/${form._id}`}><ArrowLeft className="mr-2 h-4 w-4" />返回表单编辑</Link></Button>
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">{form.title} · 提交审核</h1>
        <p className="mt-1 text-gray-500">查看提交、下载附件、导出 CSV 并维护审核状态。</p>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名、学号或邮箱" className="pr-10" />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as OAReviewStatus | "all")}>
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="needs_changes">需补材料</option>
          </select>
          <Button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 md:shrink-0"
            aria-expanded={showBatchTools}
            onClick={() => setShowBatchTools((current) => !current)}
          >
            批量批复与修改
          </Button>
        </CardContent>
      </Card>
      {showBatchTools ? (
        <div className="admin-submissions-batch-tools space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h2 className="font-semibold text-slate-900">结果展示配置</h2>
                <p className="mt-1 text-sm text-slate-500">这里用于管理员审核后回填“是否通过、核定金额、打款状态”等结果，不是申请人需要填写的问题。</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={resultsVisible} onChange={(event) => setResultsVisible(event.target.checked)} />允许申请人查看自己的结果</label>
              <div className="overflow-hidden rounded-lg border bg-white">
                {resultFields.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">暂未配置结果字段。</div>
                ) : resultFields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[1fr_160px_140px_80px] md:items-center">
                    <Input value={field.label} onChange={(event) => setResultFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="例如：是否通过" />
                    <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={field.type} onChange={(event) => setResultFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as OAResultFieldType } : item))}>
                      <option value="text">文本</option>
                      <option value="number">数字</option>
                      <option value="date">日期</option>
                      <option value="select">选择</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={field.visibleToSubmitter !== false} onChange={(event) => setResultFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, visibleToSubmitter: event.target.checked } : item))} />申请人可见</label>
                    <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setResultFields((current) => current.filter((_, itemIndex) => itemIndex !== index))}>删除</button>
                    <div className="text-xs text-slate-400 md:col-span-4">批量导入字段 ID：{field.id}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setResultFields((current) => [...current, createResultField()])}>增加结果项</Button>
                <div className="flex items-center gap-3">
                  {resultConfigMessage ? <span className="text-sm text-slate-600">{resultConfigMessage}</span> : null}
                  <Button
                    type="button"
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
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div>
                <h2 className="font-semibold text-slate-900">批量关联结果</h2>
                <p className="mt-1 text-sm text-slate-500">
                  第一行写表头，可用逗号或 Tab 分隔。至少包含 studentId 或 submissionId；可选 reviewStatus；其余列使用结果字段 ID，例如：studentId,reviewStatus,decision,amount。
                </p>
              </div>
              <Textarea value={batchText} onChange={(event) => setBatchText(event.target.value)} rows={5} placeholder="studentId,reviewStatus,decision&#10;20260001,approved,通过" />
              {batchMessage ? <p className="text-sm text-slate-600">{batchMessage}</p> : null}
              <Button
                type="button"
                disabled={batching || !batchText.trim()}
                onClick={async () => {
                  setBatching(true)
                  setBatchMessage("")
                  try {
                    const rows = parseOAResultBatchText(batchText, form.resultFields || [])
                    if (rows.length === 0) throw new Error("没有可导入的结果行")
                    const result = await batchUpdate({ formId: form._id, rows })
                    setBatchMessage(`已更新 ${(result as any)?.updated ?? rows.length} 条结果`)
                  } catch (error) {
                    setBatchMessage(error instanceof Error ? error.message : "导入失败")
                  } finally {
                    setBatching(false)
                  }
                }}
              >
                {batching ? "导入中..." : "导入结果"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
      {submissions === undefined ? (
        <Card><CardContent className="py-10 text-center text-sm text-gray-500">Loading...</CardContent></Card>
      ) : (
        <OAFormSubmissionsTable form={form} submissions={submissions} onReview={review} />
      )}
    </div>
  )
}
