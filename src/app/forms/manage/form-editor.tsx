"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, FileInput, Search } from "lucide-react"

import { OaScopePicker } from "@/components/oa/oa-scope-picker"
import { OAWorkflowEditor } from "@/components/oa/oa-workflow-editor"
import { OAFormBuilder } from "@/components/oa-forms/oa-form-builder"
import { OADocumentBatchExportActions } from "@/components/oa-documents/oa-document-export-actions"
import { OADocumentNewFormImport } from "@/components/oa-documents/oa-document-new-form-import"
import { formatAiaOATime } from "@/components/oa/aia-oa-shared"
import {
  useEditorVisibleOAForms,
  useManageOAFormSubmissions,
  useManageUpsertOAForm,
} from "@/lib/api"
import {
  createDefaultOAFormDraft,
  getOAWorkflowDraftConfig,
  hasOAUserScopeRecipients,
  normalizeOAWorkflowDefinition,
  oaReviewStatusLabels,
  type OAUserScope,
  type OAWorkflowDraftConfig,
} from "@/lib/oa-forms"
import type { OAForm, OAFormField, OAFormSubmission, OAReviewStatus } from "@/types"
import { cn } from "@/lib/utils"

function formatAnswer(value: unknown, field?: OAFormField): string {
  if (value === undefined || value === null || value === "") return "—"
  if (field?.type === "table" && Array.isArray(value)) {
    if (value.length === 0) return "—"
    const columns = field.columns || []
    return value
      .map((row) => {
        if (!row || typeof row !== "object") return String(row)
        const record = row as Record<string, unknown>
        const parts = columns.length > 0
          ? columns.map((column) => `${column.label}: ${String(record[column.id] ?? "")}`)
          : Object.entries(record).map(([key, item]) => `${key}: ${String(item ?? "")}`)
        return parts.join("，")
      })
      .join("；")
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—"
    return value.map((item) => formatAnswer(item)).join("、")
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.fileName === "string" && record.fileName) return record.fileName
    return JSON.stringify(value)
  }
  return String(value)
}

const reviewStatusClass: Record<OAReviewStatus, string> = {
  pending: "text-[hsl(var(--aia-red))]",
  approved: "text-[hsl(var(--aia-ink))]",
  rejected: "aia-text-muted",
  needs_changes: "aia-text-muted",
}

