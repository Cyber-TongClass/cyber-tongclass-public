"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

import { NotificationInbox } from "@/components/notifications/notification-inbox"
import type { NotificationRowItem } from "@/components/notifications/notification-row"
import * as apiHooks from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"

type AiaNotification = {
  id: string
  title: string
  body?: string
  createdAt: number
  readAt?: number
  archivedAt?: number
  href?: string
  category?: string
  type?: string
  state?: "unread" | "read" | "archived"
}

type GenericNotificationHooks = {
  useAiaNotifications?: (options?: { limit?: number }) => unknown
  useMarkAiaNotificationRead?: () => (notificationId: string) => Promise<unknown>
  useArchiveAiaNotification?: () => (notificationId: string) => Promise<unknown>
  useMarkAllAiaNotificationsRead?: () => () => Promise<unknown>
}

/**
 * The generic hook exports are optional while deployments transition from the
 * Coffee Talk-only inbox. Keep the selection at module scope so React always
 * receives the same hook implementation for the lifetime of this bundle.
 */
const genericNotificationHooks = apiHooks as unknown as GenericNotificationHooks
const hasGenericNotificationHooks = Boolean(
  genericNotificationHooks.useAiaNotifications
  && genericNotificationHooks.useMarkAiaNotificationRead
  && genericNotificationHooks.useArchiveAiaNotification
  && genericNotificationHooks.useMarkAllAiaNotificationsRead,
)
const useAiaNotificationFeed = hasGenericNotificationHooks
  ? genericNotificationHooks.useAiaNotifications!
  : apiHooks.useCoffeeTalkNotifications
const useAiaMarkNotificationRead = hasGenericNotificationHooks
  ? genericNotificationHooks.useMarkAiaNotificationRead!
  : apiHooks.useMarkCoffeeTalkNotificationRead
const useAiaArchiveNotification = hasGenericNotificationHooks
  ? genericNotificationHooks.useArchiveAiaNotification!
  : () => async () => undefined
const useAiaMarkAllNotificationsRead = hasGenericNotificationHooks
  ? genericNotificationHooks.useMarkAllAiaNotificationsRead!
  : apiHooks.useMarkAllCoffeeTalkNotificationsRead

function formatNotificationTime(value: number): string {
  if (!Number.isFinite(value)) return "刚刚"
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function notificationState(notification: AiaNotification): NotificationRowItem["state"] {
  if (notification.state === "archived" || notification.archivedAt !== undefined) return "archived"
  if (notification.state === "read" || notification.readAt !== undefined) return "read"
  return "unread"
}

function toNotificationRow(notification: AiaNotification): NotificationRowItem {
  const fallbackCategory = notification.type === "content_review"
    ? "class-work"
    : hasGenericNotificationHooks
      ? "general"
      : "coffee-talk"
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    createdAtLabel: formatNotificationTime(notification.createdAt),
    href: notification.href,
    category: notification.category ?? fallbackCategory,
    type: notification.type,
    state: notificationState(notification),
  }
}

/** Renders the generic AIA inbox, with Coffee Talk compatibility for older deployments. */
export function AiaNotificationInboxClient() {
  const { isAuthenticated } = useAuth()
  const [limit, setLimit] = useState(30)
  const notifications = useAiaNotificationFeed({ limit })
  const markNotificationRead = useAiaMarkNotificationRead()
  const archiveNotification = useAiaArchiveNotification()
  const markAllNotificationsRead = useAiaMarkAllNotificationsRead()
  const [actionError, setActionError] = useState<string | null>(null)

  const handleMarkRead = async (notification: NotificationRowItem) => {
    try {
      setActionError(null)
      await markNotificationRead(notification.id)
    } catch {
      setActionError("更新通知状态失败，请稍后重试。")
    }
  }

  const handleMarkAllRead = async () => {
    try {
      setActionError(null)
      await markAllNotificationsRead()
    } catch {
      setActionError("更新通知状态失败，请稍后重试。")
    }
  }

  const handleArchive = async (notification: NotificationRowItem) => {
    try {
      setActionError(null)
      await archiveNotification(notification.id)
    } catch {
      setActionError("归档通知失败，请稍后重试。")
    }
  }

  if (!isAuthenticated) {
    return (
      <p className="aia-text-muted border-t border-b aia-border-rule py-5 text-sm leading-6">
        请先登录后查看通知。
        <Link className="aia-link aia-focus ml-2 font-medium" href="/login?next=%2Fnotifications">
          前往登录
        </Link>
      </p>
    )
  }

  if (notifications === undefined) {
    return <p className="aia-text-muted border-b aia-border-rule py-5 text-sm" role="status">正在加载通知…</p>
  }

  return (
    <div
      className={[
        "[&>section]:!overflow-visible [&>section]:!rounded-none [&>section]:!border-x-0 [&>section]:!border-b-0",
        "[&>section]:!border-t-0 [&>section]:!bg-transparent [&>section]:!shadow-none",
        "[&>section>div:first-child]:!border-[hsl(var(--aia-rule))] [&>section>div:first-child]:!px-0 [&>section>div:first-child]:!pt-0 [&>section>div:first-child]:!pb-4",
        "[&_h2]:aia-serif [&_h2]:!text-xl [&_h2]:!font-semibold [&_h2]:!tracking-tight [&_h2]:!text-[hsl(var(--aia-ink))]",
        "[&_[role=list]]:!border-t [&_[role=list]]:!border-[hsl(var(--aia-rule))]",
        "[&_[role=listitem]>article]:!border-[hsl(var(--aia-rule))] [&_[role=listitem]>article]:!bg-transparent",
        "[&_[role=listitem]>article]:!px-0 [&_[role=listitem]>article]:!py-5",
        "[&_article_.text-slate-950]:aia-serif [&_article_.text-slate-950]:!text-base [&_article_.text-slate-950]:!font-semibold",
        "[&_article_.text-slate-950]:!text-[hsl(var(--aia-ink))] [&_article_.text-primary]:!text-[hsl(var(--aia-red))]",
        "[&_article_.text-xs]:aia-mono [&_article_.text-xs]:!uppercase [&_article_.text-xs]:!tracking-[0.12em]",
        "[&_article_.text-slate-500]:!text-[hsl(var(--aia-muted))] [&_article_.text-slate-600]:!text-[hsl(var(--aia-muted))]",
        "[&_article_.bg-slate-100]:!rounded-none [&_article_.bg-slate-100]:!bg-[hsl(var(--aia-tag))]",
        "[&_article_a]:aia-focus [&_article_button]:aia-focus",
        "[&>section>div:last-child]:!px-0 [&>section>div:last-child]:!py-10",
      ].join(" ")}
    >
      {actionError ? <p className="mb-4 text-sm text-[hsl(var(--aia-red))]" role="alert">{actionError}</p> : null}
      <NotificationInbox
        notifications={(notifications as AiaNotification[]).map(toNotificationRow)}
        emptyMessage="暂时没有站内信。服务申请、审批处理和系统消息会显示在这里。"
        onNotificationOpen={(notification) => { void handleMarkRead(notification) }}
        onMarkRead={(notification) => { void handleMarkRead(notification) }}
        onArchive={(notification) => { void handleArchive(notification) }}
        onMarkAllRead={() => { void handleMarkAllRead() }}
      />
      {(notifications as AiaNotification[]).length >= limit && limit < 500 ? (
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="outline" onClick={() => setLimit((current) => Math.min(current + 30, 500))}>
            加载更早通知
          </Button>
        </div>
      ) : null}
    </div>
  )
}
