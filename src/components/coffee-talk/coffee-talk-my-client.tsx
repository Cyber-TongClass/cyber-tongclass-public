"use client"

import Link from "next/link"
import { useState } from "react"

import {
  CoffeeTalkApplicationList,
  type CoffeeTalkApplicationListItem,
} from "@/components/coffee-talk/coffee-talk-application-list"
import {
  type CoffeeTalkAction,
  coffeeTalkActionLabel,
  type CoffeeTalkStatus,
} from "@/lib/coffee-talk"
import {
  useActOnCoffeeTalkApplication,
  useMyCoffeeTalkApplications,
  useTongClassSessionToken,
} from "@/lib/api"

type MyCoffeeTalkApplication = {
  id: string
  teacher: { slug: string; nameZh: string; nameEn: string } | null
  status: CoffeeTalkStatus
  topic: string
  version: number
  updatedAt: number
  allowedActions: readonly CoffeeTalkAction[]
}

function formatUpdatedAt(value: number): string {
  if (!Number.isFinite(value)) return "刚刚"
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function itemForApplication(application: MyCoffeeTalkApplication): CoffeeTalkApplicationListItem {
  const allowedActions = application.allowedActions
    // This first release supports a safe withdrawal from the list. A proper
    // supplement editor will be added before exposing the supplement action.
    .filter((action) => action === "withdraw")
    .map((action) => ({
      id: action,
      label: coffeeTalkActionLabel(action),
      tone: "destructive" as const,
    }))

  return {
    id: application.id,
    title: application.topic,
    participantLabel: application.teacher
      ? `交流教师：${application.teacher.nameZh || application.teacher.nameEn}`
      : "交流教师资料暂不可用",
    status: application.status,
    expectedVersion: application.version,
    updatedAtLabel: formatUpdatedAt(application.updatedAt),
    allowedActions,
  }
}

/** Current-user list UI backed only by the session-aware API wrapper. */
export function CoffeeTalkMyClient() {
  const sessionToken = useTongClassSessionToken()
  const applications = useMyCoffeeTalkApplications()
  const actOnApplication = useActOnCoffeeTalkApplication()
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleAction(item: CoffeeTalkApplicationListItem, action: { id: string }) {
    if (item.expectedVersion === undefined || action.id !== "withdraw") return
    setActionError(null)
    try {
      await actOnApplication({
        applicationId: item.id,
        expectedVersion: item.expectedVersion,
        action: "withdraw",
      })
    } catch {
      setActionError("操作未成功完成。申请状态可能已更新，请刷新后重试。")
    }
  }

  if (!sessionToken) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        请先登录后查看 Coffee Talk 申请状态。
        <Link className="ml-2 font-medium text-primary underline-offset-4 hover:underline" href="/login?next=%2Fservices%2Fcoffee-talk%2Fmy">
          前往登录
        </Link>
      </div>
    )
  }

  if (applications === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载申请记录…</p>
  }

  const items = (applications as MyCoffeeTalkApplication[]).map(itemForApplication)
  return (
    <div className="space-y-4">
      {actionError ? <p className="text-sm text-red-700" role="alert">{actionError}</p> : null}
      <CoffeeTalkApplicationList
        applications={items}
        emptyMessage="暂时没有 Coffee Talk 申请。"
        onAction={handleAction}
      />
    </div>
  )
}
