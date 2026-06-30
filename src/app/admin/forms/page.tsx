"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, FilePlus2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createDefaultOAFormDraft, normalizeFormSlug, oaFormStatusLabels } from "@/lib/oa-forms"
import { useAdminOAForms, useAdminRemoveOAForm, useAdminSetOAFormStatus, useAdminUpsertOAForm } from "@/lib/api"
import type { OAForm, OAFormStatus } from "@/types"
import { useState } from "react"
import type { ReactNode } from "react"

const statusClassNames: Record<OAFormStatus, string> = {
  draft: "text-amber-700",
  published: "text-emerald-700",
  archived: "text-slate-500",
}

const actionClassNames = {
  edit: "text-slate-700 hover:text-slate-950",
  submissions: "text-blue-700 hover:text-blue-900",
  copy: "text-indigo-700 hover:text-indigo-900",
  publish: "text-emerald-700 hover:text-emerald-900",
  unpublish: "text-amber-700 hover:text-amber-900",
  archive: "text-purple-700 hover:text-purple-900",
  unarchive: "text-cyan-700 hover:text-cyan-900",
  delete: "text-red-600 hover:text-red-800",
} as const

const actionTextClassName = "font-bold underline-offset-4 transition-colors hover:underline"
const formTableColumnCount = 6

function formatTime(value?: number) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function uniqueSuffix() {
  return Date.now().toString(36)
}

function StatusText({ status }: { status: OAFormStatus }) {
  return <span className={`font-bold ${statusClassNames[status]}`}>{oaFormStatusLabels[status]}</span>
}

function TextAction({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className: string
  onClick: () => void
}) {
  return (
    <button type="button" className={`${actionTextClassName} ${className}`} onClick={onClick}>
      {children}
    </button>
  )
}

function FormsTableSection({
  title,
  emptyText,
  forms,
  isLoading,
  onDuplicate,
  onRemove,
  onUpdateStatus,
}: {
  title: string
  emptyText: string
  forms: OAForm[]
  isLoading: boolean
  onDuplicate: (form: OAForm) => void
  onRemove: (form: OAForm) => void
  onUpdateStatus: (form: OAForm, status: OAFormStatus) => void
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>Slug</TableHead><TableHead>分类</TableHead><TableHead>状态</TableHead><TableHead>更新时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={formTableColumnCount} className="text-center text-gray-500">Loading...</TableCell></TableRow>
            ) : forms.length === 0 ? (
              <TableRow><TableCell colSpan={formTableColumnCount} className="text-center text-gray-500">{emptyText}</TableCell></TableRow>
            ) : forms.map((form) => (
              <TableRow key={form._id}>
                <TableCell className="font-medium">{form.title}</TableCell>
                <TableCell>{form.slug}</TableCell>
                <TableCell>{form.category}</TableCell>
                <TableCell><StatusText status={form.status} /></TableCell>
                <TableCell>{formatTime(form.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
                    {form.status === "archived" ? (
                      <TextAction className={actionClassNames.unarchive} onClick={() => onUpdateStatus(form, "draft")}>取消归档</TextAction>
                    ) : (
                      <>
                        <Link className={`${actionTextClassName} ${actionClassNames.edit}`} href={`/admin/forms/${form._id}`}>编辑</Link>
                        <Link className={`${actionTextClassName} ${actionClassNames.submissions}`} href={`/admin/forms/${form._id}/submissions`}>提交</Link>
                        <TextAction className={actionClassNames.copy} onClick={() => onDuplicate(form)}>复制</TextAction>
                        {form.status === "published" ? (
                          <>
                            <TextAction className={actionClassNames.unpublish} onClick={() => onUpdateStatus(form, "draft")}>取消发布</TextAction>
                            <TextAction className={actionClassNames.archive} onClick={() => onUpdateStatus(form, "archived")}>归档</TextAction>
                          </>
                        ) : (
                          <TextAction className={actionClassNames.publish} onClick={() => onUpdateStatus(form, "published")}>发布</TextAction>
                        )}
                        <TextAction className={actionClassNames.delete} onClick={() => onRemove(form)}>删除</TextAction>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function AdminFormsPage() {
  const router = useRouter()
  const forms = useAdminOAForms({ kind: "form" }) as OAForm[] | undefined
  const upsert = useAdminUpsertOAForm()
  const setStatus = useAdminSetOAFormStatus()
  const removeForm = useAdminRemoveOAForm()
  const [message, setMessage] = useState("")
  const activeForms = forms?.filter((form) => form.status !== "archived") || []
  const archivedForms = forms?.filter((form) => form.status === "archived") || []

  const createForm = async () => {
    setMessage("")
    try {
      const suffix = uniqueSuffix()
      const id = await upsert({ ...createDefaultOAFormDraft(`新建 OA 表单 ${suffix}`), kind: "form", slug: `oa-form-${suffix}` })
      router.push(`/admin/forms/${id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败")
    }
  }

  const duplicateForm = async (form: OAForm) => {
    setMessage("")
    try {
      const suffix = uniqueSuffix()
      const id = await upsert({
        title: `${form.title} 副本`,
        slug: `${normalizeFormSlug(form.slug)}-${suffix}`,
        description: form.description,
        category: form.category,
        kind: "form",
        visibility: form.visibility,
        status: "draft",
        allowMultipleSubmissions: form.allowMultipleSubmissions,
        fields: form.fields,
        resultFields: form.resultFields || [],
        resultsVisible: form.resultsVisible,
      })
      router.push(`/admin/forms/${id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复制失败")
    }
  }

  const updateStatus = async (form: OAForm, status: OAForm["status"]) => {
    setMessage("")
    if (status === "archived" && form.status !== "published") {
      setMessage("只有已发布表单可以归档")
      return
    }
    try {
      await setStatus({ id: form._id, status })
      setMessage("状态已更新")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败")
    }
  }

  const remove = async (form: OAForm) => {
    if (!window.confirm(`确定删除“${form.title}”？已有提交的表单不能删除。`)) return
    setMessage("")
    try {
      await removeForm({ id: form._id })
      setMessage("表单已删除")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">OA 表单</h1>
          <p className="mt-1 text-gray-500">像问卷星一样配置、发布和审核通班内部填报。</p>
        </div>
        <Button type="button" onClick={() => void createForm()}><FilePlus2 className="mr-2 h-4 w-4" />新建表单</Button>
      </div>
      {message ? <p className="rounded-md border bg-white px-4 py-3 text-sm text-slate-600">{message}</p> : null}

      <FormsTableSection
        title="表单列表"
        emptyText="暂无可操作表单"
        forms={activeForms}
        isLoading={forms === undefined}
        onDuplicate={(form) => void duplicateForm(form)}
        onRemove={(form) => void remove(form)}
        onUpdateStatus={(form, status) => void updateStatus(form, status)}
      />

      <FormsTableSection
        title="已归档表单"
        emptyText="暂无已归档表单"
        forms={archivedForms}
        isLoading={forms === undefined}
        onDuplicate={(form) => void duplicateForm(form)}
        onRemove={(form) => void remove(form)}
        onUpdateStatus={(form, status) => void updateStatus(form, status)}
      />
    </div>
  )
}
