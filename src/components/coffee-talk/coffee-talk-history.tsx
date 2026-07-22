import { ArrowRight, Clock3 } from "lucide-react"

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
    return <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">{emptyMessage}</p>
  }

  return (
    <ol className="space-y-4" aria-label="Coffee Talk 申请状态历史，按时间顺序">
      {chronologicalEvents.map((event) => (
        <li key={event.id} className="relative flex gap-3 pb-1">
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600" aria-hidden="true">
            <Clock3 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-medium text-slate-950">{event.actionLabel}</p>
              {event.actorLabel ? <span className="text-sm text-slate-500">{event.actorLabel}</span> : null}
            </div>
            {event.fromStatus || event.toStatus ? (
              <div className="mt-2 flex flex-wrap items-center gap-2" aria-label="状态变化">
                {event.fromStatus ? <CoffeeTalkStatusBadge status={event.fromStatus} /> : null}
                {event.fromStatus && event.toStatus ? <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
                {event.toStatus ? <CoffeeTalkStatusBadge status={event.toStatus} /> : null}
              </div>
            ) : null}
            {event.note ? <p className="mt-2 text-sm leading-6 text-slate-600">{event.note}</p> : null}
            <time className="mt-2 block text-xs text-slate-500">{event.occurredAtLabel}</time>
          </div>
        </li>
      ))}
    </ol>
  )
}
