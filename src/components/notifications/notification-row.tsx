"use client"

import Link from "next/link"
import { Archive, Circle, MailOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type NotificationVisualState = "unread" | "read" | "archived"
export type InternalNotificationHref = `/${string}`

/** A data-minimized notification DTO prepared by the current-user inbox API. */
export interface NotificationRowItem {
  id: string
  title: string
  body?: string
  createdAtLabel?: string
  href?: InternalNotificationHref
  state: NotificationVisualState
}

export interface NotificationRowProps {
  notification: NotificationRowItem
  onOpen?: (notification: NotificationRowItem) => void
  onMarkRead?: (notification: NotificationRowItem) => void
  onArchive?: (notification: NotificationRowItem) => void
  className?: string
}

const stateLabels: Record<NotificationVisualState, string> = {
  unread: "未读",
  read: "已读",
  archived: "已归档",
}

export function isRelativeInternalHref(href: string | undefined): href is InternalNotificationHref {
  return Boolean(href && href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\"))
}

export function NotificationRow({
  notification,
  onOpen,
  onMarkRead,
  onArchive,
  className,
}: NotificationRowProps) {
  const isUnread = notification.state === "unread"
  const isArchived = notification.state === "archived"
  const safeHref = isRelativeInternalHref(notification.href) ? notification.href : undefined
  const rowContent = (
    <>
      <span className="mt-1.5 shrink-0" aria-hidden="true">
        {isUnread ? <Circle className="h-2.5 w-2.5 fill-current text-primary" /> : <span className="block h-2.5 w-2.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-slate-950">{notification.title}</span>
          <span className="text-xs text-slate-500">{stateLabels[notification.state]}</span>
        </span>
        {notification.body ? <span className="mt-1 block text-sm leading-6 text-slate-600">{notification.body}</span> : null}
        {notification.createdAtLabel ? <span className="mt-2 block text-xs text-slate-500">{notification.createdAtLabel}</span> : null}
      </span>
    </>
  )

  return (
    <article
      className={cn(
        "flex gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:px-5",
        isUnread && "bg-blue-50/70",
        isArchived && "bg-slate-50 text-slate-500",
        className,
      )}
      aria-label={`${stateLabels[notification.state]}通知：${notification.title}`}
    >
      {safeHref ? (
        <Link
          href={safeHref}
          className="flex min-w-0 flex-1 gap-3 rounded-md text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => onOpen?.(notification)}
        >
          {rowContent}
        </Link>
      ) : onOpen ? (
        <button
          type="button"
          className="flex min-w-0 flex-1 gap-3 rounded-md text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => onOpen(notification)}
        >
          {rowContent}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 gap-3">{rowContent}</div>
      )}

      <div className="flex shrink-0 items-start gap-1">
        {isUnread && onMarkRead ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMarkRead(notification)}
            aria-label={`将“${notification.title}”标为已读`}
          >
            <MailOpen className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
        {!isArchived && onArchive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onArchive(notification)}
            aria-label={`归档“${notification.title}”`}
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </article>
  )
}
