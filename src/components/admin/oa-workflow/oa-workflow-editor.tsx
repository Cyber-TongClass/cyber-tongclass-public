"use client"

import { ArrowDown, ArrowUp, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useResearchGroupScopeOptions } from "@/lib/api"
import {
  createOAApprovalStep,
  hasOAUserScopeRecipients,
  normalizeOAUserScope,
  type OAApprovalCompletion,
  type OAApprovalStep,
  type OAIdentityType,
  type OAUserScope,
  type OAWorkflowDraftConfig,
  type OAWorkflowRole,
} from "@/lib/oa-forms"

const identityOptions: Array<{ value: OAIdentityType; label: string; description: string }> = [
  { value: "undergrad", label: "本科生", description: "研究院本科生账号" },
  { value: "graduate", label: "研究生", description: "硕博研究生账号" },
  { value: "teacher", label: "教师", description: "教师账号" },
  { value: "other", label: "其他成员", description: "其他已登记身份" },
]

const roleOptions: Array<{ value: OAWorkflowRole; label: string; description: string }> = [
  { value: "admin", label: "管理员", description: "管理员角色" },
  { value: "super_admin", label: "超级管理员", description: "超级管理员角色" },
]

type ScopeEditorProps = {
  scope: OAUserScope
  onChange: (scope: OAUserScope) => void
  idPrefix: string
  description: string
}

