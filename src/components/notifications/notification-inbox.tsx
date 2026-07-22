"use client"

import { CheckCheck, Inbox } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  NotificationRow,
  type NotificationRowItem,
} from "./notification-row"

export interface NotificationInboxProps {
  notifications: readonly NotificationRowItem[]
  emptyMessage?: string
  onNotificationOpen?: (notification: NotificationRowItem) => void
  onMarkRead?: (notification: NotificationRowItem) => void
  onArchive?: (notification: NotificationRowItem) => void
  onMarkAllRead?: () => void
}

export function NotificationInbox({
  notifications,
  emptyMessage = "暂时没有通知。",
  onNotificationOpen,
  onMarkRead,
  onArchive,
  onMarkAllRead,
}: NotificationInboxProps) {
  const unreadCount = notifications.filter((notification) => notification.state === "unread").length

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="notification-inbox-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div>
          <h2 id="notification-inbox-heading" className="text-lg font-semibold text-slate-950">通知</h2>
          <p className="mt-1 text-sm text-slate-600" aria-live="polite">
            {unreadCount > 0 ? `${unreadCount} 条未读通知` : "全部通知均已读"}
          </p>
        </div>
        {unreadCount > 0 && onMarkAllRead ? (
          <Button type="button" variant="outline" size="sm" onClick={onMarkAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            全部标为已读
          </Button>
        ) : null}
      </div>

      {notifications.length > 0 ? (
        <div role="list" aria-label="当前账户通知">
          {notifications.map((notification) => (
            <div key={notification.id} role="listitem">
              <NotificationRow
                notification={notification}
                onOpen={onNotificationOpen}
                onMarkRead={onMarkRead}
                onArchive={onArchive}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <Inbox className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-600">{emptyMessage}</p>
        </div>
      )}
    </section>
  )
}
