"use client"

import type { ReactNode } from "react"
import { ClipboardList } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  CoffeeTalkHistory,
  type CoffeeTalkHistoryEvent,
} from "./coffee-talk-history"
import {
  CoffeeTalkStatusBadge,
  type CoffeeTalkStatus,
} from "./coffee-talk-status-badge"

export type CoffeeTalkActionTone = "default" | "secondary" | "outline" | "destructive"

/** An action is rendered only when the server includes it in an application's allowedActions array. */
export interface CoffeeTalkAllowedAction {
  id: string
  label: string
  tone?: CoffeeTalkActionTone
}

export interface CoffeeTalkApplicantContact {
  displayName: string
  email?: string
}

/** Role-redacted detail DTO; no client-side role or status capability inference is required. */
export interface CoffeeTalkApplicationDetailItem {
  id: string
  title: string
  status: CoffeeTalkStatus
  expectedVersion: number
  updatedAtLabel: string
  purpose?: string
  researchBackground?: string
  expectedOutcome?: string
  preferredFormatLabel?: string
  availabilityLabels?: readonly string[]
  applicantContact?: CoffeeTalkApplicantContact
  history: readonly CoffeeTalkHistoryEvent[]
  allowedActions: readonly CoffeeTalkAllowedAction[]
}

export interface CoffeeTalkApplicationDetailProps {
  application: CoffeeTalkApplicationDetailItem
  onAction?: (input: { applicationId: string; expectedVersion: number; actionId: string }) => void
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-700">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-950">{children}</dd>
    </div>
  )
}

export function CoffeeTalkApplicationDetail({
  application,
  onAction,
}: CoffeeTalkApplicationDetailProps) {
  const mayShowApplicantEmail = application.status === "accepted" || application.status === "completed"

  return (
    <article className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="coffee-talk-application-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Coffee Talk 申请</p>
            <h1 id="coffee-talk-application-title" className="mt-1 text-2xl font-semibold text-slate-950">{application.title}</h1>
            <p className="mt-2 text-sm text-slate-600">更新于 {application.updatedAtLabel}</p>
          </div>
          <CoffeeTalkStatusBadge status={application.status} />
        </div>

        <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
          {application.applicantContact?.displayName ? (
            <DetailField label="申请人">{application.applicantContact.displayName}</DetailField>
          ) : null}
          {mayShowApplicantEmail && application.applicantContact?.email ? (
            <DetailField label="申请人联系邮箱">{application.applicantContact.email}</DetailField>
          ) : null}
          {application.preferredFormatLabel ? <DetailField label="偏好形式">{application.preferredFormatLabel}</DetailField> : null}
          {application.availabilityLabels?.length ? (
            <DetailField label="可用时间">
              <ul className="space-y-1">
                {application.availabilityLabels.map((label) => <li key={label}>{label}</li>)}
              </ul>
            </DetailField>
          ) : null}
          {application.purpose ? <DetailField label="交流目的">{application.purpose}</DetailField> : null}
          {application.researchBackground ? <DetailField label="研究背景">{application.researchBackground}</DetailField> : null}
          {application.expectedOutcome ? <DetailField label="预期收获">{application.expectedOutcome}</DetailField> : null}
        </dl>

        {application.allowedActions.length > 0 ? (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-sm font-semibold text-slate-950">可执行操作</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {application.allowedActions.map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  variant={action.tone ?? "outline"}
                  disabled={!onAction}
                  onClick={() => onAction?.({
                    applicationId: application.id,
                    expectedVersion: application.expectedVersion,
                    actionId: action.id,
                  })}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6" aria-labelledby="coffee-talk-history-heading">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="coffee-talk-history-heading" className="text-lg font-semibold text-slate-950">状态历史</h2>
        </div>
        <div className="mt-4">
          <CoffeeTalkHistory events={application.history} />
        </div>
      </section>
    </article>
  )
}
