"use client"

import { FormEvent, useMemo, useState } from "react"
import { Plus, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useGenerateOAFormUploadUrl } from "@/lib/api"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import { validateOAFormAnswers } from "@/lib/oa-forms"
import { cn } from "@/lib/utils"
import type { OAFileAnswer, OAForm, OAFormField, OATableColumn } from "@/types"

type Answers = Record<string, unknown>

type OAFormRendererProps = {
  form: OAForm
  initialAnswers?: Answers
  onSubmit: (answers: Answers) => Promise<void>
  submitLabel?: string
  heading?: string
}

const denseTableHeaderClassName =
  "sticky top-0 z-20 h-8 border-r border-slate-300 bg-slate-100 px-2 py-1 text-left align-middle text-xs font-semibold text-slate-700"

const denseTableCellClassName =
  "min-w-[152px] border-r border-slate-200 p-0 align-middle"

const denseTableInputClassName =
  "h-8 rounded-none border-0 bg-transparent px-2 py-1 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"

function asString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function asNumberInput(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : ""
}

function getFileAnswers(value: unknown): OAFileAnswer[] {
  return Array.isArray(value) ? value as OAFileAnswer[] : []
}

function getTableRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : []
}

function emptyTableRow(columns: OATableColumn[]) {
  return Object.fromEntries(columns.map((column) => [column.id, column.type === "number" ? 0 : ""]))
}

function getFieldContainerClassName(field: OAFormField) {
  return field.type === "textarea" || field.type === "file" || field.type === "table" ? "md:col-span-2" : undefined
}

