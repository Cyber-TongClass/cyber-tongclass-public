"use client"

import { useMemo, useState } from "react"
import { Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createDefaultOAFormDraft, createFieldFromPalette, fieldTypeLabels, normalizeFormSlug, toOAFormUpsertPayload, validateOAFormDraftForSave } from "@/lib/oa-forms"
import type { OAFieldType, OAForm, OAFormField, OAFormOption, OAFormStatus, OAResultField, OATableColumn } from "@/types"

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

function FieldDetailEditor({ field, index, updateField }: FieldDetailEditorProps) {
  return (
    <div className="grid gap-3 border-t bg-slate-50/70 p-4 md:grid-cols-4">
      <div className="space-y-2 md:col-span-2">
        <Label>名称</Label>
        <Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>类型</Label>
        <select className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={field.type} onChange={(event) => updateField(index, createFieldFromPalette(event.target.value as OAFieldType, field.label))}>
          {fieldTypes.map((type) => <option key={type} value={type}>{fieldTypeLabels[type]}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <label className="mb-2 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} />必填</label>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>提示文字</Label>
        <Input value={field.placeholder || ""} onChange={(event) => updateField(index, { placeholder: event.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>帮助说明</Label>
        <Input value={field.helpText || ""} onChange={(event) => updateField(index, { helpText: event.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>字段 ID（高级）</Label>
        <Input value={field.id} onChange={(event) => updateField(index, { id: event.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} />
        <p className="text-xs text-slate-500">默认隐藏，仅用于导出、批量导入和系统识别。</p>
      </div>
      {["select", "radio", "checkbox"].includes(field.type) ? (
        <div className="space-y-2 md:col-span-4">
          <Label>选项（每行 label=value）</Label>
          <Textarea value={optionsToText(field.options)} onChange={(event) => updateField(index, { options: textToOptions(event.target.value) })} rows={4} />
        </div>
      ) : null}
      {field.type === "file" ? (
        <>
          <div className="space-y-2 md:col-span-2">
            <Label>允许 MIME 类型（逗号分隔）</Label>
            <Input value={(field.acceptedMimeTypes || []).join(",")} onChange={(event) => updateField(index, { acceptedMimeTypes: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
          </div>
          <div className="space-y-2">
            <Label>最多文件数</Label>
            <Input type="number" min={1} value={field.maxFiles || 1} onChange={(event) => updateField(index, { maxFiles: Number(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>单文件 MB</Label>
            <Input type="number" min={1} value={field.maxFileSizeMB || 20} onChange={(event) => updateField(index, { maxFileSizeMB: Number(event.target.value) })} />
          </div>
        </>
      ) : null}
      {field.type === "table" ? (
        <div className="space-y-2 md:col-span-4">
          <Label>表格列（每行 id,label,type,required）</Label>
          <Textarea value={columnsToText(field.columns)} onChange={(event) => updateField(index, { columns: textToColumns(event.target.value) })} rows={4} />
        </div>
      ) : null}
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
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>表单基本信息</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input value={draft.title || ""} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value, slug: current.slug === "form" ? normalizeFormSlug(event.target.value) : current.slug }))} />
          </div>
          <div className="space-y-2">
            <Label>分类</Label>
            <Input value={draft.category ?? ""} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="例如：奖学金、报销、活动报名" />
            <p className="text-xs text-slate-500">分类不能为空；删除后不会自动回填。</p>
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <select className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={draft.status || "draft"} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as OAForm["status"] }))}>
              <option value="draft">草稿</option>
              <option value="published">发布</option>
              <option value="archived">归档</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>每人最多提交次数</Label>
            <Input type="number" min={1} value={draft.maxSubmissionsPerUser ?? ""} onChange={(event) => setDraft((current) => ({ ...current, maxSubmissionsPerUser: event.target.value === "" ? undefined : Number(event.target.value) }))} placeholder="留空表示不限" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>说明</Label>
            <Textarea value={draft.description || ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={4} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={Boolean(draft.allowSubmissionEdits)} onChange={(event) => setDraft((current) => ({ ...current, allowSubmissionEdits: event.target.checked }))} />
            允许申请人在开放期内修改提交内容
          </label>
          <div className="text-xs text-slate-500 md:text-right">系统链接：/intranet/forms/{draft.slug || "form"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>字段组件</CardTitle>
            <div className="flex flex-wrap gap-2">
              {fieldTypes.map((type) => <Button key={type} type="button" variant="outline" size="sm" onClick={() => addField(type)}><Plus className="mr-1 h-3.5 w-3.5" />{fieldTypeLabels[type]}</Button>)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-white">
            {(draft.fields || []).map((field, index) => {
              const expanded = expandedIndex === index
              return (
                <div key={`${field.id}-${index}`} className="border-b last:border-b-0">
                  <div className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_160px_110px_220px] md:items-center">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-950">{field.label || "未命名字段"}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{field.required ? "必填" : "选填"}</div>
                    </div>
                    <div className="text-slate-600">{fieldTypeLabels[field.type]}</div>
                    <div className="text-xs text-slate-400">#{index + 1}</div>
                    <div className="flex flex-wrap justify-start gap-3 md:justify-end">
                      <button type="button" className="text-primary hover:underline disabled:text-slate-300 disabled:no-underline" disabled={index === 0} onClick={() => moveField(index, -1)}>上移</button>
                      <button type="button" className="text-primary hover:underline disabled:text-slate-300 disabled:no-underline" disabled={index === draft.fields.length - 1} onClick={() => moveField(index, 1)}>下移</button>
                      <button type="button" className="text-primary hover:underline" onClick={() => setExpandedIndex(expanded ? null : index)}>{expanded ? "收起" : "编辑"}</button>
                      <button type="button" className="text-red-600 hover:underline" onClick={() => removeField(index)}>删除</button>
                    </div>
                  </div>
                  {expanded ? <FieldDetailEditor field={field} index={index} updateField={updateField} /> : null}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {message ? <p className="rounded-md border bg-white px-4 py-3 text-sm text-slate-600">{message}</p> : null}
      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "保存中..." : "保存表单"}</Button>
      </div>
    </div>
  )
}
