"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { OAFormExportCenter } from "@/components/oa/oa-form-export-center"
import { useManageOAForm } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAForm } from "@/types"

export default function OAFormExportsPage() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading } = useAuth()
  const form = useManageOAForm(isAuthenticated ? params.id : null) as OAForm | null | undefined
  if (isLoading || (isAuthenticated && form === undefined)) return <main className="container-custom py-12"><p role="status" className="aia-text-muted">正在加载导出中心…</p></main>
  if (!isAuthenticated) return <main className="container-custom py-12"><Link className="aia-link" href={`/login?next=${encodeURIComponent(`/forms/manage/${params.id}/exports`)}`}>登录后进入导出中心</Link></main>
  if (!form) return <main className="container-custom py-12"><p className="aia-text-muted">表单不存在，或你没有管理和导出权限。</p></main>
  return (
    <main className="container-custom max-w-6xl py-10 sm:py-12">
      <Link href="/forms/manage" className="aia-link aia-focus text-sm"><ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回表单管理</Link>
      <header className="mt-8 border-b aia-border-rule pb-6">
        <p className="aia-kicker">EXPORT CENTER</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold">{form.title} · 导出</h1>
        <p className="aia-text-muted mt-2 text-sm">下载单份申请、批量材料包，或按字段生成 Excel / CSV 汇总。</p>
      </header>
      <OAFormExportCenter form={form} />
    </main>
  )
}
