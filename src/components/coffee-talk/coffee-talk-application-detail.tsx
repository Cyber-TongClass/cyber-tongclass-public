"use client"

import type { ReactNode } from "react"

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
      <dt className="aia-mono text-xs uppercase tracking-[0.14em] text-[hsl(var(--aia-muted))]">{label}</dt>
      <dd className="mt-1.5 text-sm leading-6 text-[hsl(var(--aia-ink))]">{children}</dd>
    </div>
  )
}

export function CoffeeTalkApplicationDetail({
  application,
  onAction,
}: CoffeeTalkApplicationDetailProps) {
  const mayShowApplicantEmail = application.status === "accepted" || application.status === "completed"

  return (
    <article className="space-y-10">
      <section aria-labelledby="coffee-talk-application-title">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="aia-kicker">Coffee Talk 申请</p>
            <h1 id="coffee-talk-application-title" className="aia-serif mt-2 text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">{application.title}</h1>
            <p className="aia-text-muted mt-2 text-sm">更新于 {application.updatedAtLabel}</p>
          </div>
          <CoffeeTalkStatusBadge status={application.status} className="ml-auto" />
        </div>

        <dl className="mt-6 grid gap-5 border-t aia-border-rule pt-6 sm:grid-cols-2">
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
          <div className="mt-6 border-t aia-border-rule pt-5">
            <h2 className="aia-mono text-xs uppercase tracking-[0.14em] text-[hsl(var(--aia-muted))]">可执行操作</h2>
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

      <section aria-labelledby="coffee-talk-history-heading">
        <h2 id="coffee-talk-history-heading" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">状态历史</h2>
        <div className="mt-4 border-t aia-border-rule pt-5">
          <CoffeeTalkHistory events={application.history} />
        </div>
      </section>
    </article>
  )
}
