"use client"

import Link from "next/link"

import { NotificationInbox } from "@/components/notifications/notification-inbox"
import type { NotificationRowItem } from "@/components/notifications/notification-row"
import {
  useCoffeeTalkNotifications,
  useTongClassSessionToken,
} from "@/lib/api"

type CoffeeTalkNotification = {
  id: string
  title: string
  body: string
  createdAt: number
  readAt?: number
  href: `/${string}`
}

function formatNotificationTime(value: number): string {
  if (!Number.isFinite(value)) return "刚刚"
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function toNotificationRow(notification: CoffeeTalkNotification): NotificationRowItem {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    createdAtLabel: formatNotificationTime(notification.createdAt),
    href: notification.href,
    state: notification.readAt === undefined ? "unread" : "read",
  }
}

/** Renders only the current session's generic Coffee Talk notification DTOs. */
export function AiaNotificationInboxClient() {
  const sessionToken = useTongClassSessionToken()
  const notifications = useCoffeeTalkNotifications()

  if (!sessionToken) {
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

  return <NotificationInbox notifications={(notifications as CoffeeTalkNotification[]).map(toNotificationRow)} />
}
