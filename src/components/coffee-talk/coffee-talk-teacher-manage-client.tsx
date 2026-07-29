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
import { Input } from "@/components/ui/input"
import {
  CoffeeTalkApplicationList,
  type CoffeeTalkApplicationListItem,
} from "@/components/coffee-talk/coffee-talk-application-list"
import type { CoffeeTalkAllowedAction } from "@/components/coffee-talk/coffee-talk-application-detail"
import {
  type CoffeeTalkAction,
  coffeeTalkActionLabel,
  coffeeTalkErrorMessage,
  type CoffeeTalkStatus,
} from "@/lib/coffee-talk"
import {
  useActOnCoffeeTalkApplication,
  useCoffeeTalkManageAccess,
  useTeacherCoffeeTalkApplications,
  useTongClassSessionToken,
} from "@/lib/api"

const teacherManageActions = [
  "start_review",
  "accept",
  "decline",
  "request_information",
  "complete",
  "cancel",
  "reassign",
  "correct",
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
  if (action === "decline" || action === "cancel") return "destructive"
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
    href: `/services/coffee-talk/manage/${application.id}`,
    allowedActions,
  }
}

/** Teacher-only Coffee Talk action console, backed by explicit server authority. */
export function CoffeeTalkTeacherManageClient() {
  const sessionToken = useTongClassSessionToken()
  const applications = useTeacherCoffeeTalkApplications()
  const manageAccess = useCoffeeTalkManageAccess() as { mode: "teacher" | "coordinator" | "none" } | undefined
  const actOnApplication = useActOnCoffeeTalkApplication()
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [informationItem, setInformationItem] = useState<CoffeeTalkApplicationListItem | null>(null)
  const [informationNote, setInformationNote] = useState("")
  const [coordinatorAction, setCoordinatorAction] = useState<{ item: CoffeeTalkApplicationListItem; action: "cancel" | "reassign" | "correct" } | null>(null)
  const [coordinatorNote, setCoordinatorNote] = useState("")
  const [reassignmentTeacherSlug, setReassignmentTeacherSlug] = useState("")

  async function performAction(item: CoffeeTalkApplicationListItem, action: TeacherManageAction, note?: string, teacherSlug?: string) {
    if (pendingAction || item.expectedVersion === undefined) return false
    setActionError(null)
    setPendingAction(`${item.id}:${action}`)
    try {
      await actOnApplication({
        applicationId: item.id,
        expectedVersion: item.expectedVersion,
        action,
        ...(note ? { note } : {}),
        ...(teacherSlug ? { teacherSlug } : {}),
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
    if (pendingAction || !isTeacherManageAction(action.id)) return
    if (action.id === "request_information") {
      setInformationNote("")
      setInformationItem(item)
      return
    }
    if (action.id === "cancel" || action.id === "reassign" || action.id === "correct") {
      setCoordinatorNote("")
      setReassignmentTeacherSlug("")
      setCoordinatorAction({ item, action: action.id })
      return
    }
    void performAction(item, action.id)
  }

  async function submitInformationRequest() {
    const note = informationNote.trim()
    if (!informationItem || !note) return
    if (await performAction(informationItem, "request_information", note)) {
      setInformationItem(null)
      setInformationNote("")
    }
  }

  async function submitCoordinatorAction() {
    if (!coordinatorAction) return
    const note = coordinatorNote.trim()
    const teacherSlug = reassignmentTeacherSlug.trim()
    if ((coordinatorAction.action === "cancel" || coordinatorAction.action === "correct") && !note) return
    if (coordinatorAction.action === "reassign" && !teacherSlug) return
    if (await performAction(coordinatorAction.item, coordinatorAction.action, note || undefined, teacherSlug || undefined)) {
      setCoordinatorAction(null)
      setCoordinatorNote("")
      setReassignmentTeacherSlug("")
    }
  }

  if (!sessionToken) {
    return (
      <div className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6">
        请先登录已绑定的教师账户后查看 Coffee Talk 申请。
        <Link className="aia-link ml-2" href="/login?next=%2Fservices%2Fcoffee-talk%2Fmanage">
          前往登录
        </Link>
      </div>
    )
  }

  if (applications === undefined || manageAccess === undefined) {
    return <p className="aia-text-muted py-6 text-sm" role="status">正在加载待处理申请…</p>
  }
  if (manageAccess.mode === "none") {
    return <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6" role="alert">当前账户不是已绑定教师，也没有 Coffee Talk 协调权限，无法进入处理台。</p>
  }

  const items = (applications as TeacherCoffeeTalkApplication[]).map(itemForApplication)
  return (
    <div className="space-y-4">
      {actionError ? <p className="text-sm text-[hsl(var(--aia-red))]" role="alert">{actionError}</p> : null}
      {pendingAction ? <p className="aia-text-muted text-sm" role="status">正在提交操作…</p> : null}
      <CoffeeTalkApplicationList
        applications={items}
        emptyMessage={manageAccess.mode === "coordinator" ? "当前没有可协调的 Coffee Talk 申请。" : "当前没有需要您处理的 Coffee Talk 申请。"}
        onAction={pendingAction ? undefined : handleAction}
      />
      <Dialog open={informationItem !== null} onOpenChange={(open) => {
        if (!open && !pendingAction) setInformationItem(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>要求申请人补充材料</DialogTitle>
            <DialogDescription>
              针对“{informationItem?.title || "Coffee Talk 申请"}”说明缺少的信息；申请人将看到这段文字。
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="coffee-talk-information-note" className="text-sm font-medium">
              补充要求
            </label>
            <Textarea
              id="coffee-talk-information-note"
              className="mt-2 min-h-32"
              value={informationNote}
              maxLength={2000}
              disabled={pendingAction !== null}
              onChange={(event) => setInformationNote(event.target.value)}
              aria-describedby="coffee-talk-information-count"
            />
            <p id="coffee-talk-information-count" className="aia-text-muted mt-1 text-xs">
              已填写 {informationNote.length} / 2000 字
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendingAction !== null} onClick={() => setInformationItem(null)}>
              取消
            </Button>
            <Button type="button" disabled={!informationNote.trim() || pendingAction !== null} onClick={() => void submitInformationRequest()}>
              发送补充要求
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={coordinatorAction !== null} onOpenChange={(open) => {
        if (!open && !pendingAction) setCoordinatorAction(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{coordinatorAction ? coffeeTalkActionLabel(coordinatorAction.action) : "协调操作"}</DialogTitle>
            <DialogDescription>
              {coordinatorAction?.action === "reassign"
                ? "输入目标教师的公开目录 slug；系统会再次校验该教师已开放 Coffee Talk。"
                : "请填写本次操作的原因，申请人会在申请历史中看到。"}
            </DialogDescription>
          </DialogHeader>
          {coordinatorAction?.action === "reassign" ? (
            <div>
              <label htmlFor="coffee-talk-reassign-slug" className="text-sm font-medium">目标教师 slug</label>
              <Input id="coffee-talk-reassign-slug" className="mt-2" value={reassignmentTeacherSlug} onChange={(event) => setReassignmentTeacherSlug(event.target.value)} />
            </div>
          ) : null}
          <div>
            <label htmlFor="coffee-talk-coordinator-note" className="text-sm font-medium">
              {coordinatorAction?.action === "reassign" ? "协调说明（可选）" : "操作原因"}
            </label>
            <Textarea id="coffee-talk-coordinator-note" className="mt-2 min-h-28" maxLength={2000} value={coordinatorNote} onChange={(event) => setCoordinatorNote(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendingAction !== null} onClick={() => setCoordinatorAction(null)}>取消</Button>
            <Button
              type="button"
              disabled={pendingAction !== null || (coordinatorAction?.action === "reassign" ? !reassignmentTeacherSlug.trim() : !coordinatorNote.trim())}
              onClick={() => void submitCoordinatorAction()}
            >
              确认操作
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