export function OAFormRenderer({ form, initialAnswers, onSubmit, submitLabel = "提交", heading }: OAFormRendererProps) {
  const generateUploadUrl = useGenerateOAFormUploadUrl()
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers || {})
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null)

  const errors = useMemo(() => validateOAFormAnswers(form, answers), [answers, form])

  const updateAnswer = (fieldId: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [fieldId]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    const nextErrors = validateOAFormAnswers(form, answers)
    if (nextErrors.length > 0) {
      setMessage(nextErrors[0])
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(answers)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  const uploadFiles = async (field: OAFormField, files: FileList | null) => {
    if (!files?.length) return
    setUploadingFieldId(field.id)
    setMessage("")
    try {
      const uploaded: OAFileAnswer[] = []
      for (const file of Array.from(files).slice(0, field.maxFiles || 1)) {
        const uploadTarget = await generateUploadUrl({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        })
        const storageId = await uploadFileToStorageTarget(uploadTarget as any, file, `${file.name} 上传失败`)
        uploaded.push({
          storageId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        })
      }
      updateAnswer(field.id, uploaded)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败")
    } finally {
      setUploadingFieldId(null)
    }
  }

  const renderField = (field: OAFormField) => {
    const commonLabel = (
      <div className="space-y-1">
        <Label htmlFor={`oa-field-${field.id}`}>{field.label}{field.required ? <span className="text-red-500"> *</span> : null}</Label>
        {field.helpText ? <p className="text-xs text-slate-500">{field.helpText}</p> : null}
      </div>
    )

    if (field.type === "textarea") {
      return <div className="space-y-2">{commonLabel}<Textarea id={`oa-field-${field.id}`} value={asString(answers[field.id])} placeholder={field.placeholder} onChange={(event) => updateAnswer(field.id, event.target.value)} rows={5} /></div>
    }
    if (field.type === "number") {
      return <div className="space-y-2">{commonLabel}<Input id={`oa-field-${field.id}`} type="number" value={asNumberInput(answers[field.id])} placeholder={field.placeholder} onChange={(event) => updateAnswer(field.id, event.target.value === "" ? undefined : Number(event.target.value))} /></div>
    }
    if (field.type === "date") {
      return <div className="space-y-2">{commonLabel}<Input id={`oa-field-${field.id}`} type="date" value={asString(answers[field.id])} onChange={(event) => updateAnswer(field.id, event.target.value)} /></div>
    }
    if (field.type === "select") {
      return (
        <div className="space-y-2">
          {commonLabel}
          <select id={`oa-field-${field.id}`} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={asString(answers[field.id])} onChange={(event) => updateAnswer(field.id, event.target.value)}>
            <option value="">请选择</option>
            {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      )
    }
    if (field.type === "radio") {
      return (
        <div className="space-y-2">
          {commonLabel}
          <div className="flex flex-wrap gap-3">
            {(field.options || []).map((option) => (
              <label key={option.value} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input type="radio" name={field.id} checked={answers[field.id] === option.value} onChange={() => updateAnswer(field.id, option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )
    }
    if (field.type === "checkbox") {
      const selected = Array.isArray(answers[field.id]) ? answers[field.id] as string[] : []
      return (
        <div className="space-y-2">
          {commonLabel}
          <div className="flex flex-wrap gap-3">
            {(field.options || []).map((option) => (
              <label key={option.value} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(event) => updateAnswer(field.id, event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )
    }
    if (field.type === "file") {
      const files = getFileAnswers(answers[field.id])
      return (
        <div className="space-y-2">
          {commonLabel}
          <Input id={`oa-field-${field.id}`} type="file" multiple={(field.maxFiles || 1) > 1} accept={(field.acceptedMimeTypes || []).join(",")} onChange={(event) => void uploadFiles(field, event.target.files)} />
          <p className="text-xs text-slate-500">最多 {field.maxFiles || 1} 个文件，单个不超过 {field.maxFileSizeMB || 20}MB。</p>
          {uploadingFieldId === field.id ? <p className="text-sm text-slate-600">上传中...</p> : null}
          {files.length > 0 ? <ul className="space-y-1 text-sm text-slate-700">{files.map((file) => <li key={`${file.storageId}-${file.fileName}`} className="flex items-center gap-2"><Upload className="h-3.5 w-3.5" />{file.fileName}</li>)}</ul> : null}
        </div>
      )
    }
    if (field.type === "table") {
      const columns = field.columns || []
      const rows = getTableRows(answers[field.id])
      return (
        <div className="space-y-2">
          {commonLabel}
          <div className="oa-form-dense-table overflow-x-auto rounded-sm border border-slate-300 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className={cn(denseTableHeaderClassName, "sticky left-0 top-0 z-30 w-12 min-w-12 text-center")}>#</th>
                  {columns.map((column) => (
                    <th key={column.id} className={denseTableHeaderClassName}>
                      {column.label}{column.required ? <span className="text-red-500"> *</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="h-8 border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                    <td className="sticky left-0 z-10 w-12 border-r border-slate-300 bg-slate-50 p-0 align-middle">
                      <div className="flex h-8 items-center justify-center gap-1">
                        <span className="w-4 text-center text-[11px] text-slate-500">{rowIndex + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-sm text-slate-400 hover:text-red-600"
                          onClick={() => updateAnswer(field.id, rows.filter((_, index) => index !== rowIndex))}
                          aria-label={`删除${field.label}第 ${rowIndex + 1} 行`}
                          title="删除行"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    {columns.map((column) => (
                      <td key={column.id} className={denseTableCellClassName}>
                        <Input
                          type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
                          value={column.type === "number" ? asNumberInput(row[column.id]) : asString(row[column.id])}
                          className={denseTableInputClassName}
                          aria-label={`${field.label}第 ${rowIndex + 1} 行${column.label}`}
                          onChange={(event) => {
                            const nextValue = column.type === "number" ? (event.target.value === "" ? undefined : Number(event.target.value)) : event.target.value
                            const nextRows = rows.map((item, index) => index === rowIndex ? { ...item, [column.id]: nextValue } : item)
                            updateAnswer(field.id, nextRows)
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm px-2 text-xs" onClick={() => updateAnswer(field.id, [...rows, emptyTableRow(columns)])}><Plus className="mr-1.5 h-3.5 w-3.5" />增加一行</Button>
        </div>
      )
    }
    return <div className="space-y-2">{commonLabel}<Input id={`oa-field-${field.id}`} value={asString(answers[field.id])} placeholder={field.placeholder} onChange={(event) => updateAnswer(field.id, event.target.value)} /></div>
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <Card>
        <CardHeader><CardTitle>{heading || form.title}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {form.description ? <p className="text-sm leading-7 text-slate-600 md:col-span-2">{form.description}</p> : null}
          {form.fields.map((field) => <div key={field.id} className={getFieldContainerClassName(field)}>{renderField(field)}</div>)}
        </CardContent>
      </Card>
      {message ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
      {errors.length > 0 ? <p className="text-xs text-slate-500">当前还有 {errors.length} 项需要补充。</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting || uploadingFieldId !== null}>{submitting ? "提交中..." : submitLabel}</Button>
      </div>
    </form>
  )
}
