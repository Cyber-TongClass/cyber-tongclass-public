"use client"

import { useMemo, useState } from "react"
import { Link2, ShieldCheck, Unlink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useBindInstitutePersonAccount,
  useClearTeacherReviewerBinding,
  useInstituteAccountBindingCandidates,
  useIsSuperAdmin,
  useReviewerAccounts,
  useSetAccountCapability,
  useSetCoffeeTalkTeacherAvailability,
  useSyncExistingTeacherCoffeeTalkProfiles,
  useUpsertTeacherReviewerBinding,
} from "@/lib/api"

type BindingCandidateUser = {
  id: string
  username: string
  englishName: string
  chineseName?: string
  identityType?: string
}

type BindingCandidatePerson = {
  slug: string
  kind: "teacher" | "graduate"
  nameZh: string
  nameEn: string
  accountUserId?: string
  coffeeTalkOpen?: boolean
  groupManagementEnabled?: boolean
}

type ReviewerRecord = {
  _id: string
  username: string
  displayName: string
  enabled: boolean
}

function displayAccount(user: BindingCandidateUser): string {
  return [user.chineseName, user.englishName, `@${user.username}`]
    .filter(Boolean)
    .join(" · ")
}

function personKindLabel(kind: BindingCandidatePerson["kind"]): string {
  return kind === "teacher" ? "教师" : "研究生"
}

