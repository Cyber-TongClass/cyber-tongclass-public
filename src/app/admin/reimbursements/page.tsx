"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, Copy, Eye, FilePlus2, Settings, TableProperties, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createDefaultReimbursementFormDraft, normalizeFormSlug, oaFormStatusLabels } from "@/lib/oa-forms"
import { useAdminOAForms, useAdminRemoveOAForm, useAdminSetOAFormStatus, useAdminUpsertOAForm } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAForm } from "@/types"
import { useState } from "react"

function formatTime(value?: number) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function uniqueSuffix() {
  return Date.now().toString(36)
}

export default function AdminReimbursementsPage() {
  const router = useRouter()
  const { isSuperAdmin } = useAuth()
  const forms = useAdminOAForms({ kind: "reimbursement" }) as OAForm[] | undefined
  const upsert = useAdminUpsertOAForm()
  const setStatus = useAdminSetOAFormStatus()
  const removeForm = useAdminRemoveOAForm()
  const [message, setMessage] = useState("")

  const createForm = async () => {
    setMessage("")
    try {
      const suffix = uniqueSuffix()
      const id = await upsert({ ...createDefaultReimbursementFormDraft(`新建报销申请 ${suffix}`), slug: `reimbursement-${suffix}` })
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
        kind: "reimbursement",
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
    try {
      await setStatus({ id: form._id, status })
      setMessage("状态已更新")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败")
    }
  }

  const remove = async (form: OAForm) => {
    if (!window.confirm(`确定删除报销模板“${form.title}”？已有提交的报销模板不能删除。`)) return
    setMessage("")
    try {
      await removeForm({ id: form._id })
      setMessage("报销模板已删除")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">报销管理</h1>
          <p className="mt-1 text-gray-500">报销模板基于 OA 表单，但拥有独立入口、默认报销字段和补材料审核流程。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin ? (
            <Button asChild variant="outline"><Link href="/admin/reimbursements/academic-exchange"><Eye className="mr-2 h-4 w-4" />学术交流支持申请</Link></Button>
          ) : null}
          <Button asChild variant="outline"><Link href="/admin/reimbursements/tables"><TableProperties className="mr-2 h-4 w-4" />报销标准表格</Link></Button>
          <Button type="button" onClick={() => void createForm()}><FilePlus2 className="mr-2 h-4 w-4" />新建报销模板</Button>
        </div>
      </div>
      {message ? <p className="rounded-md border bg-white px-4 py-3 text-sm text-slate-600">{message}</p> : null}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />报销模板</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>Slug</TableHead><TableHead>状态</TableHead><TableHead>更新时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {forms === undefined ? <TableRow><TableCell colSpan={5} className="text-center text-gray-500">Loading...</TableCell></TableRow> : forms.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-gray-500">暂无报销模板</TableCell></TableRow> : forms.map((form) => (
                <TableRow key={form._id}>
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell>{form.slug}</TableCell>
                  <TableCell>{oaFormStatusLabels[form.status]}</TableCell>
                  <TableCell>{formatTime(form.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button asChild variant="outline" size="sm"><Link href={`/admin/forms/${form._id}`}><Settings className="mr-2 h-4 w-4" />编辑模板</Link></Button>
                      <Button asChild variant="outline" size="sm"><Link href={`/admin/forms/${form._id}/submissions`}><Eye className="mr-2 h-4 w-4" />审核提交</Link></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void duplicateForm(form)}><Copy className="mr-2 h-4 w-4" />复制</Button>
                      {form.status === "published" ? <Button type="button" variant="outline" size="sm" onClick={() => void updateStatus(form, "draft")}>取消发布</Button> : <Button type="button" variant="outline" size="sm" onClick={() => void updateStatus(form, "published")}>发布</Button>}
                      <Button type="button" variant="destructive" size="sm" onClick={() => void remove(form)}><Trash2 className="mr-2 h-4 w-4" />删除</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
