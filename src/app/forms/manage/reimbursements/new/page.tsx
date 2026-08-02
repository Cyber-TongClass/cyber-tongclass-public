"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

import { OaScopePicker } from "@/components/oa/oa-scope-picker"
import { OAWorkflowEditor } from "@/components/oa/oa-workflow-editor"
import { OAFormBuilder } from "@/components/oa-forms/oa-form-builder"
import {
  useEditorVisibleOAForms,
  useManageUpsertOAForm,
  useMyContentPermissions,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  createDefaultReimbursementFormDraft,
  hasOAUserScopeRecipients,
  type OAUserScope,
  type OAWorkflowDraftConfig,
} from "@/lib/oa-forms"

type PermissionsWithReimbursement = {
  reimbursement?: {
    canCreate: boolean
    canManage: boolean
  }
}

const DEFAULT_REIMBURSEMENT_WORKFLOW: OAWorkflowDraftConfig = {
  workflowDefinition: {
    version: 2,
    nodes: [
      {
        id: "create_reimbursement",
        type: "create_form",
        title: "创建报销申请",
      },
      {
        id: "review_reimbursement",
        type: "batch_approval",
        title: "报销审核",
        // Reviewers are resolved server-side from the explicit reimbursement
        // permission list. Keeping this empty avoids previewing every
        // super-administrator as if they had been granted review rights.
        scope: {},
        completion: "any",
      },
    ],
  },
}

function createUniqueReimbursementDraft() {
  const suffix = Date.now().toString(36)
  return {
    ...createDefaultReimbursementFormDraft(`未命名报销申请 ${suffix}`),
    slug: `reimbursement-${suffix}`,
    kind: "reimbursement" as const,
  }
}

export default function NewReimbursementFormPage() {
  const router = useRouter()
  const { currentUser, isAuthenticated, isLoading } = useAuth()
  const permissions = useMyContentPermissions() as PermissionsWithReimbursement | undefined
  const editorVisibleForms = useEditorVisibleOAForms()
  const upsert = useManageUpsertOAForm()
  const [scope, setScope] = useState<OAUserScope>({})
  const [workflowConfig, setWorkflowConfig] = useState<OAWorkflowDraftConfig>(
    DEFAULT_REIMBURSEMENT_WORKFLOW,
  )
  const [defaultDraft] = useState(() => createUniqueReimbursementDraft())
  const canCreate = permissions?.reimbursement?.canCreate === true

  async function save(draft: Record<string, unknown>) {
    if (!hasOAUserScopeRecipients(scope)) {
      throw new Error("请先设置报销表单可见范围（至少选择一个条件）。")
    }
    await upsert({
      ...draft,
      kind: "reimbursement",
      targetScope: scope,
      workflowDefinition: workflowConfig.workflowDefinition,
    })
    // `canCreate` is intentionally independent from the teacher/super-admin
    // form-management surface. Return every authorized creator to a route they
    // can access rather than leaking them into `/forms/manage`.
    router.push("/services/oa/reimbursements")
  }

  if (isLoading || (isAuthenticated && permissions === undefined)) {
    return (
      <main className="container-custom py-12">
        <p role="status" className="aia-text-muted py-6 text-sm">正在确认报销表单创建权限…</p>
      </main>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p className="aia-kicker">OA · 报销</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">创建报销表单</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">登录后才能继续。</p>
        <Link
          href="/login?next=%2Fforms%2Fmanage%2Freimbursements%2Fnew"
          className="aia-focus mt-6 inline-block border aia-border-rule px-4 py-2.5 text-sm font-medium text-[hsl(var(--aia-ink))]"
        >
          前往登录
        </Link>
      </main>
    )
  }

  if (!canCreate) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <Link href="/services/oa/reimbursements" className="aia-link aia-focus inline-flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回报销
        </Link>
        <p className="aia-kicker mt-8">OA · 报销</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">创建报销表单</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">
          当前账户没有创建报销表单的权限。权限由超级管理员在平台权限管理中单独授予。
        </p>
      </main>
    )
  }

  return (
    <main className="container-custom max-w-6xl py-10 sm:py-12">
      <Link href="/services/oa/reimbursements" className="aia-link aia-focus inline-flex items-center gap-1 text-sm font-medium">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回报销
      </Link>

      <header className="mt-8">
        <p className="aia-kicker">OA · 报销表单</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">创建报销表单</h1>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          先设定可见范围，再配置报销字段和审批流程。保存后为草稿，需要发布后才会出现在报销办理台。
        </p>
      </header>

      <section aria-labelledby="reimbursement-scope-title" className="mt-10 border-t aia-border-rule pt-8">
        <h2 id="reimbursement-scope-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
          可见范围
        </h2>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          只有选定范围内的成员可以看到并填写这个报销表单。
        </p>
        <div className="mt-5">
          <OaScopePicker
            scope={scope}
            onChange={setScope}
            idPrefix="reimbursement-form-scope"
            allowEmpty={false}
            includeEveryoneOption
          />
        </div>
      </section>

      <section aria-labelledby="reimbursement-workflow-title" className="mt-10 border-t aia-border-rule pt-8">
        <p className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">02 · Review route</p>
        <h2 id="reimbursement-workflow-title" className="aia-serif mt-2 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
          审批流程
        </h2>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          表单发布与每次审批时，后端都会严格按照平台权限管理中的「报销审核与管理权」
          名单解析审核人；超级管理员也不会自动加入。
        </p>
        <div className="mt-5">
          <OAWorkflowEditor
            value={workflowConfig}
            onChange={setWorkflowConfig}
            formCandidates={(editorVisibleForms || []).map((candidate) => ({
              id: candidate.id,
              title: candidate.title,
              status: candidate.status,
              searchTerms: [candidate.kind === "reimbursement" ? "报销" : "表单"],
            }))}
          />
        </div>
      </section>

      <section aria-label="报销表单内容" className="mt-10 border-t aia-border-rule pt-8">
        <p className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">03 · Form fields</p>
        <h2 className="aia-serif mt-2 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">表单内容</h2>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          默认字段适合报销明细和票据收集；可按具体事项调整字段与结果展示。
        </p>
        <div className="mt-5">
          <OAFormBuilder form={defaultDraft} onSave={save} />
        </div>
      </section>
    </main>
  )
}
