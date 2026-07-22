"use client"

import { useState } from "react"
import Link from "next/link"

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
  useAiaNotifications?: () => unknown
  useMarkAiaNotificationRead?: () => (notificationId: string) => Promise<unknown>
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
  && genericNotificationHooks.useMarkAllAiaNotificationsRead,
)
const useAiaNotificationFeed = hasGenericNotificationHooks
  ? genericNotificationHooks.useAiaNotifications!
  : apiHooks.useCoffeeTalkNotifications
const useAiaMarkNotificationRead = hasGenericNotificationHooks
  ? genericNotificationHooks.useMarkAiaNotificationRead!
  : apiHooks.useMarkCoffeeTalkNotificationRead
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
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    createdAtLabel: formatNotificationTime(notification.createdAt),
    href: notification.href,
    category: notification.category ?? (hasGenericNotificationHooks ? "general" : "coffee-talk"),
    type: notification.type,
    state: notificationState(notification),
  }
}

/** Renders the generic AIA inbox, with Coffee Talk compatibility for older deployments. */
export function AiaNotificationInboxClient() {
  const { isAuthenticated } = useAuth()
  const notifications = useAiaNotificationFeed()
  const markNotificationRead = useAiaMarkNotificationRead()
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

  if (!isAuthenticated) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        请先登录后查看通知。
        <Link className="ml-2 font-medium text-primary underline-offset-4 hover:underline" href="/login?next=%2Fnotifications">
          前往登录
        </Link>
      </p>
    )
  }

  if (notifications === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载通知…</p>
  }

  return (
    <div className="space-y-3">
      {actionError ? <p className="text-sm text-red-700" role="alert">{actionError}</p> : null}
      <NotificationInbox
        notifications={(notifications as AiaNotification[]).map(toNotificationRow)}
        emptyMessage="暂时没有站内信。服务申请、审批处理和系统消息会显示在这里。"
        onNotificationOpen={(notification) => { void handleMarkRead(notification) }}
        onMarkRead={(notification) => { void handleMarkRead(notification) }}
        onMarkAllRead={() => { void handleMarkAllRead() }}
      />
    </div>
  )
}
