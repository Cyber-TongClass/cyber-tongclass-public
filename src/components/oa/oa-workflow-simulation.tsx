"use client"

import { Bell, Check, FileInput, GitBranch, PenLine, ShieldCheck, X } from "lucide-react"
import { useState, type ComponentType } from "react"

import type { OAWorkflowDefinition, OAWorkflowNode } from "@/lib/oa-forms"
import { cn } from "@/lib/utils"

type SimulationScenario = "normal" | "deferred" | "rejected"
type NodeTone = "complete" | "active" | "deferred" | "rejected" | "future"

export type OAWorkflowSimulationProps = {
  definition: OAWorkflowDefinition
  reviewerLabels?: Record<string, string[]>
  targetFormTitles?: Record<string, string>
}

const scenarioOptions: Array<{ value: SimulationScenario; label: string }> = [
  { value: "normal", label: "正常推进" },
  { value: "deferred", label: "暂缓评审" },
  { value: "rejected", label: "拒绝" },
]

const nodeTypeLabels: Record<OAWorkflowNode["type"], string> = {
  create_form: "创建",
  approval: "审批",
  batch_approval: "批量审批",
  fill_form: "填写",
  notification: "通知",
}

const nodeTypeIcons: Record<OAWorkflowNode["type"], ComponentType<{ className?: string }>> = {
  create_form: PenLine,
  approval: ShieldCheck,
  batch_approval: GitBranch,
  fill_form: FileInput,
  notification: Bell,
}

const toneClasses: Record<NodeTone, { marker: string; text: string; rule: string }> = {
  complete: {
    marker: "border-[hsl(var(--aia-ink))] bg-[hsl(var(--aia-ink))] text-[hsl(var(--aia-paper))]",
    text: "text-[hsl(var(--aia-ink))]",
    rule: "bg-[hsl(var(--aia-ink))]",
  },
  active: {
    marker: "border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-red))]",
    text: "text-[hsl(var(--aia-red))]",
    rule: "bg-[hsl(var(--aia-red))]",
  },
  deferred: {
    marker: "aia-border-rule bg-[hsl(var(--aia-tag))] text-[hsl(var(--aia-ink))]",
    text: "text-[hsl(var(--aia-ink))]",
    rule: "bg-[hsl(var(--aia-rule))]",
  },
  rejected: {
    marker: "border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-red))]",
    text: "text-[hsl(var(--aia-red))]",
    rule: "bg-[hsl(var(--aia-rule))]",
  },
  future: {
    marker: "aia-border-rule bg-[hsl(var(--aia-paper))] aia-text-muted",
    text: "aia-text-muted",
    rule: "bg-[hsl(var(--aia-rule))]",
  },
}

const nodeToneLabels: Record<NodeTone, string> = {
  complete: "已完成",
  active: "当前节点",
  deferred: "暂缓评审",
  rejected: "已拒绝",
  future: "等待中",
}

function toneForNode(
  index: number,
  scenario: SimulationScenario,
  reviewIndex: number,
  nodeCount: number,
): NodeTone {
  const currentIndex = reviewIndex >= 0 ? reviewIndex : Math.min(1, nodeCount - 1)
  if (scenario === "normal" || reviewIndex < 0) {
    if (index < currentIndex) return "complete"
    if (index > currentIndex) return "future"
    return "active"
  }
  if (index < reviewIndex) return "complete"
  if (index > reviewIndex) return "future"
  if (scenario === "deferred") return "deferred"
  if (scenario === "rejected") return "rejected"
  return "active"
}

function nodeDetail(node: OAWorkflowNode, targetFormTitles: Record<string, string>) {
  switch (node.type) {
    case "create_form":
      return "申请人完成当前表单并提交"
    case "approval":
      return "同意、拒绝，或暂缓并留下意见"
    case "batch_approval":
      return node.completion === "all" ? "全部审核人同意后推进" : "任一审核人同意后推进"
    case "fill_form":
      return node.completionRequired
        ? `等待申请人填写：${targetFormTitles[node.targetFormId] || "目标表单"}`
        : `仅开放权限：${targetFormTitles[node.targetFormId] || "目标表单"}`
    case "notification":
      return node.message || "向所选人员与用户组发送站内信"
  }
}

