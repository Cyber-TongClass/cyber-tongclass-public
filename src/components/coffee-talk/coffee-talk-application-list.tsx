"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  CoffeeTalkStatusBadge,
  type CoffeeTalkStatus,
} from "./coffee-talk-status-badge"
import type { CoffeeTalkAllowedAction } from "./coffee-talk-application-detail"

export type CoffeeTalkApplicationInternalHref = `/${string}`

/** A compact, role-redacted DTO for an application list. It intentionally has no contact fields. */
export interface CoffeeTalkApplicationListItem {
  id: string
  title: string
  participantLabel?: string
  status: CoffeeTalkStatus
  expectedVersion?: number
  updatedAtLabel: string
  href?: CoffeeTalkApplicationInternalHref
  allowedActions: readonly CoffeeTalkAllowedAction[]
}

export interface CoffeeTalkApplicationListProps {
  applications: readonly CoffeeTalkApplicationListItem[]
  emptyMessage?: string
  onAction?: (application: CoffeeTalkApplicationListItem, action: CoffeeTalkAllowedAction) => void
}

function isRelativeApplicationHref(href: string | undefined): href is CoffeeTalkApplicationInternalHref {
  return Boolean(href && href.startsWith("/") && !href.startsWith("//"))
}

export function CoffeeTalkApplicationList({
  applications,
  emptyMessage = "暂时没有 Coffee Talk 申请。",
  onAction,
}: CoffeeTalkApplicationListProps) {
  if (applications.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-3" aria-label="Coffee Talk 申请列表">
      {applications.map((application) => {
        const safeHref = isRelativeApplicationHref(application.href) ? application.href : undefined

        return (
          <li key={application.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-950">{application.title}</h3>
                  <CoffeeTalkStatusBadge status={application.status} />
                </div>
                {application.participantLabel ? <p className="mt-2 text-sm text-slate-600">{application.participantLabel}</p> : null}
                <p className="mt-2 text-xs text-slate-500">更新于 {application.updatedAtLabel}</p>
              </div>
              {safeHref ? (
                <Link
                  href={safeHref}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 self-start rounded-md px-3 text-sm font-medium text-primary hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  查看详情
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>

            {application.allowedActions.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4" aria-label="可执行操作">
                {application.allowedActions.map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    size="sm"
                    variant={action.tone ?? "outline"}
                    disabled={!onAction}
                    onClick={() => onAction?.(application, action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