function ScopeEditor({ scope, onChange, idPrefix, description }: ScopeEditorProps) {
  const researchGroups = useResearchGroupScopeOptions() as Array<{ id: string; name: string }> | undefined
  const updateIdentityType = (identityType: OAIdentityType) => {
    const current = scope.identityTypes || []
    const identityTypes = current.includes(identityType)
      ? current.filter((item) => item !== identityType)
      : [...current, identityType]
    onChange(normalizeOAUserScope({ ...scope, identityTypes }) || {})
  }

  const updateRole = (role: OAWorkflowRole) => {
    const current = scope.roles || []
    const roles = current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role]
    onChange(normalizeOAUserScope({ ...scope, roles }) || {})
  }

  const updateUserIds = (value: string) => {
    const userIds = value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
    onChange(normalizeOAUserScope({ ...scope, userIds }) || {})
  }

  const updateResearchGroup = (researchGroupId: string) => {
    const current = scope.researchGroupIds || []
    const researchGroupIds = current.includes(researchGroupId)
      ? current.filter((item) => item !== researchGroupId)
      : [...current, researchGroupId]
    onChange(normalizeOAUserScope({ ...scope, researchGroupIds }) || {})
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm text-slate-600">{description}</p>
      <div className="space-y-2">
        <Label>按身份组</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {identityOptions.map((option) => {
            const id = `${idPrefix}-identity-${option.value}`
            return (
              <label key={option.value} htmlFor={id} className="flex cursor-pointer items-start gap-2 rounded-md border bg-white p-3 text-sm text-slate-700 transition-colors hover:border-primary/50">
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(scope.identityTypes?.includes(option.value))}
                  onChange={() => updateIdentityType(option.value)}
                  className="mt-0.5"
                />
                <span><span className="block font-medium text-slate-900">{option.label}</span><span className="text-xs text-slate-500">{option.description}</span></span>
              </label>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label>按管理角色</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {roleOptions.map((option) => {
            const id = `${idPrefix}-role-${option.value}`
            return (
              <label key={option.value} htmlFor={id} className="flex cursor-pointer items-start gap-2 rounded-md border bg-white p-3 text-sm text-slate-700 transition-colors hover:border-primary/50">
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(scope.roles?.includes(option.value))}
                  onChange={() => updateRole(option.value)}
                  className="mt-0.5"
                />
                <span><span className="block font-medium text-slate-900">{option.label}</span><span className="text-xs text-slate-500">{option.description}</span></span>
              </label>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label>按课题组</Label>
        {researchGroups === undefined ? <p className="text-xs text-slate-500">正在加载可选课题组…</p> : researchGroups.length === 0 ? <p className="text-xs text-slate-500">暂无可选课题组。</p> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {researchGroups.map((group) => {
              const id = `${idPrefix}-research-group-${group.id}`
              return <label key={group.id} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md border bg-white p-3 text-sm text-slate-700"><input id={id} type="checkbox" checked={Boolean(scope.researchGroupIds?.includes(group.id))} onChange={() => updateResearchGroup(group.id)} /><span>{group.name}</span></label>
            })}
          </div>
        )}
        <p className="text-xs text-slate-500">课题组归属不对学生公开展示；选择后会由服务端按当前归属解析范围。</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-user-ids`}>指定用户 ID（可选）</Label>
        <Textarea
          id={`${idPrefix}-user-ids`}
          value={(scope.userIds || []).join("\n")}
          onChange={(event) => updateUserIds(event.target.value)}
          placeholder="每行一个用户 ID；可与身份组或角色组合"
          rows={3}
        />
        <p className="text-xs text-slate-500">任一条件匹配即可纳入该范围。指定用户 ID 仅用于需要精确配置的少数账号。</p>
      </div>
    </div>
  )
}

type ApprovalStepEditorProps = {
  step: OAApprovalStep
  index: number
  total: number
  onChange: (step: OAApprovalStep) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

function ApprovalStepEditor({ step, index, total, onChange, onMove, onRemove }: ApprovalStepEditorProps) {
  const idPrefix = `oa-approval-step-${step.id}`
  const completion = step.completion as OAApprovalCompletion

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">第 {index + 1} 步</p>
          <p className="text-xs text-slate-500">按照当前顺序依次推进；只有当前步骤完成后才会通知下一步。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="mr-1 h-3.5 w-3.5" />上移</Button>
          <Button type="button" variant="outline" size="sm" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="mr-1 h-3.5 w-3.5" />下移</Button>
          <Button type="button" variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={onRemove}><Trash2 className="mr-1 h-3.5 w-3.5" />删除</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>步骤名称</Label>
          <Input id={`${idPrefix}-title`} value={step.title} onChange={(event) => onChange({ ...step, title: event.target.value })} placeholder="例如：行政初审" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-completion`}>完成条件</Label>
          <select
            id={`${idPrefix}-completion`}
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={completion}
            onChange={(event) => onChange({ ...step, completion: event.target.value === "all" ? "all" : "any" })}
          >
            <option value="any">任意一人完成即可</option>
            <option value="all">范围内所有人完成</option>
          </select>
        </div>
      </div>
      <ScopeEditor
        scope={step.scope}
        onChange={(scope) => onChange({ ...step, scope })}
        idPrefix={idPrefix}
        description="为该步骤选择审批对象。每个审批步骤至少要选择一个身份组、角色或指定用户。"
      />
      {!hasOAUserScopeRecipients(step.scope) ? <p className="text-sm text-amber-700">请至少选择一个审批对象，保存前会再次校验。</p> : null}
    </div>
  )
}

type OAWorkflowEditorProps = {
  value: OAWorkflowDraftConfig
  onChange: (next: OAWorkflowDraftConfig) => void
}

export function OAWorkflowEditor({ value, onChange }: OAWorkflowEditorProps) {
  const scopeEnabled = value.targetScope !== undefined && value.targetScope !== null
  const approvalSteps = value.approvalSteps || []

  const setScopeEnabled = (enabled: boolean) => {
    onChange({ ...value, targetScope: enabled ? {} : null })
  }

  const updateApprovalStep = (index: number, nextStep: OAApprovalStep) => {
    onChange({
      ...value,
      approvalSteps: approvalSteps.map((step, stepIndex) => stepIndex === index ? nextStep : step),
    })
  }

  const moveApprovalStep = (index: number, direction: -1 | 1) => {
    const destination = index + direction
    if (destination < 0 || destination >= approvalSteps.length) return
    const nextSteps = [...approvalSteps]
    const [step] = nextSteps.splice(index, 1)
    nextSteps.splice(destination, 0, step)
    onChange({ ...value, approvalSteps: nextSteps })
  }

  const removeApprovalStep = (index: number) => {
    onChange({ ...value, approvalSteps: approvalSteps.filter((_, stepIndex) => stepIndex !== index) })
  }

  const addApprovalStep = () => {
    onChange({ ...value, approvalSteps: [...approvalSteps, createOAApprovalStep(approvalSteps.length)] })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />研究院提交范围与审批流程</CardTitle>
        <p className="text-sm font-normal text-slate-500">此处只配置研究院 OA 的对象与顺序；不配置时，原有通班表单行为保持不变。修改后请点击页面底部“保存表单”。</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-4">
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-950">可提交对象</h3>
              <p className="mt-1 text-sm text-slate-500">启用后将改用研究院身份范围。未启用时，保持原通班成员权限。</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={scopeEnabled} onChange={(event) => setScopeEnabled(event.target.checked)} />
              按研究院范围配置
            </label>
          </div>
          {scopeEnabled ? (
            <ScopeEditor
              scope={value.targetScope || {}}
              onChange={(targetScope) => onChange({ ...value, targetScope })}
              idPrefix="oa-submitter-scope"
              description="选择可提交该表单的研究院对象；如果不勾选任何条件，则所有已登录的研究院账号都可以提交。"
            />
          ) : null}
        </section>

        <section className="space-y-4 border-t pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-950">审批步骤</h3>
              <p className="mt-1 text-sm text-slate-500">可设置多级审批。未配置步骤时，继续使用原有的管理员单级审核。</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addApprovalStep}><Plus className="mr-1 h-4 w-4" />添加审批步骤</Button>
          </div>
          {approvalSteps.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-slate-500">尚未配置审批步骤；发布后会保持原有审核方式。</div>
          ) : (
            <div className="space-y-3">
              {approvalSteps.map((step, index) => (
                <ApprovalStepEditor
                  key={step.id}
                  step={step}
                  index={index}
                  total={approvalSteps.length}
                  onChange={(nextStep) => updateApprovalStep(index, nextStep)}
                  onMove={(direction) => moveApprovalStep(index, direction)}
                  onRemove={() => removeApprovalStep(index)}
                />
              ))}
            </div>
          )}
          {scopeEnabled || approvalSteps.length > 0 ? <p className="text-xs text-slate-500">研究院范围、指定用户与审批步骤将在保存时由服务端再次进行权限和数据校验。</p> : null}
        </section>
      </CardContent>
    </Card>
  )
}
