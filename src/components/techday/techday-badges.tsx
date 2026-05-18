"use client"

import { Badge } from "@/components/ui/badge"
import {
  techDayReimbursementStatusLabels,
  techDayReviewStatusLabels,
  techDayRoleLabels,
  type TechDayReimbursementStatus,
  type TechDayReviewStatus,
  type TechDayRole,
} from "@/types/techday"

export function TechDayRoleBadge({ role }: { role: TechDayRole }) {
  return <Badge variant={role === "admin" ? "destructive" : "secondary"} className="rounded-md">{techDayRoleLabels[role]}</Badge>
}

export function TechDayReviewStatusBadge({ status }: { status: TechDayReviewStatus }) {
  const variant = status === "approved" ? "success" : status === "rejected" ? "destructive" : "outline"
  return <Badge variant={variant as any} className="rounded-md">{techDayReviewStatusLabels[status]}</Badge>
}

export function TechDayReimbursementStatusBadge({ status }: { status: TechDayReimbursementStatus }) {
  const variant = status === "approved" ? "success" : status === "rejected" ? "destructive" : "outline"
  return <Badge variant={variant as any} className="rounded-md">{techDayReimbursementStatusLabels[status]}</Badge>
}

const DEFAULT_AWARD_COLOR = "#fbbf24"

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (![3, 6].includes(normalized.length)) return null
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized
  const numeric = Number.parseInt(value, 16)
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  }
}

function darkenHex(hex: string, amount = 0.4) {
  const rgb = hexToRgb(hex)
  if (!rgb) return "#92400e"
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => Math.max(0, Math.floor(value * (1 - amount))).toString(16).padStart(2, "0"))
    .join("")}`
}

function awardTextColor(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return "#ffffff"
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
  return luminance < 200 ? "#ffffff" : darkenHex(hex)
}

export function TechDayAwardBadge({ name, color }: { name: string; color?: string | null }) {
  const badgeColor = color || DEFAULT_AWARD_COLOR
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: badgeColor,
        borderColor: badgeColor,
        color: awardTextColor(badgeColor),
      }}
    >
      {name}
    </span>
  )
}
