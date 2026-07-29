"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

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
    return <p className="aia-text-muted py-6 text-sm">{emptyMessage}</p>
  }

  return (
    <ul className="divide-y divide-[hsl(var(--aia-rule))] border-t aia-border-rule" aria-label="Coffee Talk 申请列表">
      {applications.map((application) => {
        const safeHref = isRelativeApplicationHref(application.href) ? application.href : undefined

        return (
          <li key={application.id} className="py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="aia-serif text-lg font-semibold leading-snug text-[hsl(var(--aia-ink))]">
                {application.title}
              </h3>
              <CoffeeTalkStatusBadge status={application.status} />
              <span className="aia-mono ml-auto text-xs text-[hsl(var(--aia-muted))]">
                更新于 {application.updatedAtLabel}
              </span>
            </div>
            {application.participantLabel ? (
              <p className="aia-text-muted mt-1.5 text-sm leading-6">{application.participantLabel}</p>
            ) : null}

            {safeHref || application.allowedActions.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {safeHref ? (
                  <Link href={safeHref} className="aia-link inline-flex items-center gap-1 text-sm">
                    查看详情
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
                {application.allowedActions.length > 0 ? (
                  <div className="flex flex-wrap gap-2" aria-label="可执行操作">
                    {application.allowedActions.map((action) => (
                      <Button
                        key={action.id}
                        type="button"
                        size="sm"
                        variant={action.tone ?? "outline"}
                        className="min-h-11"
                        disabled={!onAction}
                        onClick={() => onAction?.(application, action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
