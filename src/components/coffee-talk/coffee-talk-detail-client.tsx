"use client"

import Link from "next/link"

import {
  CoffeeTalkApplicationDetail,
  type CoffeeTalkApplicationDetailItem,
} from "@/components/coffee-talk/coffee-talk-application-detail"
import type { CoffeeTalkHistoryEvent } from "@/components/coffee-talk/coffee-talk-history"
import type { CoffeeTalkStatus } from "@/lib/coffee-talk"
import {
  useMyCoffeeTalkApplications,
  useTeacherCoffeeTalkApplications,
  useTongClassSessionToken,
} from "@/lib/api"

type CoffeeTalkDetailClientProps = {
  applicationId: string
  mode: "applicant" | "teacher"
}

type RawHistoryEvent = {
  id: string
  sequenceNo: number
  actionLabel: string
  occurredAt: number
  fromStatus?: CoffeeTalkStatus
  toStatus?: CoffeeTalkStatus
  actorLabel?: string
  note?: string
}

type RawApplication = {
  id: string
  topic: string
  status: CoffeeTalkStatus
  version: number
  updatedAt: number
  purpose?: string
  researchBackground?: string
  expectedOutcome?: string
  preferredFormat?: "online" | "offline" | "either"
  availability?: string
  history?: RawHistoryEvent[]
  contact?: { displayName?: string; email?: string }
  applicant?: { applicantName?: string }
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function toHistory(event: RawHistoryEvent): CoffeeTalkHistoryEvent {
  return {
    ...event,
    occurredAtLabel: formatTime(event.occurredAt),
  }
}

function toDetail(application: RawApplication, mode: "applicant" | "teacher"): CoffeeTalkApplicationDetailItem {
  const formatLabels = {
    online: "线上",
    offline: "线下",
    either: "均可",
  } as const
  const contactName = mode === "teacher"
    ? application.contact?.displayName || application.applicant?.applicantName
    : undefined
  return {
    id: application.id,
    title: application.topic,
    status: application.status,
    expectedVersion: application.version,
    updatedAtLabel: formatTime(application.updatedAt),
    ...(application.purpose ? { purpose: application.purpose } : {}),
    ...(application.researchBackground ? { researchBackground: application.researchBackground } : {}),
    ...(application.expectedOutcome ? { expectedOutcome: application.expectedOutcome } : {}),
    ...(application.preferredFormat ? { preferredFormatLabel: formatLabels[application.preferredFormat] } : {}),
    ...(application.availability ? { availabilityLabels: [application.availability] } : {}),
    ...(contactName ? {
      applicantContact: {
        displayName: contactName,
        ...(application.contact?.email ? { email: application.contact.email } : {}),
      },
    } : {}),
    history: (application.history || []).map(toHistory),
    // State-changing controls remain on the list pages, where note-requiring
    // actions have their confirmation dialogs.
    allowedActions: [],
  }
}

export function CoffeeTalkDetailClient({ applicationId, mode }: CoffeeTalkDetailClientProps) {
  const sessionToken = useTongClassSessionToken()
  const applicantApplications = useMyCoffeeTalkApplications()
  const teacherApplications = useTeacherCoffeeTalkApplications()
  const applications = mode === "applicant" ? applicantApplications : teacherApplications
  const loginNext = `/services/coffee-talk/${mode === "applicant" ? "my" : "manage"}/${applicationId}`

  if (!sessionToken) {
    return (
      <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6">
        请先登录后查看这条 Coffee Talk 申请。
        <Link className="aia-link ml-2" href={`/login?next=${encodeURIComponent(loginNext)}`}>前往登录</Link>
      </p>
    )
  }
  if (applications === undefined) return <p className="aia-text-muted py-8 text-sm" role="status">正在加载申请详情…</p>
  const application = (applications as RawApplication[]).find((item) => item.id === applicationId)
  if (!application) {
    return <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6" role="alert">未找到该申请，或当前账户没有访问权限。</p>
  }
  return <CoffeeTalkApplicationDetail application={toDetail(application, mode)} />
}
