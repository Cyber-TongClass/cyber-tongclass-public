"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  isRelativeInternalHref,
  type InternalNotificationHref,
} from "./notification-row"

export interface NotificationBellProps {
  unreadCount: number
  href?: InternalNotificationHref
  onClick?: () => void
  label?: string
  className?: string
}

function normalizeUnreadCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function NotificationBell({
  unreadCount,
  href,
  onClick,
  label = "通知",
  className,
}: NotificationBellProps) {
  const count = normalizeUnreadCount(unreadCount)
  const accessibleLabel = count > 0 ? `${label}，${count} 条未读` : label
  const bellContent = (
    <>
      <Bell className="h-5 w-5" aria-hidden="true" />
      <span className="sr-only">{accessibleLabel}</span>
      {count > 0 ? (
        <span
          className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-5 text-white"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </>
  )
  const commonClassName = cn(
    "relative inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    className,
  )

  if (isRelativeInternalHref(href)) {
    return (
      <Link href={href} onClick={onClick} className={commonClassName} aria-label={accessibleLabel}>
        {bellContent}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={commonClassName}
      onClick={onClick}
      disabled={!onClick}
      aria-label={accessibleLabel}
    >
      {bellContent}
    </button>
  )
}
