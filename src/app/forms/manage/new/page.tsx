"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ManageFormEditor, ManageFormEditorHeader } from "@/app/forms/manage/form-editor"
import { useAuth } from "@/lib/hooks/use-auth"

export default function FormNewPage() {
  const { currentUser, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
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
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">新建表单</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">登录后才能创建表单。</p>
        <Link
          href="/login?next=%2Fforms%2Fmanage%2Fnew"
          className="aia-focus mt-6 inline-block border aia-border-rule px-4 py-2.5 text-sm font-medium tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
        >
          前往登录
        </Link>
      </main>
    )
  }

  const canManageForms = currentUser.identityType === "teacher" || currentUser.role === "super_admin"
  if (!canManageForms) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p className="aia-kicker">教学服务 · 表单</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">新建表单</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">仅教师或超级管理员可以创建表单。</p>
        <Link href="/forms/manage" className="aia-link aia-focus mt-6 inline-block text-sm font-medium">
          <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回表单管理
        </Link>
      </main>
    )
  }

  return (
    <main className="container-custom max-w-4xl py-10 sm:py-12">
      <ManageFormEditorHeader isEdit={false} />
      <ManageFormEditor form={null} currentUserId={String(currentUser._id)} />
    </main>
  )
}
