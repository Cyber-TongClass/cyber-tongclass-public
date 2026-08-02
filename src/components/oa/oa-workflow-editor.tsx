"use client"

import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronDown,
  FileInput,
  GitBranch,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useMemo, useState, type ComponentType } from "react"

import {
  OAFormTargetPicker,
  type OAFormTargetCandidate,
} from "@/components/oa/oa-form-target-picker"
import { OaScopePicker } from "@/components/oa/oa-scope-picker"
import { OAWorkflowSimulation } from "@/components/oa/oa-workflow-simulation"
import {
  hasOAUserScopeRecipients,
  normalizeOAWorkflowDefinition,
  type OAUserScope,
  type OAWorkflowDefinition,
  type OAWorkflowDraftConfig,
  type OAWorkflowNode,
} from "@/lib/oa-forms"
import { cn } from "@/lib/utils"

type ConfigurableNodeType = Exclude<OAWorkflowNode["type"], "create_form">

export type OAWorkflowEditorProps = {
  value: OAWorkflowDraftConfig
  onChange: (next: OAWorkflowDraftConfig) => void
  formCandidates?: OAFormTargetCandidate[]
  reviewerLabels?: Record<string, string[]>
}

const nodeTypeLabels: Record<ConfigurableNodeType, string> = {
  approval: "审批",
  batch_approval: "批量审批",
  fill_form: "填写新表单",
  notification: "通知",
}

const nodeTypeDescriptions: Record<ConfigurableNodeType, string> = {
  approval: "由一组人员处理，可同意、拒绝或暂缓并给出意见。",
  batch_approval: "同时分派给多位审核人，并按任一或全部完成。",
  fill_form: "抵达时自动授予当前提交人另一张表单的可见与填写权限。",
  notification: "向所选人员或用户组发送站内信，不阻塞后续流程。",
}

const nodeTypeIcons: Record<ConfigurableNodeType, ComponentType<{ className?: string }>> = {
  approval: ShieldCheck,
  batch_approval: GitBranch,
  fill_form: FileInput,
  notification: Bell,
}

