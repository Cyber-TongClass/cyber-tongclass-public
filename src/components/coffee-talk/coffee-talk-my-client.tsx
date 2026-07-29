"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  CoffeeTalkApplicationList,
  type CoffeeTalkApplicationListItem,
} from "@/components/coffee-talk/coffee-talk-application-list"
import {
  type CoffeeTalkAction,
  coffeeTalkActionLabel,
  coffeeTalkErrorMessage,
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
  applicant: {
    applicantName: string
    email: string
    affiliation: string
    identityLabel: string
  } | null
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
    .filter((action) => action === "withdraw" || action === "supplement")
    .map((action) => ({
      id: action,
      label: coffeeTalkActionLabel(action),
      tone: action === "withdraw" ? "destructive" as const : "default" as const,
    }))

  return {
    id: application.id,
    title: application.topic,
    participantLabel: [
      application.teacher
        ? `交流教师：${application.teacher.nameZh || application.teacher.nameEn}`
        : "交流教师资料暂不可用",
      application.applicant
        ? `申请资料：${application.applicant.applicantName} · ${application.applicant.email} · ${application.applicant.affiliation} · ${application.applicant.identityLabel}`
        : "申请人资料暂不可用",
    ].join(" · "),
    status: application.status,
    expectedVersion: application.version,
    updatedAtLabel: formatUpdatedAt(application.updatedAt),
    href: `/services/coffee-talk/my/${application.id}`,
    allowedActions,
  }
}

/** Current-user list UI backed only by the session-aware API wrapper. */
export function CoffeeTalkMyClient() {
  const sessionToken = useTongClassSessionToken()
  const applications = useMyCoffeeTalkApplications()
  const actOnApplication = useActOnCoffeeTalkApplication()
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [supplementItem, setSupplementItem] = useState<CoffeeTalkApplicationListItem | null>(null)
  const [supplementNote, setSupplementNote] = useState("")

  async function performAction(
    item: CoffeeTalkApplicationListItem,
    action: "withdraw" | "supplement",
    note?: string,
  ) {
    if (pendingAction || item.expectedVersion === undefined) return false
    setActionError(null)
    setPendingAction(`${item.id}:${action}`)
    try {
      await actOnApplication({
        applicationId: item.id,
        expectedVersion: item.expectedVersion,
        action,
        ...(note ? { note } : {}),
      })
      return true
    } catch (error) {
      setActionError(coffeeTalkErrorMessage(error, "操作未成功完成。申请状态可能已更新，请刷新后重试。"))
      return false
    } finally {
      setPendingAction(null)
    }
  }

  function handleAction(item: CoffeeTalkApplicationListItem, action: { id: string }) {
    if (action.id === "supplement") {
      setSupplementNote("")
      setSupplementItem(item)
      return
    }
    if (action.id === "withdraw") void performAction(item, "withdraw")
  }

  async function submitSupplement() {
    const note = supplementNote.trim()
    if (!supplementItem || !note) return
    if (await performAction(supplementItem, "supplement", note)) {
      setSupplementItem(null)
      setSupplementNote("")
    }
  }

  if (!sessionToken) {
    return (
      <div className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6">
        请先登录后查看 Coffee Talk 申请状态。
        <Link className="aia-link ml-2" href="/login?next=%2Fservices%2Fcoffee-talk%2Fmy">
          前往登录
        </Link>
      </div>
    )
  }

  if (applications === undefined) {
    return <p className="aia-text-muted py-6 text-sm" role="status">正在加载申请记录…</p>
  }

  const items = (applications as MyCoffeeTalkApplication[]).map(itemForApplication)
  return (
    <div className="space-y-4">
      {actionError ? <p className="text-sm text-[hsl(var(--aia-red))]" role="alert">{actionError}</p> : null}
      {pendingAction ? <p className="aia-text-muted text-sm" role="status">正在提交操作…</p> : null}
      <CoffeeTalkApplicationList
        applications={items}
        emptyMessage="暂时没有 Coffee Talk 申请。"
        onAction={pendingAction ? undefined : handleAction}
      />
      <Dialog open={supplementItem !== null} onOpenChange={(open) => {
        if (!open && !pendingAction) setSupplementItem(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>补充申请信息</DialogTitle>
            <DialogDescription>
              为“{supplementItem?.title || "Coffee Talk 申请"}”填写需要补充的内容。提交前可检查或取消。
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="coffee-talk-supplement-note" className="text-sm font-medium">
              补充内容
            </label>
            <Textarea
              id="coffee-talk-supplement-note"
              className="mt-2 min-h-32"
              value={supplementNote}
              maxLength={2000}
              disabled={pendingAction !== null}
              onChange={(event) => setSupplementNote(event.target.value)}
              aria-describedby="coffee-talk-supplement-count"
            />
            <p id="coffee-talk-supplement-count" className="aia-text-muted mt-1 text-xs">
              已填写 {supplementNote.length} / 2000 字
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendingAction !== null} onClick={() => setSupplementItem(null)}>
              取消
            </Button>
            <Button type="button" disabled={!supplementNote.trim() || pendingAction !== null} onClick={() => void submitSupplement()}>
              确认补充
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
