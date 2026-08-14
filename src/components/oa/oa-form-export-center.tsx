"use client"

import { useMemo, useState } from "react"
import { Download, FileSpreadsheet } from "lucide-react"

import { OADocumentBatchExportActions, OADocumentSingleExportActions } from "@/components/oa-documents/oa-document-export-actions"
import { useManageOAFormSubmissions } from "@/lib/api"
import { formatAiaOATime } from "@/components/oa/aia-oa-shared"
import type { OAForm, OAFormSubmission } from "@/types"

export function OAFormExportCenter({ form }: { form: OAForm }) {
  const submissions = useManageOAFormSubmissions({ formId: form._id }) as OAFormSubmission[] | undefined
  const [submissionIds, setSubmissionIds] = useState<string[]>([])
  const [fieldIds, setFieldIds] = useState<string[]>(() => form.fields.map((field) => field.id))
  const visibleSubmissionIds = useMemo(() => submissions?.map((submission) => submission._id) || [], [submissions])
  const allSubmissionsSelected = visibleSubmissionIds.length > 0 && visibleSubmissionIds.every((id) => submissionIds.includes(id))
  const allFieldsSelected = form.fields.length > 0 && form.fields.every((field) => fieldIds.includes(field.id))

  const toggleSubmission = (id: string) => setSubmissionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 100))
  const toggleField = (id: string) => setFieldIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return (
    <div className="mt-10 space-y-10">
      <section aria-labelledby="export-submissions-title">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b aia-border-rule pb-4">
          <div>
            <p className="aia-kicker">01 · RECORDS</p>
            <h2 id="export-submissions-title" className="aia-serif mt-2 text-xl font-semibold">选择申请</h2>
            <p className="aia-text-muted mt-1 text-sm">可单独下载某位申请人的材料，也可勾选最多 100 份批量打包。</p>
          </div>
          <label className="aia-focus inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={allSubmissionsSelected} onChange={(event) => setSubmissionIds(event.target.checked ? visibleSubmissionIds.slice(0, 100) : [])} />
            选择全部
          </label>
        </div>
        {submissions === undefined ? <p role="status" className="aia-text-muted py-6 text-sm">正在加载提交记录…</p> : submissions.length === 0 ? <p className="aia-text-muted py-6 text-sm">暂无可导出的提交。</p> : (
          <ul className="divide-y divide-[hsl(var(--aia-rule))] border-b aia-border-rule">
            {submissions.map((submission) => (
              <li key={submission._id} className="grid gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                <input className="aia-focus mt-1 h-4 w-4" type="checkbox" aria-label={`选择${submission.submitterName}的申请`} checked={submissionIds.includes(submission._id)} onChange={() => toggleSubmission(submission._id)} />
                <div>
                  <p className="font-medium text-[hsl(var(--aia-ink))]">{submission.submitterName}</p>
                  <p className="aia-mono mt-1 text-xs aia-text-muted">{submission.studentId}{submission.submitterEmail ? ` · ${submission.submitterEmail}` : ""} · {formatAiaOATime(submission.submittedAt)}</p>
                </div>
                <OADocumentSingleExportActions submissionId={submission._id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="export-fields-title">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b aia-border-rule pb-4">
          <div>
            <p className="aia-kicker">02 · COLUMNS</p>
            <h2 id="export-fields-title" className="aia-serif mt-2 text-xl font-semibold">选择汇总字段</h2>
            <p className="aia-text-muted mt-1 text-sm">仅影响 CSV / Excel 汇总；Word、原格式与 PDF 始终保留完整申请。</p>
          </div>
          <label className="aia-focus inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={allFieldsSelected} onChange={(event) => setFieldIds(event.target.checked ? form.fields.map((field) => field.id) : [])} />
            全部字段
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {form.fields.map((field) => (
            <label key={field.id} className="aia-focus flex min-h-11 items-center gap-2 border aia-border-rule px-3 py-2 text-sm">
              <input type="checkbox" checked={fieldIds.includes(field.id)} onChange={() => toggleField(field.id)} />
              {field.label}
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="export-format-title">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center border aia-border-rule"><FileSpreadsheet className="h-4 w-4 text-[hsl(var(--aia-red))]" aria-hidden="true" /></span>
          <div><p className="aia-kicker">03 · EXPORT</p><h2 id="export-format-title" className="aia-serif text-xl font-semibold">选择导出形式</h2></div>
        </div>
        <OADocumentBatchExportActions formId={form._id} submissionIds={submissionIds} fieldIds={fieldIds} />
        <p className="aia-text-muted mt-3 flex items-center gap-2 text-xs"><Download className="h-3.5 w-3.5" aria-hidden="true" />下载内容仅对申请人本人和有权管理该表单的人开放。</p>
      </section>
    </div>
  )
}
