"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OAFormBuilder } from "@/components/oa-forms/oa-form-builder"
import { useAdminOAForm, useAdminUpsertOAForm } from "@/lib/api"
import type { OAForm } from "@/types"

export default function AdminFormEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const form = useAdminOAForm(params.id) as OAForm | null | undefined
  const upsert = useAdminUpsertOAForm()

  if (form === undefined) return <div className="text-gray-500">Loading...</div>
  if (!form) return <Card><CardContent className="py-10 text-center text-sm text-gray-500">表单不存在。</CardContent></Card>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" className="self-start"><Link href="/admin/forms"><ArrowLeft className="mr-2 h-4 w-4" />返回表单列表</Link></Button>
        <Button asChild variant="outline"><Link href={`/admin/forms/${form._id}/submissions`}><Eye className="mr-2 h-4 w-4" />查看提交</Link></Button>
      </div>
      <OAFormBuilder
        form={form}
        onSave={async (draft) => {
          await upsert({ ...draft, id: form._id })
          router.refresh()
        }}
      />
    </div>
  )
}
