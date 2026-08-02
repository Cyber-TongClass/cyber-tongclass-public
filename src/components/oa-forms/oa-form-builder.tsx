"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronDown, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createDefaultOAFormDraft, createFieldFromPalette, fieldTypeLabels, normalizeFormSlug, toOAFormUpsertPayload, validateOAFormDraftForSave } from "@/lib/oa-forms"
import { cn } from "@/lib/utils"
import type { OAFieldType, OAForm, OAFormField, OAFormOption, OAFormStatus, OAResultField, OAResultFieldType, OATableColumn } from "@/types"

type OAFormBuilderProps = {
  form?: Partial<OAForm> | null
  onSave: (draft: Record<string, unknown>) => Promise<void>
}

type BuilderDraft = Partial<OAForm> & {
  title: string
  slug: string
  description: string
  category: string
  kind?: OAForm["kind"]
  status: OAFormStatus
  fields: OAFormField[]
  resultFields: OAResultField[]
}

type FieldDetailEditorProps = {
  field: OAFormField
  index: number
  updateField: (index: number, patch: Partial<OAFormField>) => void
}

const fieldTypes: OAFieldType[] = ["text", "textarea", "number", "date", "select", "radio", "checkbox", "file", "table"]
const controlClass = "aia-focus h-11 w-full rounded-none border border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] px-3 text-sm text-[hsl(var(--aia-ink))]"
const textControlClass = "rounded-none border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] focus-visible:ring-[hsl(var(--aia-red))]"
const actionClass = "aia-focus inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-medium transition-colors hover:text-[hsl(var(--aia-red))] disabled:cursor-not-allowed disabled:opacity-35"

function optionsToText(options?: OAFormOption[]) {
  return (options || []).map((option) => `${option.label}=${option.value}`).join("\n")
}

function textToOptions(value: string) {
  return value.split("\n").map((line) => {
    const [label, rawValue] = line.split("=")
    const normalizedLabel = (label || "").trim()
    const normalizedValue = (rawValue || label || "").trim()
    return normalizedLabel && normalizedValue ? { label: normalizedLabel, value: normalizedValue } : null
  }).filter(Boolean) as OAFormOption[]
}

function columnsToText(columns?: OATableColumn[]) {
  return (columns || []).map((column) => `${column.id},${column.label},${column.type},${column.required ? "required" : ""}`).join("\n")
}

function textToColumns(value: string) {
  return value.split("\n").map((line) => {
    const [id, label, type, required] = line.split(",").map((item) => item.trim())
    if (!id || !label) return null
    return { id, label, type: type === "number" || type === "date" ? type : "text", required: required === "required" } as OATableColumn
  }).filter(Boolean) as OATableColumn[]
}

function toDateTimeLocal(value?: number) {
  if (!value || !Number.isFinite(value)) return ""
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(value - offset).toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string) {
  if (!value) return undefined
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function createResultField(): OAResultField {
  return {
    id: `result_${Date.now().toString(36)}`,
    label: "结果",
    type: "text",
    visibleToSubmitter: true,
  }
}

function FieldDetailEditor({ field, index, updateField }: FieldDetailEditorProps) {
  const prefix = `oa-field-${index}`
  return (
    <div id={`${prefix}-editor`} className="grid gap-x-5 gap-y-4 border-t aia-border-rule bg-[hsl(var(--aia-tag))] px-4 py-5 md:grid-cols-4">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${prefix}-label`}>名称</Label>
        <Input id={`${prefix}-label`} className={textControlClass} value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-type`}>类型</Label>
        <select id={`${prefix}-type`} className={controlClass} value={field.type} onChange={(event) => updateField(index, createFieldFromPalette(event.target.value as OAFieldType, field.label))}>
          {fieldTypes.map((type) => <option key={type} value={type}>{fieldTypeLabels[type]}</option>)}
        </select>
      </div>
      <label htmlFor={`${prefix}-required`} className="flex min-h-11 items-center gap-2 self-end text-sm text-[hsl(var(--aia-ink))]">
        <input id={`${prefix}-required`} type="checkbox" className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]" checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} />
        必填
      </label>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${prefix}-placeholder`}>提示文字</Label>
        <Input id={`${prefix}-placeholder`} className={textControlClass} value={field.placeholder || ""} onChange={(event) => updateField(index, { placeholder: event.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${prefix}-help`}>帮助说明</Label>
        <Input id={`${prefix}-help`} className={textControlClass} value={field.helpText || ""} onChange={(event) => updateField(index, { helpText: event.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${prefix}-id`}>字段 ID（高级）</Label>
        <Input id={`${prefix}-id`} className={textControlClass} value={field.id} aria-describedby={`${prefix}-id-help`} onChange={(event) => updateField(index, { id: event.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} />
        <p id={`${prefix}-id-help`} className="aia-text-muted text-xs leading-5">用于导出、批量导入和系统识别，申请人不会看到。</p>
      </div>
      {["select", "radio", "checkbox"].includes(field.type) ? (
        <div className="space-y-2 md:col-span-4">
          <Label htmlFor={`${prefix}-options`}>选项（每行 label=value）</Label>
          <Textarea id={`${prefix}-options`} className={textControlClass} value={optionsToText(field.options)} onChange={(event) => updateField(index, { options: textToOptions(event.target.value) })} rows={4} />
        </div>
      ) : null}
      {field.type === "file" ? (
        <>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${prefix}-mime`}>允许 MIME 类型（逗号分隔）</Label>
            <Input id={`${prefix}-mime`} className={textControlClass} value={(field.acceptedMimeTypes || []).join(",")} onChange={(event) => updateField(index, { acceptedMimeTypes: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-files`}>最多文件数</Label>
            <Input id={`${prefix}-files`} className={textControlClass} type="number" min={1} value={field.maxFiles || 1} onChange={(event) => updateField(index, { maxFiles: Number(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-size`}>单文件 MB</Label>
            <Input id={`${prefix}-size`} className={textControlClass} type="number" min={1} value={field.maxFileSizeMB || 20} onChange={(event) => updateField(index, { maxFileSizeMB: Number(event.target.value) })} />
          </div>
        </>
      ) : null}
      {field.type === "table" ? (
        <div className="space-y-2 md:col-span-4">
          <Label htmlFor={`${prefix}-columns`}>表格列（每行 id,label,type,required）</Label>
          <Textarea id={`${prefix}-columns`} className={textControlClass} value={columnsToText(field.columns)} onChange={(event) => updateField(index, { columns: textToColumns(event.target.value) })} rows={4} />
        </div>
      ) : null}
    </div>
  )
}