function BatchBranches({
  node,
  labels,
  tone,
}: {
  node: Extract<OAWorkflowNode, { type: "batch_approval" }>
  labels?: string[]
  tone: NodeTone
}) {
  const reviewers = labels?.length ? labels : ["发布时按所选范围解析审核人"]
  const branchTone = tone === "future" ? "aia-border-rule aia-text-muted" : "border-[hsl(var(--aia-rule))] text-[hsl(var(--aia-ink))]"
  const branchStatus = (index: number) => {
    if (tone === "complete") {
      if (node.completion === "any") return index === 0 ? "已同意" : "无需处理"
      return "已同意"
    }
    if (tone === "future") return "等待"
    if (tone === "deferred") return index === 0 ? "暂缓" : "等待复审"
    if (tone === "rejected") return index === 0 ? "已拒绝" : "已停止"
    return index === 0 ? "正在审核" : "并行"
  }

  return (
    <div className="mt-3 border-l aia-border-rule pl-4" aria-label={`${node.title}审核分支`}>
      {reviewers.slice(0, 6).map((label, index) => (
        <div key={`${node.id}-${label}-${index}`} className={cn("relative border-t py-2 pl-3 text-xs", branchTone)}>
          <span className="absolute -left-[17px] top-1/2 h-px w-4 bg-[hsl(var(--aia-rule))]" aria-hidden="true" />
          <span>{label}</span>
          <span className="aia-mono ml-2 aia-text-muted">
            {branchStatus(index)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function OAWorkflowSimulation({
  definition,
  reviewerLabels = {},
  targetFormTitles = {},
}: OAWorkflowSimulationProps) {
  const [scenario, setScenario] = useState<SimulationScenario>("normal")
  const reviewIndex = definition.nodes.findIndex(
    (node) => node.type === "approval" || node.type === "batch_approval",
  )

  return (
    <aside className="border-t aia-border-rule pt-5 lg:sticky lg:top-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="aia-kicker">LIVE SIMULATION</p>
          <h3 className="aia-serif mt-1 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            模拟流程图
          </h3>
        </div>
        <span className="aia-mono text-xs aia-text-muted">只读 · 不保存</span>
      </div>

      <div aria-label="流程模拟状态" className="mt-5 flex flex-wrap border-b aia-border-rule">
        {scenarioOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={scenario === option.value}
            className={cn(
              "aia-focus relative px-3 pb-2 pt-1 text-xs transition-colors",
              scenario === option.value
                ? "font-semibold text-[hsl(var(--aia-ink))]"
                : "aia-text-muted hover:text-[hsl(var(--aia-ink))]",
            )}
            onClick={() => setScenario(option.value)}
          >
            {option.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-px",
                scenario === option.value ? "bg-[hsl(var(--aia-red))]" : "bg-transparent",
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        当前模拟情景：{scenarioOptions.find((option) => option.value === scenario)?.label}
      </p>

      <ol className="mt-6">
        {definition.nodes.map((node, index) => {
          const tone = toneForNode(index, scenario, reviewIndex, definition.nodes.length)
          const Icon = nodeTypeIcons[node.type]
          const isLast = index === definition.nodes.length - 1

          return (
            <li key={node.id} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 pb-7 last:pb-0">
              {!isLast ? (
                <span
                  className={cn("absolute left-[13px] top-7 h-full w-px", toneClasses[tone].rule)}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex h-7 w-7 items-center justify-center border",
                  toneClasses[tone].marker,
                )}
              >
                {tone === "complete" ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : tone === "rejected" ? (
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="aia-mono text-[10px] uppercase tracking-[0.12em] aia-text-muted">
                    {String(index + 1).padStart(2, "0")} · {nodeTypeLabels[node.type]}
                  </span>
                  <span className="sr-only">状态：{nodeToneLabels[tone]}。</span>
                  <strong className={cn("aia-serif text-base font-semibold", toneClasses[tone].text)}>
                    {node.title}
                  </strong>
                </div>
                <p className="mt-1 text-xs leading-5 aia-text-muted">{nodeDetail(node, targetFormTitles)}</p>
                {node.type === "batch_approval" ? (
                  <BatchBranches node={node} labels={reviewerLabels[node.id]} tone={tone} />
                ) : null}
                {tone === "deferred" ? (
                  <div className="mt-3 border-y aia-border-rule bg-[hsl(var(--aia-tag))] px-3 py-2 text-xs leading-5 text-[hsl(var(--aia-ink))]">
                    <p className="aia-mono text-[10px] uppercase tracking-[0.1em] aia-text-muted">暂缓意见</p>
                    <p>请补充材料后重新提交；原意见永久保留。</p>
                    <div className="mt-2 border-t aia-border-rule pt-2">
                      <span className="aia-serif font-semibold">复审</span>
                      <span className="ml-2 aia-text-muted">revision 后生成新的审核记录</span>
                    </div>
                  </div>
                ) : null}
                {tone === "rejected" ? (
                  <p className="mt-3 border-y aia-border-rule py-2 text-xs leading-5 text-[hsl(var(--aia-red))]">
                    流程在此结束，后续节点不再激活。
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