export default function InstituteBindingsPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const candidates = useInstituteAccountBindingCandidates() as {
    people: BindingCandidatePerson[]
    users: BindingCandidateUser[]
  } | undefined
  const reviewers = useReviewerAccounts() as ReviewerRecord[] | undefined
  const bindPersonAccount = useBindInstitutePersonAccount()
  const setAccountCapability = useSetAccountCapability()
  const setCoffeeTalkTeacherAvailability = useSetCoffeeTalkTeacherAvailability()
  const syncExistingTeacherCoffeeTalkProfiles = useSyncExistingTeacherCoffeeTalkProfiles()
  const upsertTeacherReviewerBinding = useUpsertTeacherReviewerBinding()
  const clearTeacherReviewerBinding = useClearTeacherReviewerBinding()
  const [accountDrafts, setAccountDrafts] = useState<Record<string, string>>({})
  const [selectedReviewerId, setSelectedReviewerId] = useState("")
  const [selectedTeacherAccountId, setSelectedTeacherAccountId] = useState("")
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const usersById = useMemo(() => new Map(
    (candidates?.users ?? []).map((user) => [user.id, user]),
  ), [candidates?.users])
  const boundAccountIds = useMemo(() => new Set(
    (candidates?.people ?? [])
      .map((person) => person.accountUserId)
      .filter((accountUserId): accountUserId is string => Boolean(accountUserId)),
  ), [candidates?.people])
  const teacherAccounts = useMemo(() => (
    (candidates?.people ?? [])
      .filter((person) => person.kind === "teacher" && person.accountUserId)
      .map((person) => ({
        person,
        user: usersById.get(person.accountUserId as string),
      }))
      .filter((item): item is { person: BindingCandidatePerson; user: BindingCandidateUser } => Boolean(item.user))
  ), [candidates?.people, usersById])

  const updateAccountDraft = (personSlug: string, accountUserId: string) => {
    setAccountDrafts((current) => ({ ...current, [personSlug]: accountUserId }))
  }

  const savePersonBinding = async (person: BindingCandidatePerson) => {
    const accountUserId = accountDrafts[person.slug] ?? person.accountUserId ?? ""
    setPendingKey(`person:${person.slug}`)
    setMessage(null)
    try {
      await bindPersonAccount({
        personSlug: person.slug,
        ...(accountUserId ? { accountUserId } : {}),
      })
      setMessage(accountUserId ? "目录账户绑定已保存。" : "目录账户绑定已解除。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存目录账户绑定失败。")
    } finally {
      setPendingKey(null)
    }
  }

  const saveTeacherReviewerBinding = async () => {
    if (!selectedReviewerId || !selectedTeacherAccountId) {
      setMessage("请选择独立 Reviewer 账号和已绑定的教师主站账号。")
      return
    }

    setPendingKey("teacher-reviewer")
    setMessage(null)
    try {
      await upsertTeacherReviewerBinding({
        reviewerAccountId: selectedReviewerId,
        mainUserId: selectedTeacherAccountId,
      })
      setMessage("教师 Reviewer 授权已保存。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存教师 Reviewer 授权失败。")
    } finally {
      setPendingKey(null)
    }
  }

  const updateCoffeeTalkAvailability = async (person: BindingCandidatePerson) => {
    if (person.kind !== "teacher") return
    setPendingKey(`coffee:${person.slug}`)
    setMessage(null)
    try {
      await setCoffeeTalkTeacherAvailability({
        teacherSlug: person.slug,
        open: person.coffeeTalkOpen !== true,
      })
      setMessage(person.coffeeTalkOpen === true ? "已关闭该教师的 Coffee Talk 申请入口。" : "已开放该教师的 Coffee Talk 申请入口。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新 Coffee Talk 开放状态失败。")
    } finally {
      setPendingKey(null)
    }
  }

  const updateGroupManagementCapability = async (person: BindingCandidatePerson) => {
    if (person.kind !== "teacher" || !person.accountUserId) return
    setPendingKey(`group-management:${person.slug}`)
    setMessage(null)
    try {
      await setAccountCapability({
        userId: person.accountUserId,
        capability: "manage_research_group_members",
        enabled: person.groupManagementEnabled !== true,
      })
      setMessage(person.groupManagementEnabled === true ? "已关闭该教师的课题组成员管理权限；现有课题组和成员已保留。" : "已开放该教师的课题组成员管理权限。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新课题组成员管理权限失败。")
    } finally {
      setPendingKey(null)
    }
  }

  const syncExistingTeacherProfiles = async () => {
    setPendingKey("coffee-sync")
    setMessage(null)
    try {
      const result = await syncExistingTeacherCoffeeTalkProfiles() as { created: number; skipped: number; conflicts: number }
      setMessage(`已同步教师资源：新增或补全 ${result.created}，已存在 ${result.skipped}，需人工处理冲突 ${result.conflicts}。`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步教师资源失败。")
    } finally {
      setPendingKey(null)
    }
  }

  const clearReviewerBinding = async (reviewerAccountId: string) => {
    setPendingKey(`reviewer:${reviewerAccountId}`)
    setMessage(null)
    try {
      await clearTeacherReviewerBinding(reviewerAccountId)
      setMessage("教师 Reviewer 授权已解除；独立 Reviewer 账号保持不变。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "解除教师 Reviewer 授权失败。")
    } finally {
      setPendingKey(null)
    }
  }

  if (isSuperAdmin === undefined || candidates === undefined || reviewers === undefined) {
    return <p className="text-sm text-slate-600" role="status">正在加载研究院绑定管理…</p>
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader><CardTitle>需要超级管理员权限</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-6 text-slate-600">目录与教师 Reviewer 的绑定只能由超级管理员建立或解除。</p></CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">AIA 管理</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-950">研究院账户与教师授权</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          教师账号创建后会默认获得私有课题组和成员管理权限。这里可同步历史教师账号，并管理教师目录归属、成员管理权限和 Reviewer 授权。
        </p>
      </div>

      {message ? <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" role="status">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />目录人员绑定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-slate-600">一个主站账号最多绑定一位研究院目录人员。历史教师账号可在此一次性同步默认 Coffee Talk 档案、私有课题组和成员管理权限。</p>
            <Button type="button" variant="outline" onClick={() => { void syncExistingTeacherProfiles() }} disabled={pendingKey === "coffee-sync"}>
              {pendingKey === "coffee-sync" ? "同步中…" : "同步已有教师资源"}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">目录人员</th>
                  <th className="px-4 py-3 font-medium">身份</th>
                  <th className="px-4 py-3 font-medium">主站账号</th>
                  <th className="px-4 py-3 font-medium">Coffee Talk 开放状态</th>
                  <th className="px-4 py-3 font-medium">成员管理权限</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {candidates.people.map((person) => {
                  const selectedAccountId = accountDrafts[person.slug] ?? person.accountUserId ?? ""
                  const availableUsers = candidates.users.filter((user) => (
                    !boundAccountIds.has(user.id) || user.id === person.accountUserId
                  ))
                  return (
                    <tr key={person.slug} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-950">{person.nameZh || person.nameEn}<span className="ml-2 text-xs font-normal text-slate-500">{person.nameEn}</span></td>
                      <td className="px-4 py-3"><Badge className="bg-slate-100 text-slate-700">{personKindLabel(person.kind)}</Badge></td>
                      <td className="px-4 py-3">
                        <select
                          className="h-9 min-w-[300px] rounded-md border border-slate-300 bg-white px-3 text-sm"
                          value={selectedAccountId}
                          onChange={(event) => updateAccountDraft(person.slug, event.target.value)}
                          aria-label={`选择${person.nameZh || person.nameEn}的主站账号`}
                        >
                          <option value="">未绑定</option>
                          {availableUsers.map((user) => <option key={user.id} value={user.id}>{displayAccount(user)}{user.identityType ? ` · ${user.identityType}` : ""}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {person.kind === "teacher" ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => { void updateCoffeeTalkAvailability(person) }} disabled={pendingKey === `coffee:${person.slug}`}>
                            {pendingKey === `coffee:${person.slug}` ? "更新中…" : person.coffeeTalkOpen === true ? "已开放（关闭）" : "已关闭（开放）"}
                          </Button>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {person.kind === "teacher" && person.accountUserId ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => { void updateGroupManagementCapability(person) }} disabled={pendingKey === `group-management:${person.slug}`}>
                            {pendingKey === `group-management:${person.slug}` ? "更新中…" : person.groupManagementEnabled === true ? "已开放（关闭）" : "已关闭（开放）"}
                          </Button>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" size="sm" onClick={() => { void savePersonBinding(person) }} disabled={pendingKey === `person:${person.slug}`}>
                          {pendingKey === `person:${person.slug}` ? "保存中…" : "保存绑定"}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />教师 Reviewer 授权</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">将已绑定教师的主站账号关联到一个启用的独立 Reviewer 账号后，该教师可通过主站会话获得受限的 Reviewer 访问能力。</p>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              独立 Reviewer 账号
              <select className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal" value={selectedReviewerId} onChange={(event) => setSelectedReviewerId(event.target.value)}>
                <option value="">请选择</option>
                {reviewers.filter((reviewer) => reviewer.enabled).map((reviewer) => <option key={reviewer._id} value={reviewer._id}>{reviewer.displayName} · @{reviewer.username}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              已绑定的教师主站账号
              <select className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal" value={selectedTeacherAccountId} onChange={(event) => setSelectedTeacherAccountId(event.target.value)}>
                <option value="">请选择</option>
                {teacherAccounts.map(({ person, user }) => <option key={user.id} value={user.id}>{person.nameZh || person.nameEn} · {displayAccount(user)}</option>)}
              </select>
            </label>
            <Button type="button" onClick={() => { void saveTeacherReviewerBinding() }} disabled={pendingKey === "teacher-reviewer"}>
              <ShieldCheck className="mr-2 h-4 w-4" />{pendingKey === "teacher-reviewer" ? "保存中…" : "授予教师 Reviewer"}
            </Button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">解除既有教师授权</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {reviewers.map((reviewer) => (
                <Button key={reviewer._id} type="button" size="sm" variant="outline" disabled={pendingKey === `reviewer:${reviewer._id}`} onClick={() => { void clearReviewerBinding(reviewer._id) }}>
                  <Unlink className="mr-2 h-4 w-4" />{pendingKey === `reviewer:${reviewer._id}` ? "处理中…" : `解除 ${reviewer.displayName}`}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
