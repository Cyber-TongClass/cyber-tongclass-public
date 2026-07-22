"use client"

import Link from "next/link"
import { useState } from "react"

import {
  CoffeeTalkApplicationList,
  type CoffeeTalkApplicationListItem,
} from "@/components/coffee-talk/coffee-talk-application-list"
import type { CoffeeTalkAllowedAction } from "@/components/coffee-talk/coffee-talk-application-detail"
import {
  type CoffeeTalkAction,
  coffeeTalkActionLabel,
  type CoffeeTalkStatus,
} from "@/lib/coffee-talk"
import {
  useActOnCoffeeTalkApplication,
  useTeacherCoffeeTalkApplications,
  useTongClassSessionToken,
} from "@/lib/api"

const teacherManageActions = [
  "start_review",
  "accept",
  "decline",
  "complete",
] as const

type TeacherManageAction = (typeof teacherManageActions)[number]

type TeacherCoffeeTalkApplication = {
  id: string
  status: CoffeeTalkStatus
  topic: string
  contact: { displayName?: string; email?: string }
  applicant: {
    applicantName: string
    affiliation: string
    identityLabel: string
  } | null
  version: number
  updatedAt: number
  allowedActions: readonly CoffeeTalkAction[]
}

function isTeacherManageAction(action: string): action is TeacherManageAction {
  return teacherManageActions.includes(action as TeacherManageAction)
}

function actionTone(action: TeacherManageAction): CoffeeTalkAllowedAction["tone"] {
  if (action === "decline") return "destructive"
  if (action === "accept" || action === "complete") return "default"
  return "outline"
}

function formatUpdatedAt(value: number): string {
  if (!Number.isFinite(value)) return "刚刚"
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function itemForApplication(application: TeacherCoffeeTalkApplication): CoffeeTalkApplicationListItem {
  const allowedActions = application.allowedActions
    .filter(isTeacherManageAction)
    .map((action) => ({
      id: action,
      label: coffeeTalkActionLabel(action),
      tone: actionTone(action),
    }))

  return {
    id: application.id,
    title: application.topic,
    participantLabel: [
      application.applicant
        ? `申请人：${application.applicant.applicantName} · ${application.applicant.affiliation} · ${application.applicant.identityLabel}`
        : "申请人资料暂不可用",
      application.contact.email ? `邮箱：${application.contact.email}` : null,
    ].filter(Boolean).join(" · "),
    status: application.status,
    expectedVersion: application.version,
    updatedAtLabel: formatUpdatedAt(application.updatedAt),
    allowedActions,
  }
}

/** Teacher-only Coffee Talk action console, backed by explicit server authority. */
export function CoffeeTalkTeacherManageClient() {
  const sessionToken = useTongClassSessionToken()
  const applications = useTeacherCoffeeTalkApplications()
  const actOnApplication = useActOnCoffeeTalkApplication()
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  async function handleAction(item: CoffeeTalkApplicationListItem, action: { id: string }) {
    if (pendingAction || item.expectedVersion === undefined || !isTeacherManageAction(action.id)) return

    setActionError(null)
    setPendingAction(`${item.id}:${action.id}`)
    try {
      await actOnApplication({
        applicationId: item.id,
        expectedVersion: item.expectedVersion,
        action: action.id,
      })
    } catch {
      setActionError("操作未成功完成。申请状态可能已更新，请刷新后重试。")
    } finally {
      setPendingAction(null)
    }
  }

  if (!sessionToken) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        请先登录已绑定的教师账户后查看 Coffee Talk 申请。
        <Link className="ml-2 font-medium text-primary underline-offset-4 hover:underline" href="/login?next=%2Fservices%2Fcoffee-talk%2Fmanage">
          前往登录
        </Link>
      </div>
    )
  }

  if (applications === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载待处理申请…</p>
  }

  const items = (applications as TeacherCoffeeTalkApplication[]).map(itemForApplication)
  return (
    <div className="space-y-4">
      {actionError ? <p className="text-sm text-red-700" role="alert">{actionError}</p> : null}
      {pendingAction ? <p className="text-sm text-slate-600" role="status">正在提交操作…</p> : null}
      <CoffeeTalkApplicationList
        applications={items}
        emptyMessage="当前没有需要您处理的 Coffee Talk 申请。"
        onAction={pendingAction ? undefined : handleAction}
      />
    </div>
  )
}
