"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Check, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ManagedResearchGroupPerson } from "@/types/institute"

export type ResearchGroupManagedPerson =
  Omit<ManagedResearchGroupPerson, "id" | "userId" | "username" | "identityType"> &
  Pick<Partial<ManagedResearchGroupPerson>, "username" | "identityType" | "otherGroupName"> & {
    userId: string
  }

type ResearchGroupMemberManagerProps = {
  leader?: ResearchGroupManagedPerson | null
  members: ResearchGroupManagedPerson[]
  candidates: ResearchGroupManagedPerson[]
  disabled?: boolean
  reorderDisabled?: boolean
  onAdd: (userId: string, subtitle?: string) => Promise<unknown>
  onRemove: (userId: string) => Promise<unknown>
  onSaveSubtitle: (userId: string, subtitle?: string) => Promise<unknown>
  onReorder: (orderedUserIds: string[]) => Promise<unknown>
}

const identityLabels: Record<string, string> = {
  undergrad: "本科生",
  graduate: "研究生",
  teacher: "教师",
  other: "其他成员",
}

function MemberSubtitle({
  member,
  disabled,
  onSave,
}: {
  member: ResearchGroupManagedPerson
  disabled: boolean
  onSave: (subtitle?: string) => Promise<unknown>
}) {
  const [subtitle, setSubtitle] = useState(member.subtitle ?? "")
  const [saving, setSaving] = useState(false)

  return (
    <div className="mt-3 flex items-center gap-2">
      <label className="sr-only" htmlFor={`member-subtitle-${member.userId}`}>编辑 {member.name} 的成员说明</label>
      <input
        id={`member-subtitle-${member.userId}`}
        value={subtitle}
        onChange={(event) => setSubtitle(event.target.value)}
        placeholder="成员说明"
        disabled={disabled || saving}
        className="aia-focus min-w-0 flex-1 border aia-border-rule bg-transparent px-2.5 py-2 text-xs text-[hsl(var(--aia-ink))]"
      />
      <button
        type="button"
        aria-label={`保存 ${member.name} 的成员说明`}
        className="aia-focus inline-flex min-h-11 min-w-11 items-center justify-center text-[hsl(var(--aia-ink))] disabled:opacity-40"
        disabled={disabled || saving || subtitle.trim() === (member.subtitle ?? "").trim()}
        onClick={() => {
          setSaving(true)
          void onSave(subtitle.trim() || undefined).finally(() => setSaving(false))
        }}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ResearchGroupMemberManager({
  leader,
  members,
  candidates,
  disabled = false,
  reorderDisabled = false,
  onAdd,
  onRemove,
  onSaveSubtitle,
  onReorder,
}: ResearchGroupMemberManagerProps) {
  const [candidateUserId, setCandidateUserId] = useState("")
  const [newSubtitle, setNewSubtitle] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const candidateOptions = useMemo(() => candidates.filter((candidate) => candidate.userId !== leader?.userId), [candidates, leader?.userId])

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key)
    setMessage(null)
    try {
      await action()
      setMessage(success)
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。")
      return false
    } finally {
      setPending(null)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= members.length) return
    const reordered = [...members]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    await run("order", () => onReorder(reordered.map((member) => member.userId)), "成员顺序已更新。")
  }

  return (
    <section aria-labelledby="group-members-manager-title" className="min-w-0 border-t aia-border-rule pt-7">
      <p className="aia-kicker">People</p>
      <h2 id="group-members-manager-title" className="aia-serif mt-2 flex items-baseline gap-3 text-xl font-semibold text-[hsl(var(--aia-ink))]">
        人员管理
        <span className="aia-mono text-xs font-normal aia-text-muted">{members.length + (leader ? 1 : 0)} 人</span>
      </h2>

      {leader ? (
        <div className="mt-5 border-y aia-border-rule py-4">
          <p className="aia-mono text-[0.68rem] uppercase tracking-[0.14em] text-[hsl(var(--aia-red))]">负责人 · 固定首位</p>
          <p className="aia-serif mt-1.5 font-semibold text-[hsl(var(--aia-ink))]">{leader.name}</p>
          {leader.username ? <p className="aia-mono aia-text-muted mt-1 text-xs">{leader.username}</p> : null}
        </div>
      ) : null}

      {members.length > 0 ? (
        <ol className="border-b aia-border-rule">
          {members.map((member, index) => (
            <li key={member.userId} className="border-t aia-border-rule py-4">
              <div className="flex items-start gap-3">
                <span className="aia-mono aia-text-muted mt-1 w-6 shrink-0 text-xs">{String(index + 2).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="aia-serif font-semibold text-[hsl(var(--aia-ink))]">{member.name}</p>
                  <p className="aia-mono aia-text-muted mt-1 text-xs">
                    {member.identityType ? identityLabels[member.identityType] ?? "其他成员" : "成员"}
                    {member.username ? ` · ${member.username}` : ""}
                  </p>
                  <MemberSubtitle
                    member={member}
                    disabled={disabled || pending !== null}
                    onSave={(subtitle) => run(`subtitle-${member.userId}`, () => onSaveSubtitle(member.userId, subtitle), `已更新 ${member.name} 的成员说明。`)}
                  />
                </div>
                <div className="flex shrink-0 items-center">
                  <button type="button" aria-label={`上移 ${member.name}`} title={`上移 ${member.name}`} disabled={disabled || reorderDisabled || pending !== null || index === 0} onClick={() => void move(index, -1)} className="aia-focus inline-flex min-h-11 min-w-11 items-center justify-center aia-text-muted hover:text-[hsl(var(--aia-ink))] disabled:opacity-25">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`下移 ${member.name}`} title={`下移 ${member.name}`} disabled={disabled || reorderDisabled || pending !== null || index === members.length - 1} onClick={() => void move(index, 1)} className="aia-focus inline-flex min-h-11 min-w-11 items-center justify-center aia-text-muted hover:text-[hsl(var(--aia-ink))] disabled:opacity-25">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="aia-link aia-focus ml-1 min-h-11 px-2 py-1 text-xs" disabled={disabled || pending !== null} onClick={() => void run(`remove-${member.userId}`, () => onRemove(member.userId), `已将 ${member.name} 移出课题组。`)}>
                    移除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="aia-text-muted border-b aia-border-rule py-5 text-sm">暂无普通成员；负责人会始终保留在首位。</p>}

      <div className="mt-7">
        <h3 className="aia-serif text-base font-semibold text-[hsl(var(--aia-ink))]">添加成员</h3>
        <div className="mt-3 grid gap-2">
          <label className="sr-only" htmlFor="group-candidate">选择成员账号</label>
          <select id="group-candidate" value={candidateUserId} onChange={(event) => setCandidateUserId(event.target.value)} disabled={disabled || pending !== null} className="aia-focus h-10 w-full border aia-border-rule bg-transparent px-2.5 text-sm text-[hsl(var(--aia-ink))]">
            <option value="">选择院内账号…</option>
            {candidateOptions.map((candidate) => (
              <option key={candidate.userId} value={candidate.userId}>
                {candidate.name}
                {candidate.username ? `（${candidate.username}）` : ""}
                {candidate.otherGroupName ? ` · 当前：${candidate.otherGroupName}` : ""}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="group-new-member-subtitle">成员说明</label>
          <input id="group-new-member-subtitle" value={newSubtitle} onChange={(event) => setNewSubtitle(event.target.value)} placeholder="成员说明（可选）" disabled={disabled || pending !== null} className="aia-focus h-10 w-full border aia-border-rule bg-transparent px-2.5 text-sm text-[hsl(var(--aia-ink))]" />
          <Button
            type="button"
            disabled={disabled || pending !== null || !candidateUserId}
            onClick={() => void run("add", () => onAdd(candidateUserId, newSubtitle.trim() || undefined), "成员已加入课题组。").then((ok) => {
              if (ok) {
                setCandidateUserId("")
                setNewSubtitle("")
              }
            })}
          >
            <UserRound className="mr-1.5 h-4 w-4" aria-hidden="true" />加入课题组
          </Button>
        </div>
      </div>
      {message ? <p role="status" className="aia-text-muted mt-4 text-sm">{message}</p> : null}
    </section>
  )
}