function SectionHeading({ kicker, title, description, id }: { kicker: string; title: string; description: string; id: string }) {
  return (
    <div className="mb-6 max-w-2xl">
      <p className="aia-kicker">{kicker}</p>
      <h3 id={id} className="aia-serif mt-2 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">{title}</h3>
      <p className="aia-text-muted mt-2 text-sm leading-6">{description}</p>
    </div>
  )
}

export function OAFormBuilder({ form, onSave }: OAFormBuilderProps) {
  const initialDraft = useMemo<BuilderDraft>(() => {
    const defaults = createDefaultOAFormDraft(form?.title || "新建 OA 表单")
    return {
      ...defaults,
      ...(form || {}),
      title: form?.title || defaults.title,
      slug: form?.slug || defaults.slug,
      description: form?.description || defaults.description,
      category: form?.category ?? defaults.category,
      kind: form?.kind || defaults.kind,
      status: form?.status || defaults.status,
      fields: (form?.fields || defaults.fields) as OAFormField[],
      resultFields: (form?.resultFields || defaults.resultFields) as OAResultField[],
    }
  }, [form])
  const [draft, setDraft] = useState<BuilderDraft>(initialDraft)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const updateField = (index: number, patch: Partial<OAFormField>) => {
    setDraft((current) => ({
      ...current,
      fields: (current.fields || []).map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field),
    }))
  }

  const addField = (type: OAFieldType) => {
    setDraft((current) => ({ ...current, fields: [...(current.fields || []), createFieldFromPalette(type)] }))
    setExpandedIndex((draft.fields || []).length)
  }

  const moveField = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.fields.length) return current
      const fields = [...current.fields]
      const [field] = fields.splice(index, 1)
      fields.splice(nextIndex, 0, field)
      return { ...current, fields }
    })
    setExpandedIndex((current) => current === index ? index + direction : current)
  }

  const removeField = (index: number) => {
    setDraft((current) => ({ ...current, fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index) }))
    setExpandedIndex(null)
  }

  const save = async () => {
    setMessage("")
    const validationErrors = validateOAFormDraftForSave(draft)
    if (validationErrors.length > 0) {
      setMessage(validationErrors[0])
      return
    }
    setSaving(true)
    try {
      await onSave(toOAFormUpsertPayload({
        ...draft,
        slug: normalizeFormSlug(draft.slug || draft.title || "form"),
        category: draft.category,
        kind: draft.kind || "form",
        visibility: draft.visibility || "members",
        status: draft.status || "draft",
        allowMultipleSubmissions: !draft.maxSubmissionsPerUser || draft.maxSubmissionsPerUser > 1,
        fields: draft.fields || [],
        resultFields: draft.resultFields || [],
      }))
      setMessage("已保存")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="oa-form-basic-title" className="border-y aia-border-rule py-7">
        <SectionHeading kicker="FORM PROFILE" title="表单基本信息" description="定义申请人看到的标题、开放状态与提交规则。" id="oa-form-basic-title" />
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="oa-form-title">标题</Label>
            <Input id="oa-form-title" className={textControlClass} value={draft.title || ""} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value, slug: current.slug === "form" ? normalizeFormSlug(event.target.value) : current.slug }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oa-form-category">分类</Label>
            <Input id="oa-form-category" className={textControlClass} value={draft.category ?? ""} aria-describedby="oa-form-category-help" onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="例如：奖学金、报销、活动报名" />
            <p id="oa-form-category-help" className="aia-text-muted text-xs leading-5">分类不能为空；删除后不会自动回填。</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oa-form-status">状态</Label>
            <select id="oa-form-status" className={controlClass} value={draft.status || "draft"} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as OAForm["status"] }))}>
              <option value="draft">草稿</option>
              <option value="published">发布</option>
              <option value="archived">归档</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oa-form-visibility">可见范围</Label>
            <select id="oa-form-visibility" className={controlClass} value={draft.visibility || "members"} onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value as OAForm["visibility"] }))}>
              <option value="members">院内成员可见</option>
              <option value="admins">仅管理员可见</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oa-form-max-submissions">每人最多提交次数</Label>
            <Input id="oa-form-max-submissions" className={textControlClass} type="number" min={1} value={draft.maxSubmissionsPerUser ?? ""} onChange={(event) => setDraft((current) => ({ ...current, maxSubmissionsPerUser: event.target.value === "" ? undefined : Number(event.target.value) }))} placeholder="留空表示不限" />
          </div>
          <label htmlFor="oa-form-edits" className="flex min-h-11 items-center gap-2 self-end text-sm text-[hsl(var(--aia-ink))]">
            <input id="oa-form-edits" type="checkbox" className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]" checked={Boolean(draft.allowSubmissionEdits)} onChange={(event) => setDraft((current) => ({ ...current, allowSubmissionEdits: event.target.checked }))} />
            允许申请人在开放期内修改提交内容
          </label>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="oa-form-description">说明</Label>
            <Textarea id="oa-form-description" className={textControlClass} value={draft.description || ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oa-form-open-at">开放时间</Label>
            <Input id="oa-form-open-at" className={textControlClass} type="datetime-local" value={toDateTimeLocal(draft.openAt)} onChange={(event) => setDraft((current) => ({ ...current, openAt: fromDateTimeLocal(event.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oa-form-close-at">截止时间</Label>
            <Input id="oa-form-close-at" className={textControlClass} type="datetime-local" value={toDateTimeLocal(draft.closeAt)} onChange={(event) => setDraft((current) => ({ ...current, closeAt: fromDateTimeLocal(event.target.value) }))} />
          </div>
          <p className="aia-mono aia-text-muted break-all text-xs md:col-span-2 md:text-right">/services/oa/{draft.slug || "form"}</p>
        </div>
      </section>

      <section aria-labelledby="oa-form-fields-title">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading kicker="FIELD COMPOSER" title="字段组件" description="添加字段后可展开配置；顺序与申请人填写页面保持一致。" id="oa-form-fields-title" />
          <div aria-label="添加字段" className="flex max-w-3xl flex-wrap border-y aia-border-rule lg:mb-6 lg:justify-end">
            {fieldTypes.map((type) => (
              <button key={type} type="button" className="aia-focus inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium transition-colors hover:bg-[hsl(var(--aia-tag))] hover:text-[hsl(var(--aia-red))]" onClick={() => addField(type)}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />{fieldTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="border-y aia-border-rule">
          {draft.fields.length === 0 ? (
            <p className="aia-text-muted px-4 py-8 text-center text-sm">尚未添加字段。请从上方选择一个组件开始。</p>
          ) : draft.fields.map((field, index) => {
            const expanded = expandedIndex === index
            const editorId = `oa-field-${index}-editor`
            return (
              <div key={`${field.id}-${index}`} className="border-b aia-border-rule last:border-b-0">
                <div className="grid gap-3 px-2 py-2 sm:grid-cols-[44px_minmax(0,1fr)] md:grid-cols-[44px_minmax(0,1fr)_120px_auto] md:items-center">
                  <span className="aia-mono flex h-11 w-11 items-center justify-center text-xs aia-text-muted" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 px-2">
                    <p className="truncate text-sm font-semibold text-[hsl(var(--aia-ink))]">{field.label || "未命名字段"}</p>
                    <p className="aia-text-muted mt-0.5 text-xs">{field.required ? "必填" : "选填"}</p>
                  </div>
                  <span className="aia-mono px-2 text-xs aia-text-muted sm:col-start-2 md:col-start-auto">{fieldTypeLabels[field.type]}</span>
                  <div className="flex flex-wrap items-center sm:col-span-2 md:col-span-1 md:justify-end">
                    <button type="button" className={actionClass} aria-label={`上移“${field.label || "未命名字段"}”`} disabled={index === 0} onClick={() => moveField(index, -1)}><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />上移</button>
                    <button type="button" className={actionClass} aria-label={`下移“${field.label || "未命名字段"}”`} disabled={index === draft.fields.length - 1} onClick={() => moveField(index, 1)}><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />下移</button>
                    <button type="button" className={actionClass} aria-expanded={expanded} aria-controls={editorId} onClick={() => setExpandedIndex(expanded ? null : index)}><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />{expanded ? "收起" : "编辑"}</button>
                    <button type="button" className={cn(actionClass, "text-[hsl(var(--aia-red))]")} aria-label={`删除“${field.label || "未命名字段"}”`} onClick={() => removeField(index)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />删除</button>
                  </div>
                </div>
                {expanded ? <FieldDetailEditor field={field} index={index} updateField={updateField} /> : null}
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="oa-form-results-title" className="border-t aia-border-rule pt-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeading kicker="REVIEW OUTPUT" title="审核结果字段" description="配置审核完成后向申请人回传的结构化结果。" id="oa-form-results-title" />
          <button type="button" className="aia-focus inline-flex min-h-11 items-center gap-2 self-start border-y aia-border-rule px-3 text-sm font-medium transition-colors hover:bg-[hsl(var(--aia-tag))] hover:text-[hsl(var(--aia-red))]" onClick={() => setDraft((current) => ({ ...current, resultFields: [...(current.resultFields || []), createResultField()] }))}>
            <Plus className="h-4 w-4" aria-hidden="true" />增加结果字段
          </button>
        </div>
        <label htmlFor="oa-form-results-visible" className="mb-5 flex min-h-11 items-center gap-2 text-sm text-[hsl(var(--aia-ink))]">
          <input id="oa-form-results-visible" type="checkbox" className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]" checked={Boolean(draft.resultsVisible)} onChange={(event) => setDraft((current) => ({ ...current, resultsVisible: event.target.checked }))} />
          允许申请人查看对其可见的审核结果
        </label>
        {draft.resultFields.length === 0 ? (
          <p className="aia-text-muted border-y aia-border-rule px-4 py-8 text-center text-sm">暂未配置结果字段。</p>
        ) : (
          <div className="border-y aia-border-rule">
            {draft.resultFields.map((field, index) => {
              const prefix = `oa-result-${index}`
              return (
                <div key={field.id} className="grid gap-3 border-b aia-border-rule px-3 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_160px_160px_auto] md:items-center">
                  <div>
                    <Label htmlFor={`${prefix}-label`} className="sr-only">结果字段名称</Label>
                    <Input id={`${prefix}-label`} className={textControlClass} value={field.label} onChange={(event) => setDraft((current) => ({ ...current, resultFields: current.resultFields.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} placeholder="结果名称" />
                  </div>
                  <div>
                    <Label htmlFor={`${prefix}-type`} className="sr-only">结果字段类型</Label>
                    <select id={`${prefix}-type`} className={controlClass} value={field.type} onChange={(event) => setDraft((current) => ({ ...current, resultFields: current.resultFields.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as OAResultFieldType } : item) }))}>
                      <option value="text">文本</option>
                      <option value="number">数字</option>
                      <option value="date">日期</option>
                      <option value="select">选择</option>
                    </select>
                  </div>
                  <label htmlFor={`${prefix}-visible`} className="flex min-h-11 items-center gap-2 text-sm text-[hsl(var(--aia-ink))]">
                    <input id={`${prefix}-visible`} type="checkbox" className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]" checked={field.visibleToSubmitter !== false} onChange={(event) => setDraft((current) => ({ ...current, resultFields: current.resultFields.map((item, itemIndex) => itemIndex === index ? { ...item, visibleToSubmitter: event.target.checked } : item) }))} />
                    申请人可见
                  </label>
                  <button type="button" className={cn(actionClass, "justify-self-start text-[hsl(var(--aia-red))] md:justify-self-end")} aria-label={`删除结果字段“${field.label}”`} onClick={() => setDraft((current) => ({ ...current, resultFields: current.resultFields.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />删除</button>
                  <p className="aia-mono aia-text-muted break-all text-xs md:col-span-4">字段 ID：{field.id}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-4 border-t aia-border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" aria-live="polite" className="aia-text-muted min-h-6 text-sm">{message}</p>
        <Button type="button" className="min-h-11 rounded-none px-5" onClick={() => void save()} disabled={saving}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />{saving ? "保存中…" : "保存表单"}
        </Button>
      </div>
    </div>
  )
}
