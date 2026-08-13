"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  useManageOAForms,
  useManageRemoveOAForm,
  useManageSetOAFormPinned,
  useManageSetOAFormStatus,
  useMyContentPermissions,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { oaFormStatusLabels } from "@/lib/oa-forms"
import type { OAForm, OAFormStatus } from "@/types"
import { cn } from "@/lib/utils"

type ManagedForm = OAForm & {
  submissionCount: number
  pendingSubmissionCount: number
  createdByName: string
}

function formatDate(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "—"
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

const actionButtonClass =
  "aia-focus aia-mono text-xs font-medium uppercase tracking-[0.12em] aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))] disabled:cursor-not-allowed disabled:opacity-50"

export default function FormsManagePage() {
  const { currentUser, isLoading, isAuthenticated } = useAuth()
  const contentPermissions = useMyContentPermissions()
  const forms = useManageOAForms() as ManagedForm[] | undefined
  const setStatus = useManageSetOAFormStatus()
  const removeForm = useManageRemoveOAForm()
  const setPinned = useManageSetOAFormPinned()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusyKey(key)
    setMessage(null)
    try {
      await action()
      setMessage(success)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。")
    } finally {
      setBusyKey(null)
    }
  }

  function changeStatus(form: ManagedForm, status: OAFormStatus, success: string) {
    void run(`${form._id}:status`, () => setStatus({ id: form._id, status }), success)
  }

  function destroy(form: ManagedForm) {
    if (!window.confirm(`确定删除「${form.title}」吗？此操作无法撤销。`)) return
    void run(`${form._id}:remove`, () => removeForm({ id: form._id }), `已删除「${form.title}」。`)
  }

  if (isLoading || (isAuthenticated && contentPermissions === undefined)) {
    return (
      <main className="container-custom py-12">
        <p role="status" className="aia-text-muted py-6 text-sm">正在确认登录状态…</p>
      </main>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p className="aia-kicker">教学服务 · 表单</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">表单管理</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">登录后才能管理自己创建的表单。</p>
        <Link
          href="/login?next=%2Fforms%2Fmanage"
          className="aia-focus mt-6 inline-block border aia-border-rule px-4 py-2.5 text-sm font-medium tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
        >
          前往登录
        </Link>
      </main>
    )
  }

  const isSuperAdmin = currentUser.role === "super_admin"
  const isTeacher = currentUser.identityType === "teacher"
  const canCreateReimbursement = contentPermissions?.reimbursement.canCreate === true
  const canManageReimbursement = contentPermissions?.reimbursement.canManage === true

  if (!isTeacher && !isSuperAdmin && !canCreateReimbursement) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p className="aia-kicker">教学服务 · 表单</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">表单管理</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">仅教师、报销表单创建者或超级管理员可以使用表单管理。</p>
        <Link href="/portal" className="aia-link aia-focus mt-6 inline-block text-sm font-medium">
          <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回内网
        </Link>
      </main>
    )
  }

  return (
    <main className="container-custom max-w-4xl py-10 sm:py-12">
      <Link href="/portal" className="aia-link aia-focus text-sm font-medium">
        <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回内网
      </Link>

      <header className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="aia-kicker">{canCreateReimbursement && !isTeacher && !isSuperAdmin ? "OA · 报销表单" : "教学服务 · 表单"}</p>
          <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            {canCreateReimbursement && !isTeacher && !isSuperAdmin ? "我的报销表单" : "表单管理"}
          </h1>
          <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
            {isSuperAdmin
              ? "这里列出研究院的全部表单；你可以置顶重要表单，置顶后会在「OA 与审批」中优先展示。"
              : canCreateReimbursement && !isTeacher
                ? "这里只列出你创建的报销表单。保存草稿后可继续编辑，并在准备完成后发布。"
                : "这里只列出你创建的表单。发布后，可见范围内的研究院成员即可在「OA 与审批」中填写；提交记录随表单实时更新。"}
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href={canCreateReimbursement && !isTeacher && !isSuperAdmin ? "/forms/manage/reimbursements/new" : "/forms/manage/new"}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {canCreateReimbursement && !isTeacher && !isSuperAdmin ? "新建报销表单" : "新建表单"}
          </Link>
        </Button>
      </header>

      {message ? <p role="status" className="aia-text-muted mt-6 text-sm">{message}</p> : null}

      <section aria-label="我的表单" className="mt-10">
        {forms === undefined ? (
          <p role="status" className="aia-text-muted py-6 text-sm">正在加载表单…</p>
        ) : forms.length === 0 ? (
          <p className="aia-text-muted border-t aia-border-rule py-6 text-sm">
            还没有表单，点击「新建表单」开始。
          </p>
        ) : (
          <ul className="border-t aia-border-rule">
            {forms.map((form) => {
              const published = form.status === "published"
              const archived = form.status === "archived"
              const statusBusy = busyKey === `${form._id}:status`
              const removeBusy = busyKey === `${form._id}:remove`
              const pinBusy = busyKey === `${form._id}:pin`
              return (
                <li key={form._id} className="border-b aia-border-rule py-4">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <Link
                      href={`/forms/manage/${form._id}`}
                      className="aia-focus aia-serif text-base font-semibold text-[hsl(var(--aia-ink))] transition-colors hover:text-[hsl(var(--aia-red))]"
                    >
                      {form.title}
                    </Link>
                    <span
                      className={cn(
                        "aia-mono text-xs",
                        published ? "text-[hsl(var(--aia-red))]" : "aia-text-muted",
                      )}
                    >
                      {oaFormStatusLabels[form.status] || form.status}
                    </span>
                  </div>
                  <p className="aia-mono mt-1 text-xs aia-text-muted">
                    {isSuperAdmin ? `${form.createdByName} · ` : ""}
                    {form.fields.length} 个字段 · {form.submissionCount} 份提交
                    {form.pendingSubmissionCount > 0 ? `（${form.pendingSubmissionCount} 待审核）` : ""}
                    {" · 最近更新 "}{formatDate(form.updatedAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        className={actionButtonClass}
                        disabled={pinBusy || statusBusy || removeBusy}
                        onClick={() => void run(
                          `${form._id}:pin`,
                          () => setPinned({ id: form._id, pinned: !form.pinnedAt }),
                          form.pinnedAt ? `已取消置顶「${form.title}」。` : `已置顶「${form.title}」。`,
                        )}
                      >
                        {form.pinnedAt ? "取消置顶" : "置顶"}
                      </button>
                    ) : null}
                    <Link href={`/forms/manage/${form._id}`} className={actionButtonClass}>编辑</Link>
                    <Link href={`/forms/manage/${form._id}/document-template`} className={actionButtonClass}>原格式模板</Link>
                    {form.kind !== "reimbursement" || canManageReimbursement ? (
                      <Link href={`/forms/manage/${form._id}#submissions`} className={actionButtonClass}>提交记录</Link>
                    ) : null}
                    {published ? (
                      <button
                        type="button"
                        className={actionButtonClass}
                        disabled={statusBusy || removeBusy}
                        onClick={() => changeStatus(form, "draft", `已下架「${form.title}」。`)}
                      >
                        下架
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={actionButtonClass}
                        disabled={statusBusy || removeBusy}
                        onClick={() => changeStatus(form, "published", `已发布「${form.title}」。`)}
                      >
                        发布
                      </button>
                    )}
                    {archived ? (
                      <button
                        type="button"
                        className={actionButtonClass}
                        disabled={statusBusy || removeBusy}
                        onClick={() => changeStatus(form, "draft", `已恢复「${form.title}」为草稿。`)}
                      >
                        恢复
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={actionButtonClass}
                        disabled={statusBusy || removeBusy}
                        onClick={() => changeStatus(form, "archived", `已归档「${form.title}」。`)}
                      >
                        归档
                      </button>
                    )}
                    <button
                      type="button"
                      className={cn(actionButtonClass, "hover:text-[hsl(var(--aia-red))]")}
                      disabled={statusBusy || removeBusy}
                      onClick={() => destroy(form)}
                    >
                      {removeBusy ? "删除中…" : "删除"}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
