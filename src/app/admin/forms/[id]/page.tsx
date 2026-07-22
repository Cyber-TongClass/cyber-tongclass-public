"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OAWorkflowEditor } from "@/components/admin/oa-workflow/oa-workflow-editor"
import { OAFormBuilder } from "@/components/oa-forms/oa-form-builder"
import { useAdminOAForm, useAdminUpsertOAForm } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { getOAWorkflowDraftConfig, validateOAWorkflowDraftConfig, type OAWorkflowDraftConfig } from "@/lib/oa-forms"
import type { OAForm } from "@/types"
import { useEffect, useState } from "react"

export default function AdminFormEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const form = useAdminOAForm(params.id) as OAForm | null | undefined
  const upsert = useAdminUpsertOAForm()
  const { isSuperAdmin } = useAuth()
  const [workflow, setWorkflow] = useState<OAWorkflowDraftConfig>({})

  useEffect(() => {
    if (!form) return
    setWorkflow(getOAWorkflowDraftConfig(form as unknown as Record<string, unknown>))
  }, [form])

  if (form === undefined) return <div className="text-gray-500">Loading...</div>
  if (!form) return <Card><CardContent className="py-10 text-center text-sm text-gray-500">表单不存在。</CardContent></Card>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" className="self-start"><Link href="/admin/forms"><ArrowLeft className="mr-2 h-4 w-4" />返回表单列表</Link></Button>
        <Button asChild variant="outline"><Link href={`/admin/forms/${form._id}/submissions`}><Eye className="mr-2 h-4 w-4" />查看提交</Link></Button>
      </div>
      {isSuperAdmin ? <OAWorkflowEditor value={workflow} onChange={setWorkflow} /> : null}
      <OAFormBuilder
        form={form}
        onSave={async (draft) => {
          const legacyDraft = { ...draft }
          delete legacyDraft.targetScope
          delete legacyDraft.approvalSteps
          if (isSuperAdmin) {
            const workflowErrors = validateOAWorkflowDraftConfig(workflow)
            if (workflowErrors.length > 0) throw new Error(workflowErrors[0])
            await upsert({ ...draft, id: form._id, ...workflow })
          } else {
            await upsert({ ...legacyDraft, id: form._id })
          }
          router.refresh()
        }}
      />
    </div>
  )
}
