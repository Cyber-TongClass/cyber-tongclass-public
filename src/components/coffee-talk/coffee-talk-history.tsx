import { ArrowRight } from "lucide-react"

import {
  CoffeeTalkStatusBadge,
  type CoffeeTalkStatus,
} from "./coffee-talk-status-badge"

/** Immutable, role-redacted history event supplied by the server. */
export interface CoffeeTalkHistoryEvent {
  id: string
  sequenceNo: number
  actionLabel: string
  occurredAtLabel: string
  fromStatus?: CoffeeTalkStatus
  toStatus?: CoffeeTalkStatus
  actorLabel?: string
  note?: string
}

export interface CoffeeTalkHistoryProps {
  events: readonly CoffeeTalkHistoryEvent[]
  emptyMessage?: string
}

export function CoffeeTalkHistory({
  events,
  emptyMessage = "尚无状态记录。",
}: CoffeeTalkHistoryProps) {
  const chronologicalEvents = events.slice().sort((left, right) => left.sequenceNo - right.sequenceNo)

  if (chronologicalEvents.length === 0) {
    return <p className="aia-text-muted py-4 text-sm">{emptyMessage}</p>
  }

  return (
    <ol className="divide-y divide-[hsl(var(--aia-rule))]" aria-label="Coffee Talk 申请状态历史，按时间顺序">
      {chronologicalEvents.map((event) => (
        <li key={event.id} className="py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="aia-mono text-xs text-[hsl(var(--aia-muted))]" aria-hidden="true">
              {String(event.sequenceNo).padStart(2, "0")}
            </span>
            <p className="font-medium text-[hsl(var(--aia-ink))]">{event.actionLabel}</p>
            {event.actorLabel ? <span className="aia-text-muted text-sm">{event.actorLabel}</span> : null}
            <time className="aia-mono ml-auto text-xs text-[hsl(var(--aia-muted))]">{event.occurredAtLabel}</time>
          </div>
          {event.fromStatus || event.toStatus ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-8" aria-label="状态变化">
              {event.fromStatus ? <CoffeeTalkStatusBadge status={event.fromStatus} /> : null}
              {event.fromStatus && event.toStatus ? <ArrowRight className="h-4 w-4 text-[hsl(var(--aia-muted))]" aria-hidden="true" /> : null}
              {event.toStatus ? <CoffeeTalkStatusBadge status={event.toStatus} /> : null}
            </div>
          ) : null}
          {event.note ? <p className="aia-text-muted mt-2 pl-8 text-sm leading-6">{event.note}</p> : null}
        </li>
      ))}
    </ol>
  )
}
