"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Plus, Trash2, UsersRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  useAddUserGroupMember,
  useCreateUserGroup,
  useDeleteUserGroup,
  useRemoveUserGroupMember,
  useUpdateUserGroup,
  useUserGroups,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { cn } from "@/lib/utils"

type GroupUser = {
  id: string
  username: string
  name: string
  identityType: string
}

type UserGroup = {
  id: string
  name: string
  description: string
  members: GroupUser[]
}

type UserGroupsData = {
  groups: UserGroup[]
  users: GroupUser[]
}

const identityTypeLabels: Record<string, string> = {
  undergrad: "本科生",
  graduate: "研究生",
  teacher: "教师",
  other: "其他",
}

function identityTypeLabel(identityType: string) {
  return identityTypeLabels[identityType] ?? "其他"
}

const inputClass =
  "aia-focus w-full border aia-border-rule bg-transparent px-3 py-2 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"

export default function OrganizationManagementPage() {
  const { isSuperAdmin, isLoading: authLoading, isAuthenticated } = useAuth()
  const data = useUserGroups(isSuperAdmin) as UserGroupsData | undefined
  const createGroup = useCreateUserGroup()
  const updateGroup = useUpdateUserGroup()
  const deleteGroup = useDeleteUserGroup()
  const addMember = useAddUserGroupMember()
  const removeMember = useRemoveUserGroupMember()

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [candidateQuery, setCandidateQuery] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedGroup = useMemo(
    () => data?.groups.find((group) => group.id === selectedGroupId) ?? data?.groups[0] ?? null,
    [data, selectedGroupId],
  )

  useEffect(() => {
    setEditName(selectedGroup?.name ?? "")
    setEditDescription(selectedGroup?.description ?? "")
    setCandidateQuery("")
  }, [selectedGroup?.id, selectedGroup?.name, selectedGroup?.description])

  async function run(action: () => Promise<unknown>) {
    setSaving(true)
    setMessage(null)
    try {
      await action()
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。")
      return false
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || (isSuperAdmin && data === undefined)) {
    return (
      <main className="container-custom py-12">
        <p role="status" className="aia-text-muted py-6 text-sm">正在加载组织管理信息…</p>
      </main>
    )
  }

  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p className="aia-kicker">平台管理 · 组织</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">组织管理</h1>
        <p className="aia-text-muted mt-4 text-sm leading-6">
          只有超级管理员可以管理用户组。
          {!isAuthenticated ? (
            <Link href="/login?next=%2Forganization%2Fmanage" className="aia-link ml-1 font-medium">前往登录</Link>
          ) : null}
        </p>
      </main>
    )
  }

  const memberIds = new Set(selectedGroup?.members.map((member) => member.id) ?? [])
  const candidates = (data?.users ?? []).filter((user) => !memberIds.has(user.id))
  const normalizedCandidateQuery = candidateQuery.trim().toLocaleLowerCase()
  const selectedCandidate = candidates.find((candidate) => (
    candidate.id === candidateQuery
    || candidate.username.toLocaleLowerCase() === normalizedCandidateQuery
    || candidate.name.toLocaleLowerCase() === normalizedCandidateQuery
  ))
  const infoDirty = selectedGroup
    ? editName.trim() !== selectedGroup.name || editDescription.trim() !== selectedGroup.description
    : false

  return (
    <main className="container-custom max-w-6xl py-10 sm:py-12">
      <Link href="/portal" className="aia-link aia-focus text-sm font-medium">
        <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回内网
      </Link>

      <header className="mt-8">
        <p className="aia-kicker">平台管理 · 组织</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">组织管理</h1>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          用户组是面向全院账号的组织单元，可用于表单可见范围与审批范围。一个账号可以同时属于多个用户组。
        </p>
      </header>

      {message ? <p className="aia-text-muted mt-4 text-sm" role="status">{message}</p> : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div>
          <h2 className="flex items-baseline gap-3 border-b aia-border-rule pb-2">
            <span className="aia-serif text-lg font-semibold tracking-tight text-[hsl(var(--aia-ink))]">用户组</span>
            <span className="aia-mono text-xs aia-text-muted">{data?.groups.length ?? 0} 个</span>
          </h2>
          {(data?.groups.length ?? 0) === 0 ? (
            <p className="aia-text-muted py-4 text-sm">暂无用户组，从下方新建。</p>
          ) : (
            <ul className="divide-y divide-[hsl(var(--aia-rule))]">
              {data?.groups.map((group) => {
                const active = selectedGroup?.id === group.id
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={cn(
                        "aia-focus flex w-full items-baseline justify-between gap-3 py-3 text-left transition-colors",
                        active ? "text-[hsl(var(--aia-red))]" : "text-[hsl(var(--aia-ink))] hover:text-[hsl(var(--aia-red))]",
                      )}
                    >
                      <span className={cn("aia-serif text-base", active && "font-semibold")}>{group.name}</span>
                      <span className="aia-mono shrink-0 text-xs aia-text-muted">{group.members.length} 人</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <form
            className="mt-6 border aia-border-rule p-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!newName.trim()) return
              const ok = await run(async () => {
                const id = await createGroup({ name: newName.trim(), description: newDescription.trim() || undefined })
                setSelectedGroupId(String(id))
              })
              if (ok) {
                setMessage(`已创建用户组「${newName.trim()}」。`)
                setNewName("")
                setNewDescription("")
              }
            }}
          >
            <h3 className="aia-mono text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--aia-ink))]">
              新建用户组
            </h3>
            <label className="sr-only" htmlFor="new-group-name">名称</label>
            <input
              id="new-group-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="名称（如：2025 级博士生）"
              maxLength={40}
              className={cn(inputClass, "mt-3")}
            />
            <label className="sr-only" htmlFor="new-group-description">说明</label>
            <input
              id="new-group-description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="说明（可选）"
              maxLength={120}
              className={cn(inputClass, "mt-2")}
            />
            <Button type="submit" size="sm" className="mt-3" disabled={saving || !newName.trim()}>
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              创建
            </Button>
          </form>
        </div>

        <div>
          {!selectedGroup ? (
            <p className="aia-text-muted border border-dashed aia-border-rule p-6 text-sm leading-6">
              选择左侧的用户组查看并管理成员，或新建一个用户组。
            </p>
          ) : (
            <section aria-label={`用户组 ${selectedGroup.name}`}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b aia-border-rule pb-4">
                <div className="min-w-0 flex-1">
                  <label className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted" htmlFor="edit-group-name">
                    名称
                  </label>
                  <input
                    id="edit-group-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={40}
                    className={cn(inputClass, "mt-1")}
                  />
                  <label className="aia-mono mt-3 block text-xs uppercase tracking-[0.12em] aia-text-muted" htmlFor="edit-group-description">
                    说明
                  </label>
                  <input
                    id="edit-group-description"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    placeholder="说明（可选）"
                    maxLength={120}
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || !infoDirty || !editName.trim()}
                    onClick={async () => {
                      const ok = await run(() => updateGroup({
                        groupId: selectedGroup.id,
                        name: editName.trim(),
                        description: editDescription.trim() || undefined,
                      }))
                      if (ok) setMessage("用户组信息已更新。")
                    }}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    保存信息
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[hsl(var(--aia-muted))] hover:text-[hsl(var(--aia-red))]"
                    disabled={saving}
                    onClick={async () => {
                      if (!window.confirm(`确定删除用户组「${selectedGroup.name}」？其成员关系将一并移除，已配置该组的表单范围将不再包含这些成员。`)) return
                      const ok = await run(() => deleteGroup({ groupId: selectedGroup.id }))
                      if (ok) {
                        setMessage(`已删除用户组「${selectedGroup.name}」。`)
                        setSelectedGroupId(null)
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    删除组
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted" htmlFor="add-member-input">
                    添加成员
                  </label>
                  <input
                    id="add-member-input"
                    list="add-member-candidates"
                    value={candidateQuery}
                    onChange={(event) => setCandidateQuery(event.target.value)}
                    placeholder="输入姓名或用户名，也可展开选择…"
                    autoComplete="off"
                    aria-describedby="add-member-hint"
                    className="aia-focus mt-1 h-11 w-full border aia-border-rule bg-transparent px-3 text-sm text-[hsl(var(--aia-ink))]"
                  />
                  <datalist id="add-member-candidates">
                    {candidates.map((user) => (
                      <option key={user.id} value={user.username}>
                        {user.name}（{user.username}）· {identityTypeLabel(user.identityType)}
                      </option>
                    ))}
                  </datalist>
                  <p id="add-member-hint" className="aia-text-muted mt-1.5 text-xs leading-5">
                    可直接输入完整姓名或用户名；也可以从输入框的候选列表中选择。
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-11 shrink-0"
                  disabled={saving || !selectedCandidate}
                  onClick={async () => {
                    if (!selectedCandidate) return
                    const ok = await run(() => addMember({ groupId: selectedGroup.id, userId: selectedCandidate.id }))
                    if (ok) {
                      setMessage(`已将 ${selectedCandidate.name} 加入「${selectedGroup.name}」。`)
                      setCandidateQuery("")
                    }
                  }}
                >
                  <UsersRound className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  加入
                </Button>
              </div>

              {selectedGroup.members.length === 0 ? (
                <p className="aia-text-muted py-6 text-sm">该组暂无成员。</p>
              ) : (
                <ul className="mt-6 border-t aia-border-rule">
                  {selectedGroup.members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-4 border-b aia-border-rule py-3">
                      <div className="min-w-0">
                        <p className="aia-serif text-base font-semibold text-[hsl(var(--aia-ink))]">{member.name}</p>
                        <p className="aia-mono mt-0.5 text-xs aia-text-muted">
                          {identityTypeLabel(member.identityType)} · {member.username}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-[hsl(var(--aia-muted))] hover:text-[hsl(var(--aia-red))]"
                        disabled={saving}
                        onClick={async () => {
                          const ok = await run(() => removeMember({ groupId: selectedGroup.id, userId: member.id }))
                          if (ok) setMessage(`已将 ${member.name} 移出「${selectedGroup.name}」。`)
                        }}
                      >
                        移除
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
