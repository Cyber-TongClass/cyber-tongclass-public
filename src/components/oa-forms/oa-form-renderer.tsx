"use client"

import { FormEvent, useMemo, useState } from "react"
import { Plus, Sparkles, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser, useGenerateOAFormUploadUrl, useStudentFormProfile } from "@/lib/api"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import { validateOAFormAnswers } from "@/lib/oa-forms"
import { buildOAProfileAutofill, getEffectiveOAProfileBinding } from "@/lib/oa-profile-autofill"
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
  "aia-bg-tag sticky top-0 z-20 h-9 border-r aia-border-rule px-2 py-1 text-left align-middle text-xs font-semibold text-[hsl(var(--aia-ink))]"

const denseTableCellClassName =
  "min-w-[152px] border-r aia-border-rule p-0 align-middle"

const denseTableInputClassName =
  "aia-focus h-9 rounded-none border-0 bg-transparent px-2 py-1 text-xs text-[hsl(var(--aia-ink))] focus-visible:ring-0 focus-visible:ring-offset-0"

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
  return Object.fromEntries(columns.map((column) => [column.id, column.type === "number" ? undefined : ""]))
}

function fileTypeAllowed(file: File, acceptedMimeTypes: readonly string[]) {
  if (acceptedMimeTypes.length === 0) return true
  const fileType = file.type.toLowerCase()
  return acceptedMimeTypes.some((candidate) => {
    const accepted = candidate.trim().toLowerCase()
    return accepted.endsWith("/*")
      ? fileType.startsWith(accepted.slice(0, -1))
      : fileType === accepted
  })
}

function getFieldContainerClassName(field: OAFormField) {
  return field.type === "textarea" || field.type === "file" || field.type === "table" ? "md:col-span-2" : undefined
}