function createNode(type: ConfigurableNodeType, position: number): OAWorkflowNode {
  const id = `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  switch (type) {
    case "approval":
      return { id, type, title: `第 ${position} 级审批`, scope: {} }
    case "batch_approval":
      return { id, type, title: "批量审批", scope: {}, completion: "any" }
    case "fill_form":
      return { id, type, title: "填写新表单", targetFormId: "" }
    case "notification":
      return { id, type, title: "发送通知", scope: {}, message: "" }
  }
}

function countScope(scope: OAUserScope) {
  return (scope.identityTypes?.length || 0)
    + (scope.roles?.length || 0)
    + (scope.userIds?.length || 0)
    + (scope.researchGroupIds?.length || 0)
    + (scope.userGroupIds?.length || 0)
}

function nodeSummary(node: OAWorkflowNode, candidates: OAFormTargetCandidate[]) {
  switch (node.type) {
    case "create_form":
      return "申请人填写并提交当前表单"
    case "approval":
      return hasOAUserScopeRecipients(node.scope) ? `${countScope(node.scope)} 个范围条件` : "尚未选择审批对象"
    case "batch_approval":
      return `${node.completion === "all" ? "全部同意" : "任一同意"} · ${countScope(node.scope)} 个范围条件`
    case "fill_form":
      return candidates.find((candidate) => candidate.id === node.targetFormId)?.title || "尚未选择目标表单"
    case "notification":
      return node.message.trim() || "尚未填写通知内容"
  }
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="aia-mono block text-[11px] font-semibold uppercase tracking-[0.1em] aia-text-muted">
      {children}
    </label>
  )
}

function AddNodeBetween({
  afterId,
  isOpen,
  onToggle,
  onInsert,
}: {
  afterId: string
  isOpen: boolean
  onToggle: () => void
  onInsert: (type: ConfigurableNodeType) => void
}) {
  return (
    <div className="relative flex min-h-9 items-center" data-after-node={afterId}>
      <span className="h-px flex-1 bg-[hsl(var(--aia-rule))]" aria-hidden="true" />
      <button
        type="button"
        aria-expanded={isOpen}
        className="aia-focus aia-mono mx-3 inline-flex min-h-11 items-center gap-1.5 bg-[hsl(var(--aia-paper))] px-2 py-1 text-[10px] uppercase tracking-[0.1em] aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))]"
        onClick={onToggle}
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        在此添加节点
      </button>
      <span className="h-px flex-1 bg-[hsl(var(--aia-rule))]" aria-hidden="true" />

      {isOpen ? (
        <div className="absolute left-1/2 top-8 z-20 w-[min(22rem,calc(100vw-3rem))] -translate-x-1/2 border aia-border-rule bg-[hsl(var(--aia-paper))]">
          {(Object.keys(nodeTypeLabels) as ConfigurableNodeType[]).map((type) => {
            const Icon = nodeTypeIcons[type]
            return (
              <button
                key={type}
                type="button"
                className="aia-focus flex w-full gap-3 border-b aia-border-rule px-3 py-3 text-left last:border-b-0 hover:bg-[hsl(var(--aia-tag))]"
                onClick={() => onInsert(type)}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--aia-red))]" aria-hidden="true" />
                <span>
                  <strong className="aia-serif block text-sm font-semibold text-[hsl(var(--aia-ink))]">
                    {nodeTypeLabels[type]}
                  </strong>
                  <span className="mt-0.5 block text-xs leading-5 aia-text-muted">{nodeTypeDescriptions[type]}</span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function NodeConfiguration({
  node,
  formCandidates,
  onChange,
}: {
  node: Exclude<OAWorkflowNode, { type: "create_form" }>
  formCandidates: OAFormTargetCandidate[]
  onChange: (next: OAWorkflowNode) => void
}) {
  const idPrefix = `workflow-node-${node.id}`
  return (
    <div className="space-y-5 border-t aia-border-rule px-4 py-5 sm:px-5">
      <div>
        <FieldLabel htmlFor={`${idPrefix}-title`}>流程名称</FieldLabel>
        <input
          id={`${idPrefix}-title`}
          value={node.title}
          className="aia-focus mt-2 w-full border-b aia-border-rule bg-transparent px-0 py-2 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"
          placeholder="输入这个流程节点的名称"
          onChange={(event) => onChange({ ...node, title: event.target.value })}
        />
      </div>

      {node.type === "approval" || node.type === "batch_approval" ? (
        <div>
          <FieldLabel htmlFor={`${idPrefix}-scope-search`}>审批对象</FieldLabel>
          <div className="mt-2">
            <OaScopePicker
              scope={node.scope}
              onChange={(scope) => onChange({ ...node, scope })}
              idPrefix={idPrefix}
              showRoles
              purpose="workflow_approver"
            />
          </div>
        </div>
      ) : null}

      {node.type === "batch_approval" ? (
        <div>
          <FieldLabel htmlFor={`${idPrefix}-completion`}>完成条件</FieldLabel>
          <select
            id={`${idPrefix}-completion`}
            value={node.completion}
            className="aia-focus mt-2 w-full border aia-border-rule bg-transparent px-3 py-2 text-sm text-[hsl(var(--aia-ink))]"
            onChange={(event) => onChange({ ...node, completion: event.target.value === "all" ? "all" : "any" })}
          >
            <option value="any">任一审核人同意后推进（默认）</option>
            <option value="all">全部审核人同意后推进</option>
          </select>
        </div>
      ) : null}

      {node.type === "fill_form" ? (
        <div>
          <FieldLabel htmlFor={`${idPrefix}-form-search`}>目标表单</FieldLabel>
          <div className="mt-2">
            <OAFormTargetPicker
              candidates={formCandidates}
              value={node.targetFormId}
              onChange={(targetFormId) => onChange({ ...node, targetFormId })}
              idPrefix={idPrefix}
            />
          </div>
          <p className="mt-2 text-xs leading-5 aia-text-muted">
            只有当前编辑者有权查看的表单会出现在结果中；抵达此节点后才授予提交人权限。
          </p>
        </div>
      ) : null}

      {node.type === "notification" ? (
        <>
          <div>
            <FieldLabel htmlFor={`${idPrefix}-scope-search`}>通知对象</FieldLabel>
            <div className="mt-2">
              <OaScopePicker
                scope={node.scope}
                onChange={(scope) => onChange({ ...node, scope })}
                idPrefix={idPrefix}
                showRoles
                purpose="notification"
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor={`${idPrefix}-message`}>站内信内容</FieldLabel>
            <textarea
              id={`${idPrefix}-message`}
              value={node.message}
              rows={4}
              className="aia-focus mt-2 w-full resize-y border aia-border-rule bg-transparent px-3 py-2 text-sm leading-6 text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"
              placeholder="输入抵达此节点时发送的通知…"
              onChange={(event) => onChange({ ...node, message: event.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

export function OAWorkflowEditor({
  value,
  onChange,
  formCandidates = [],
  reviewerLabels,
}: OAWorkflowEditorProps) {
  const definition = value.workflowDefinition || normalizeOAWorkflowDefinition(undefined, value.approvalSteps)
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(
    definition.nodes.find((node) => node.type !== "create_form")?.id || null,
  )
  const [addMenuAfter, setAddMenuAfter] = useState<string | null>(null)

  const targetFormTitles = useMemo(
    () => Object.fromEntries(formCandidates.map((candidate) => [candidate.id, candidate.title])),
    [formCandidates],
  )

  const setDefinition = (next: OAWorkflowDefinition) => {
    onChange({ ...value, workflowDefinition: next })
  }

  const updateNode = (nodeId: string, next: OAWorkflowNode) => {
    setDefinition({
      version: 2,
      nodes: definition.nodes.map((node) => node.id === nodeId ? next : node),
    })
  }

  const insertNode = (afterId: string, type: ConfigurableNodeType) => {
    const afterIndex = definition.nodes.findIndex((node) => node.id === afterId)
    if (afterIndex < 0) return
    const nextNode = createNode(type, afterIndex + 1)
    const nodes = [...definition.nodes]
    nodes.splice(afterIndex + 1, 0, nextNode)
    setDefinition({ version: 2, nodes })
    setExpandedNodeId(nextNode.id)
    setAddMenuAfter(null)
  }

  const moveNode = (index: number, direction: -1 | 1) => {
    const destination = index + direction
    if (index <= 0 || destination <= 0 || destination >= definition.nodes.length) return
    const nodes = [...definition.nodes]
    const [node] = nodes.splice(index, 1)
    nodes.splice(destination, 0, node)
    setDefinition({ version: 2, nodes })
  }

  const removeNode = (nodeId: string) => {
    setDefinition({ version: 2, nodes: definition.nodes.filter((node) => node.id !== nodeId) })
    if (expandedNodeId === nodeId) setExpandedNodeId(null)
  }

  return (
    <section className="aia-scope border-y aia-border-rule px-0 py-7" aria-labelledby="workflow-editor-title">
      <header className="px-4 sm:px-5">
        <p className="aia-kicker">WORKFLOW DEFINITION · V2</p>
        <h2 id="workflow-editor-title" className="aia-serif mt-2 text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
          审批流程
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 aia-text-muted">
          流程按从上到下的顺序执行；只有批量审批会在节点内部产生并行分支。右侧模拟不会保存数据或发送通知。
        </p>
      </header>

      <div className="mt-7 grid gap-9 px-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] sm:px-5">
        <div className="min-w-0">
          <ol className="border-t aia-border-rule">
            {definition.nodes.map((node, index) => {
              const isCreate = node.type === "create_form"
              const isExpanded = expandedNodeId === node.id && !isCreate
              const Icon = isCreate ? LockKeyhole : nodeTypeIcons[node.type]
              return (
                <li key={node.id}>
                  <article className="border-b aia-border-rule">
                    <button
                      type="button"
                      disabled={isCreate}
                      aria-expanded={isCreate ? undefined : isExpanded}
                      className={cn(
                        "aia-focus flex w-full items-center gap-3 px-1 py-4 text-left sm:px-2",
                        !isCreate && "hover:bg-[hsl(var(--aia-tag))]",
                      )}
                      onClick={() => {
                        if (!isCreate) setExpandedNodeId(isExpanded ? null : node.id)
                      }}
                    >
                      <span className="aia-mono w-7 shrink-0 text-xs aia-text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <Icon className={cn("h-4 w-4 shrink-0", isCreate ? "aia-text-muted" : "text-[hsl(var(--aia-red))]")} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <strong className="aia-serif text-base font-semibold text-[hsl(var(--aia-ink))]">
                            {isCreate ? "创建表单" : node.title || "未命名节点"}
                          </strong>
                          <span className="aia-mono text-[10px] uppercase tracking-[0.1em] aia-text-muted">
                            {isCreate ? "固定起点" : nodeTypeLabels[node.type]}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs aia-text-muted">
                          {nodeSummary(node, formCandidates)}
                        </span>
                      </span>
                      {!isCreate ? (
                        <ChevronDown
                          className={cn("h-4 w-4 shrink-0 aia-text-muted transition-transform", isExpanded && "rotate-180")}
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>

                    {!isCreate && isExpanded ? (
                      <>
                        <NodeConfiguration
                          node={node}
                          formCandidates={formCandidates}
                          onChange={(next) => updateNode(node.id, next)}
                        />
                        <div className="flex justify-end gap-1 border-t aia-border-rule px-4 py-2 sm:px-5">
                          <button
                            type="button"
                            aria-label={`上移 ${node.title}`}
                            disabled={index <= 1}
                            className="aia-focus inline-flex min-h-11 min-w-11 items-center justify-center aia-text-muted hover:text-[hsl(var(--aia-ink))] disabled:opacity-30"
                            onClick={() => moveNode(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`下移 ${node.title}`}
                            disabled={index === definition.nodes.length - 1}
                            className="aia-focus inline-flex min-h-11 min-w-11 items-center justify-center aia-text-muted hover:text-[hsl(var(--aia-ink))] disabled:opacity-30"
                            onClick={() => moveNode(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`删除 ${node.title}`}
                            className="aia-focus ml-2 inline-flex min-h-11 min-w-11 items-center justify-center aia-text-muted hover:text-[hsl(var(--aia-red))]"
                            onClick={() => removeNode(node.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </>
                    ) : null}
                  </article>
                  <AddNodeBetween
                    afterId={node.id}
                    isOpen={addMenuAfter === node.id}
                    onToggle={() => setAddMenuAfter(addMenuAfter === node.id ? null : node.id)}
                    onInsert={(type) => insertNode(node.id, type)}
                  />
                </li>
              )
            })}
          </ol>
          <p className="mt-3 text-xs leading-5 aia-text-muted">
            发布前服务端会再次校验节点名称、审批对象、目标表单与通知范围。
          </p>
        </div>

        <OAWorkflowSimulation
          definition={definition}
          reviewerLabels={reviewerLabels}
          targetFormTitles={targetFormTitles}
        />
      </div>
    </section>
  )
}