function FormSubmissionsSection({ form }: { form: OAForm }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | OAReviewStatus>("all")
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([])
  const submissions = useManageOAFormSubmissions({
    formId: form._id,
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
  }) as OAFormSubmission[] | undefined
  const visibleIds = submissions?.map((submission) => submission._id) || []
  const visibleSelected = visibleIds.filter((id) => selectedSubmissionIds.includes(id))
  const allVisibleSelected = visibleIds.length > 0 && visibleSelected.length === visibleIds.length
  const toggle = (id: string, selected: boolean) => {
    setSelectedSubmissionIds((current) => selected
      ? [...new Set([...current, id])].slice(0, 100)
      : current.filter((item) => item !== id))
  }

  return (
    <section id="submissions" aria-labelledby="form-submissions-title" className="mt-12 scroll-mt-24 border-t aia-border-rule pt-8">
      <h2 className="flex items-baseline gap-3">
        <span id="form-submissions-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
          提交记录
        </span>
        {submissions ? (
          <span className="aia-mono text-xs aia-text-muted">{submissions.length} 份</span>
        ) : null}
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--aia-muted))]" aria-hidden="true" />
          <label className="sr-only" htmlFor="submission-search">搜索提交人</label>
          <input
            id="submission-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索姓名、学号或邮箱…"
            className="aia-focus w-full border aia-border-rule bg-transparent py-2 pl-9 pr-3 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"
          />
        </div>
        <label className="sr-only" htmlFor="submission-status">按状态筛选</label>
        <select
          id="submission-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | OAReviewStatus)}
          className="aia-focus border aia-border-rule bg-transparent px-3 py-2 text-sm text-[hsl(var(--aia-ink))]"
        >
          <option value="all">全部状态</option>
          {Object.entries(oaReviewStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {submissions === undefined ? (
        <p role="status" className="aia-text-muted py-6 text-sm">正在加载提交记录…</p>
      ) : submissions.length === 0 ? (
        <p className="aia-text-muted py-6 text-sm">
          {search.trim() || status !== "all" ? "没有符合筛选条件的提交。" : "暂无提交。"}
        </p>
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="aia-focus inline-flex items-center gap-2 text-xs text-[hsl(var(--aia-ink))]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--aia-red))]"
                checked={allVisibleSelected}
                onChange={(event) => setSelectedSubmissionIds((current) => event.target.checked
                  ? [...new Set([...current, ...visibleIds])].slice(0, 100)
                  : current.filter((id) => !visibleIds.includes(id)))}
              />
              选择当前列表（每次最多 100 份）
            </label>
            {selectedSubmissionIds.length ? (
              <button type="button" className="aia-link aia-focus text-xs" onClick={() => setSelectedSubmissionIds([])}>清除选择</button>
            ) : null}
          </div>
          <OADocumentBatchExportActions formId={form._id} submissionIds={selectedSubmissionIds} />
          {submissions.map((submission) => (
            <details key={submission._id} className="group border-t aia-border-rule last:border-b">
              <summary className="aia-focus flex cursor-pointer list-none flex-wrap items-baseline gap-x-4 gap-y-1 py-4 [&::-webkit-details-marker]:hidden">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[hsl(var(--aia-red))]"
                  checked={selectedSubmissionIds.includes(submission._id)}
                  aria-label={`选择${submission.submitterName}的提交`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => toggle(submission._id, event.target.checked)}
                />
                <span className="aia-serif text-base font-semibold text-[hsl(var(--aia-ink))]">
                  {submission.submitterName}
                </span>
                <span className="aia-mono text-xs aia-text-muted">
                  {submission.studentId}
                  {submission.submitterEmail ? ` · ${submission.submitterEmail}` : ""}
                </span>
                <span className="aia-mono ml-auto text-xs aia-text-muted">
                  {formatAiaOATime(submission.submittedAt)}
                </span>
                <span className={cn("aia-mono text-xs", reviewStatusClass[submission.reviewStatus] || "aia-text-muted")}>
                  {oaReviewStatusLabels[submission.reviewStatus] || submission.reviewStatus}
                </span>
              </summary>
              <dl className="grid gap-4 border-t aia-border-rule py-4 sm:grid-cols-2">
                {form.fields.map((field) => (
                  <div key={field.id}>
                    <dt className="aia-mono text-xs aia-text-muted">{field.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[hsl(var(--aia-ink))]">
                      {formatAnswer(submission.answers?.[field.id], field)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}

export function ManageFormEditor({
  form,
  canViewSubmissions = true,
  currentUserId,
}: {
  form: OAForm | null
  canViewSubmissions?: boolean
  currentUserId?: string
}) {
  const router = useRouter()
  const upsert = useManageUpsertOAForm()
  const editorVisibleForms = useEditorVisibleOAForms()
  const [workflowConfig, setWorkflowConfig] = useState<OAWorkflowDraftConfig>(() => {
    const config = form
      ? getOAWorkflowDraftConfig(form as unknown as Record<string, unknown>)
      : {}
    return {
      ...config,
      workflowDefinition: config.workflowDefinition
        || normalizeOAWorkflowDefinition(undefined, config.approvalSteps),
    }
  })
  const [scope, setScope] = useState<OAUserScope>(() => {
    if (!form) return {}
    const config = getOAWorkflowDraftConfig(form as unknown as Record<string, unknown>)
    return config.targetScope ?? {}
  })

  const handleSave = async (draft: Record<string, unknown>) => {
    if (!hasOAUserScopeRecipients(scope)) {
      throw new Error("请先设置表单可见范围（至少选择一个条件）。")
    }
    await upsert({
      ...draft,
      ...(form ? { id: form._id } : {}),
      targetScope: scope,
      workflowDefinition: workflowConfig.workflowDefinition,
    })
    if (!form) router.push("/forms/manage")
  }

  return (
    <>
      {!form && currentUserId ? (
        <section aria-labelledby="word-first-import-title" className="mt-10 border-t aia-border-rule pt-8">
          <div className="mb-5">
            <p className="aia-kicker">WORD FIRST</p>
            <h2 id="word-first-import-title" className="aia-serif mt-2 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
              从 Word 自动生成表单
            </h2>
            <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
              无需先填写标题、可见范围或审批流程。上传后将创建仅你可见的临时草稿，并进入现有文档批注工作台。
            </p>
          </div>
          <OADocumentNewFormImport creatorId={currentUserId} />
          <div className="aia-mono my-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] aia-text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-[hsl(var(--aia-rule))]" />
            或手动创建
            <span className="h-px flex-1 bg-[hsl(var(--aia-rule))]" />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="form-scope-title" className="mt-10 border-t aia-border-rule pt-8">
        <h2 id="form-scope-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
          可见范围
        </h2>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          该表单只对范围内成员可见；至少选择一个条件。保存后范围调整即时生效。
        </p>
        <div className="mt-5">
          <OaScopePicker
            scope={scope}
            onChange={setScope}
            idPrefix="teacher-form-scope"
            allowEmpty={false}
            includeEveryoneOption
          />
        </div>
      </section>

      <div className="mt-10">
        <OAWorkflowEditor
          value={workflowConfig}
          onChange={setWorkflowConfig}
          formCandidates={(editorVisibleForms || [])
            .filter((candidate) => candidate.id !== form?._id)
            .map((candidate) => ({
              id: candidate.id,
              title: candidate.title,
              status: candidate.status,
              searchTerms: [candidate.kind === "reimbursement" ? "报销" : "表单"],
            }))}
        />
      </div>

      <section aria-label="表单内容" className="mt-10 border-t aia-border-rule pt-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">表单内容</h2>
            <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
              可从 Word 自动识别生成字段，也可以手动插入填空、选择、表格、附件等字段。新表单保存后为草稿。
            </p>
          </div>
          {form ? (
            <Link
              href={`/forms/manage/${form._id}/document-template`}
              className="aia-focus inline-flex shrink-0 items-center gap-2 border aia-border-rule px-3 py-2 text-sm font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
            >
              <FileInput className="h-4 w-4" aria-hidden="true" />
              从 Word 导入 / 原格式模板
            </Link>
          ) : null}
        </div>
        <div className="mt-5">
          <OAFormBuilder
            form={form ?? { ...createDefaultOAFormDraft("未命名表单"), category: "教学服务" }}
            onSave={handleSave}
          />
        </div>
      </section>

      {form && canViewSubmissions ? <FormSubmissionsSection form={form} /> : null}
    </>
  )
}

export function ManageFormEditorHeader({ isEdit }: { isEdit: boolean }) {
  return (
    <>
      <Link href="/forms/manage" className="aia-link aia-focus text-sm font-medium">
        <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回表单管理
      </Link>
      <header className="mt-8">
        <p className="aia-kicker">教学服务 · 表单</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
          {isEdit ? "编辑表单" : "新建表单"}
        </h1>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          {isEdit
            ? "调整可见范围与字段后保存；范围内成员看到的始终是最新版本。"
            : "可直接导入 Word 自动生成字段，或从空白表单开始。完善可见范围和审批流程后再发布。"}
        </p>
      </header>
    </>
  )
}