export function OAFormRenderer({ form, initialAnswers, onSubmit, submitLabel = "提交", heading }: OAFormRendererProps) {
  const generateUploadUrl = useGenerateOAFormUploadUrl()
  const currentUser = useCurrentUser()
  const studentProfile = useStudentFormProfile()
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers || {})
  const [message, setMessage] = useState("")
  const [autofillMessage, setAutofillMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [touchedFieldIds, setTouchedFieldIds] = useState<Set<string>>(() => new Set())

  const errors = useMemo(() => validateOAFormAnswers(form, answers), [answers, form])
  const hasProfileFields = useMemo(
    () => form.fields.some((field) => getEffectiveOAProfileBinding(field) !== null),
    [form.fields],
  )

  const autofillFromProfile = () => {
    const result = buildOAProfileAutofill(form.fields, {
      name: currentUser?.chineseName || currentUser?.englishName || currentUser?.username,
      chineseName: currentUser?.chineseName,
      englishName: currentUser?.englishName,
      email: currentUser?.email,
      personalEmail: currentUser?.personalEmail || currentUser?.personalEmails?.[0],
      username: currentUser?.username,
      studentId: currentUser?.studentId,
      organization: currentUser?.organization,
      cohort: currentUser?.cohort,
      identityType: currentUser?.identityType,
      gender: studentProfile?.gender,
      phone: studentProfile?.phone,
    }, answers)
    setAnswers(result.answers)
    setTouchedFieldIds((current) => new Set([...current, ...result.filledFieldIds]))
    setAutofillMessage(result.filledFieldIds.length > 0
      ? `已从个人资料填写 ${result.filledFieldIds.length} 个空白项。`
      : "没有可填写的空白项；你已输入的内容不会被覆盖。")
  }

  const updateAnswer = (fieldId: string, value: unknown) => {
    setTouchedFieldIds((current) => new Set(current).add(fieldId))
    setAnswers((current) => ({ ...current, [fieldId]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSubmit(true)
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
    setMessage("")
    const selectedFiles = Array.from(files)
    const existingFiles = getFileAnswers(answers[field.id])
    const maximumFiles = field.maxFiles || 1
    const maximumBytes = (field.maxFileSizeMB || 20) * 1024 * 1024
    const acceptedMimeTypes = field.acceptedMimeTypes || []
    if (existingFiles.length + selectedFiles.length > maximumFiles) {
      setMessage(`${field.label}最多只能上传 ${maximumFiles} 个文件；请先调整已选文件。`)
      return
    }
    const invalidSize = selectedFiles.find((file) => file.size > maximumBytes)
    if (invalidSize) {
      setMessage(`${invalidSize.name} 超过 ${field.maxFileSizeMB || 20}MB，尚未上传。`)
      return
    }
    const invalidType = selectedFiles.find((file) => !fileTypeAllowed(file, acceptedMimeTypes))
    if (invalidType) {
      setMessage(`${invalidType.name} 的文件类型不符合要求，尚未上传。`)
      return
    }
    setUploadingFieldId(field.id)
    try {
      const uploaded: OAFileAnswer[] = []
      for (const file of selectedFiles) {
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
      updateAnswer(field.id, [...existingFiles, ...uploaded])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败")
    } finally {
      setUploadingFieldId(null)
    }
  }

  const renderField = (field: OAFormField) => {
    const fieldId = `oa-field-${field.id}`
    const requiredLabel = field.required ? <><span aria-hidden="true" className="text-[hsl(var(--aia-red))]"> *</span><span className="sr-only">（必填）</span></> : null
    const commonLabel = (
      <div className="space-y-1">
        <Label htmlFor={fieldId}>{field.label}{requiredLabel}</Label>
        {field.helpText ? <p id={`${fieldId}-help`} className="text-xs aia-text-muted">{field.helpText}</p> : null}
      </div>
    )
    const groupLegend = (
      <legend className="text-sm font-medium text-[hsl(var(--aia-ink))]">
        {field.label}{requiredLabel}
      </legend>
    )
    const describedBy = field.helpText ? `${fieldId}-help` : undefined

    if (field.type === "textarea") {
      return <div className="space-y-2">{commonLabel}<Textarea id={fieldId} aria-describedby={describedBy} aria-required={field.required} className="aia-focus rounded-none border aia-border-rule bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" value={asString(answers[field.id])} placeholder={field.placeholder} onChange={(event) => updateAnswer(field.id, event.target.value)} rows={5} /></div>
    }
    if (field.type === "number") {
      return <div className="space-y-2">{commonLabel}<Input id={fieldId} aria-describedby={describedBy} aria-required={field.required} className="aia-focus rounded-none border aia-border-rule bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" type="number" value={asNumberInput(answers[field.id])} placeholder={field.placeholder} onChange={(event) => updateAnswer(field.id, event.target.value === "" ? undefined : Number(event.target.value))} /></div>
    }
    if (field.type === "date") {
      return <div className="space-y-2">{commonLabel}<Input id={fieldId} aria-describedby={describedBy} aria-required={field.required} className="aia-focus rounded-none border aia-border-rule bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" type="date" value={asString(answers[field.id])} onInput={(event) => updateAnswer(field.id, event.currentTarget.value)} onChange={(event) => updateAnswer(field.id, event.target.value)} /></div>
    }
    if (field.type === "select") {
      return (
        <div className="space-y-2">
          {commonLabel}
          <select id={fieldId} aria-describedby={describedBy} aria-required={field.required} className="aia-focus h-11 w-full rounded-none border aia-border-rule bg-transparent px-3 text-sm text-[hsl(var(--aia-ink))]" value={asString(answers[field.id])} onChange={(event) => updateAnswer(field.id, event.target.value)}>
            <option value="">请选择</option>
            {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      )
    }
    if (field.type === "radio") {
      return (
        <fieldset className="space-y-2" aria-describedby={describedBy}>
          {groupLegend}
          {field.helpText ? <p id={`${fieldId}-help`} className="text-xs aia-text-muted">{field.helpText}</p> : null}
          <div className="flex flex-wrap gap-3">
            {(field.options || []).map((option) => (
              <label key={option.value} className="inline-flex min-h-11 items-center gap-2 border aia-border-rule px-3 py-2 text-sm">
                <input type="radio" name={field.id} checked={answers[field.id] === option.value} onChange={() => updateAnswer(field.id, option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )
    }
    if (field.type === "checkbox") {
      const selected = Array.isArray(answers[field.id]) ? answers[field.id] as string[] : []
      return (
        <fieldset className="space-y-2" aria-describedby={describedBy}>
          {groupLegend}
          {field.helpText ? <p id={`${fieldId}-help`} className="text-xs aia-text-muted">{field.helpText}</p> : null}
          <div className="flex flex-wrap gap-3">
            {(field.options || []).map((option) => (
              <label key={option.value} className="inline-flex min-h-11 items-center gap-2 border aia-border-rule px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(event) => updateAnswer(field.id, event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )
    }
    if (field.type === "file") {
      const files = getFileAnswers(answers[field.id])
      return (
        <div className="space-y-2">
          {commonLabel}
          <Input id={fieldId} aria-describedby={`${fieldId}-limits${describedBy ? ` ${describedBy}` : ""}`} aria-required={field.required} className="aia-focus rounded-none border aia-border-rule bg-transparent file:text-[hsl(var(--aia-ink))] focus-visible:ring-0 focus-visible:ring-offset-0" type="file" multiple={(field.maxFiles || 1) > 1} accept={(field.acceptedMimeTypes || []).join(",")} onChange={(event) => void uploadFiles(field, event.target.files)} />
          <p id={`${fieldId}-limits`} className="text-xs aia-text-muted">最多 {field.maxFiles || 1} 个文件，单个不超过 {field.maxFileSizeMB || 20}MB。</p>
          {uploadingFieldId === field.id ? <p role="status" className="text-sm aia-text-muted">上传中...</p> : null}
          {files.length > 0 ? <ul className="space-y-1 text-sm text-[hsl(var(--aia-ink))]">{files.map((file) => <li key={`${file.storageId}-${file.fileName}`} className="flex items-center gap-2"><Upload className="h-3.5 w-3.5" aria-hidden="true" />{file.fileName}</li>)}</ul> : null}
        </div>
      )
    }
    if (field.type === "table") {
      const columns = field.columns || []
      const rows = getTableRows(answers[field.id])
      return (
        <fieldset className="space-y-2" aria-describedby={describedBy}>
          {groupLegend}
          {field.helpText ? <p id={`${fieldId}-help`} className="text-xs aia-text-muted">{field.helpText}</p> : null}
          <div className="oa-form-dense-table overflow-x-auto border aia-border-rule bg-[hsl(var(--aia-paper))]">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b aia-border-rule">
                  <th className={cn(denseTableHeaderClassName, "sticky left-0 top-0 z-30 w-12 min-w-12 text-center")}>#</th>
                  {columns.map((column) => (
                    <th key={column.id} className={denseTableHeaderClassName}>
                      {column.label}{column.required ? <span aria-hidden="true" className="text-[hsl(var(--aia-red))]"> *</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="h-9 border-b aia-border-rule last:border-b-0 hover:bg-[hsl(var(--aia-tag))]">
                    <td className="aia-bg-tag sticky left-0 z-10 w-14 border-r aia-border-rule p-0 align-middle">
                      <div className="flex h-11 items-center justify-center gap-1">
                        <span className="w-4 text-center text-[11px] aia-text-muted">{rowIndex + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="aia-focus min-h-11 min-w-11 rounded-none aia-text-muted hover:text-[hsl(var(--aia-red))]"
                          onClick={() => updateAnswer(field.id, rows.filter((_, index) => index !== rowIndex))}
                          aria-label={`删除${field.label}第 ${rowIndex + 1} 行`}
                          title="删除行"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
          <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-none border aia-border-rule bg-transparent px-3 text-xs" onClick={() => updateAnswer(field.id, [...rows, emptyTableRow(columns)])}><Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />增加一行</Button>
        </fieldset>
      )
    }
    return <div className="space-y-2">{commonLabel}<Input id={fieldId} aria-describedby={describedBy} aria-required={field.required} className="aia-focus rounded-none border aia-border-rule bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" value={asString(answers[field.id])} placeholder={field.placeholder} onChange={(event) => updateAnswer(field.id, event.target.value)} /></div>
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <section aria-labelledby="oa-form-renderer-title" className="border-y aia-border-rule py-7">
        <header className="mb-6 border-b aia-border-rule pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="oa-form-renderer-title" className="aia-serif text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">{heading || form.title}</h2>
              {form.description ? <p className="mt-2 max-w-3xl text-sm leading-7 aia-text-muted">{form.description}</p> : null}
            </div>
            {hasProfileFields ? (
              <div className="shrink-0 text-right">
                <Button type="button" variant="outline" className="min-h-11 rounded-none border aia-border-rule bg-transparent" onClick={autofillFromProfile}>
                  <Sparkles className="mr-2 h-4 w-4 text-[hsl(var(--aia-red))]" aria-hidden="true" />
                  从个人资料填写空白项
                </Button>
                <p className="aia-text-muted mt-1 text-xs">不会覆盖已填写内容</p>
              </div>
            ) : null}
          </div>
          {autofillMessage ? <p role="status" className="mt-3 text-sm text-[hsl(var(--aia-ink))]">{autofillMessage}</p> : null}
        </header>
        <div className="grid gap-5 md:grid-cols-2">
          {form.fields.map((field) => {
            const fieldError = errors.find((error) => error.startsWith(field.label))
            const showFieldError = Boolean(fieldError) && (attemptedSubmit || touchedFieldIds.has(field.id))
            return (
              <div key={field.id} className={getFieldContainerClassName(field)}>
                {renderField(field)}
                {showFieldError ? <p className="mt-1 text-xs text-red-600" role="alert">{fieldError}</p> : null}
              </div>
            )
          })}
        </div>
      </section>
      {message ? <p role="alert" className="border-y aia-border-rule bg-[hsl(var(--aia-tag))] px-4 py-3 text-sm text-[hsl(var(--aia-red-deep))]">{message}</p> : null}
      {attemptedSubmit && errors.length > 0 ? <p className="text-xs aia-text-muted">当前还有 {errors.length} 项需要补充；请检查上方标红字段。</p> : null}
      <div className="flex justify-end">
        <Button className="min-h-11 rounded-none bg-[hsl(var(--aia-red))] px-5 hover:bg-[hsl(var(--aia-red-deep))]" type="submit" disabled={submitting || uploadingFieldId !== null}>{submitting ? "提交中..." : submitLabel}</Button>
      </div>
    </form>
  )
}
