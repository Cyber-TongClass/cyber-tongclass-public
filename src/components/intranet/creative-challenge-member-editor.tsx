"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Search, Trash2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CreativeChallengeMember } from "@/lib/creative-challenge-2026"
import { normalizeCreativeChallengeMembers } from "@/lib/creative-challenge-2026"
import { cn } from "@/lib/utils"
import type { User } from "@/types"

type MemberRow = CreativeChallengeMember & {
  key: string
  confirmedUserId?: string
  declinedUserId?: string
  message?: string
}

type CreativeChallengeMemberEditorProps = {
  value: CreativeChallengeMember[]
  users: User[]
  onChange: (members: CreativeChallengeMember[]) => void
  onValidationChange?: (hasUnresolvedMatch: boolean) => void
  maxMembers?: number
  error?: string
}

function createKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function displayUserName(user: User) {
  return user.chineseName ? `${user.chineseName} / ${user.englishName}` : user.englishName
}

function userSearchValues(user: User) {
  return [
    user.englishName,
    user.chineseName || "",
    user.username,
    user.email,
    user.studentId,
  ].filter(Boolean)
}

function buildRow(member?: CreativeChallengeMember): MemberRow {
  return {
    key: createKey(),
    name: member?.name || "",
    role: member?.role || "",
    isTongClass: member?.isTongClass || false,
    userId: member?.userId,
    username: member?.username,
    studentId: member?.studentId,
    confirmedUserId: member?.isTongClass && member.userId ? String(member.userId) : undefined,
  }
}

function findExactUserByName(users: User[], name: string) {
  const target = normalize(name)
  if (!target) return null

  return users.find((user) => userSearchValues(user).some((value) => normalize(value) === target)) || null
}

function findCandidateUsers(users: User[], query: string, limit = 5) {
  const target = normalize(query)
  if (!target) return []

  return users
    .map((user) => {
      const values = userSearchValues(user).map(normalize)
      const exact = values.some((value) => value === target)
      const startsWith = values.some((value) => value.startsWith(target))
      const includes = values.some((value) => value.includes(target))
      if (!exact && !startsWith && !includes) return null

      const score = exact ? 3 : startsWith ? 2 : 1
      return { user, score }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (!left || !right) return 0
      return right.score - left.score || displayUserName(left.user).localeCompare(displayUserName(right.user), "zh-CN")
    })
    .slice(0, limit)
    .map((item) => item!.user)
}

function hasUnresolvedMemberMatch(rows: MemberRow[], users: User[]) {
  return rows.some((row) => {
    const matchedUser = findExactUserByName(users, row.name)
    if (!matchedUser) return false

    const matchedUserId = String(matchedUser._id)
    return row.confirmedUserId !== matchedUserId && row.declinedUserId !== matchedUserId
  })
}

function toMember(row: MemberRow): CreativeChallengeMember | null {
  const name = row.name.trim()
  if (!name) return null

  return {
    name,
    role: "",
    ...(row.isTongClass && row.userId ? { isTongClass: true, userId: String(row.userId) } : {}),
    ...(row.username ? { username: row.username } : {}),
    ...(row.studentId ? { studentId: row.studentId } : {}),
  }
}

function serializeRows(rows: MemberRow[]) {
  const members = rows
    .map(toMember)
    .filter(Boolean) as CreativeChallengeMember[]

  return JSON.stringify(members)
}

export function CreativeChallengeMemberEditor({
  value,
  users,
  onChange,
  onValidationChange,
  maxMembers = 3,
  error,
}: CreativeChallengeMemberEditorProps) {
  const lastEmittedValue = useRef<string | null>(null)
  const [rows, setRows] = useState<MemberRow[]>(() => {
    const members = normalizeCreativeChallengeMembers(value)
    return members.length > 0 ? members.map(buildRow) : [buildRow()]
  })
  const rowsRef = useRef(rows)

  const userMap = useMemo(() => new Map(users.map((user) => [String(user._id), user])), [users])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    const incomingValue = JSON.stringify(normalizeCreativeChallengeMembers(value))
    if (incomingValue === lastEmittedValue.current && serializeRows(rowsRef.current) === incomingValue) {
      onValidationChange?.(hasUnresolvedMemberMatch(rowsRef.current, users))
      return
    }

    const members = normalizeCreativeChallengeMembers(value)
    const nextRows = members.length > 0 ? members.map(buildRow) : [buildRow()]
    setRows(nextRows)
    onValidationChange?.(hasUnresolvedMemberMatch(nextRows, users))
  }, [onValidationChange, users, value])

  function emitChange(nextRows: MemberRow[]) {
    const members = nextRows
      .map(toMember)
      .filter(Boolean) as CreativeChallengeMember[]

    lastEmittedValue.current = JSON.stringify(members)
    setRows(nextRows)
    onValidationChange?.(hasUnresolvedMemberMatch(nextRows, users))
    onChange(members)
  }

  function updateRow(key: string, patch: Partial<MemberRow>) {
    emitChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function handleNameChange(key: string, name: string) {
    updateRow(key, {
      name,
      isTongClass: false,
      userId: undefined,
      username: undefined,
      studentId: undefined,
      confirmedUserId: undefined,
      declinedUserId: undefined,
      message: undefined,
    })
  }

  function confirmUser(row: MemberRow, user: User) {
    updateRow(row.key, {
      name: displayUserName(user),
      isTongClass: true,
      userId: String(user._id),
      username: user.username,
      studentId: user.studentId,
      confirmedUserId: String(user._id),
      declinedUserId: undefined,
      message: "已确认通班成员。",
    })
  }

  function declineExactMatch(row: MemberRow, user: User) {
    updateRow(row.key, {
      isTongClass: false,
      userId: undefined,
      username: undefined,
      studentId: undefined,
      confirmedUserId: undefined,
      declinedUserId: String(user._id),
      message: "已选择不是该通班成员，将仅按文本保存。",
    })
  }

  function addRow() {
    if (rows.length >= maxMembers) return
    emitChange([...rows, buildRow()])
  }

  function removeRow(key: string) {
    emitChange(rows.length > 1 ? rows.filter((row) => row.key !== key) : rows)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>核心成员</Label>
        <p className="text-xs text-slate-500">核心成员不超过（含队长） {maxMembers} 人；除队长外最多添加 {maxMembers - 1} 位。输入姓名、拼音、用户名或学号后确认通班成员。</p>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const exactUser = findExactUserByName(users, row.name)
          const exactUserId = exactUser ? String(exactUser._id) : null
          const confirmedUser = row.confirmedUserId ? userMap.get(String(row.confirmedUserId)) : null
          const isDeclinedExactMatch = Boolean(exactUserId && row.declinedUserId === exactUserId)
          const pendingExactUser = exactUser && !confirmedUser && !isDeclinedExactMatch ? exactUser : null
          const candidates = confirmedUser
            ? []
            : findCandidateUsers(users, row.name).filter((user) => String(user._id) !== row.declinedUserId)
          const displayedUser = confirmedUser || pendingExactUser || (isDeclinedExactMatch ? exactUser : null)
          const photo = displayedUser?.realPhoto || displayedUser?.avatar

          return (
            <div key={row.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={row.name}
                    onChange={(event) => handleNameChange(row.key, event.target.value)}
                    placeholder={index === 0 ? "搜索并确认一位核心成员" : "搜索成员姓名"}
                    className="pl-9"
                    required={index === 0}
                  />
                </label>

                {rows.length > 1 ? (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.key)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                ) : null}
              </div>

              {(row.message || displayedUser || candidates.length > 0) && (
                <div
                  className={cn(
                    "mt-3 rounded-md border p-3 text-sm",
                    pendingExactUser || candidates.length > 0
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : confirmedUser
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  )}
                >
                  {displayedUser ? (
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-primary/10 text-primary">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={displayedUser.englishName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold">
                            {(displayedUser.chineseName || displayedUser.englishName || "T").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{displayUserName(displayedUser)}</p>
                        <p className="text-xs text-slate-500">{displayedUser.studentId} · {displayedUser.email}</p>
                      </div>
                      {pendingExactUser ? (
                        <>
                          <Button type="button" size="sm" onClick={() => confirmUser(row, pendingExactUser)}>
                            是他/她
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => declineExactMatch(row, pendingExactUser)}>
                            不是他/她
                          </Button>
                        </>
                      ) : null}
                      {confirmedUser ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => declineExactMatch(row, confirmedUser)}>
                          取消关联
                        </Button>
                      ) : null}
                      {isDeclinedExactMatch && exactUser ? (
                        <Button type="button" size="sm" onClick={() => confirmUser(row, exactUser)}>
                          改为是他/她
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {!confirmedUser && candidates.length > 0 ? (
                    <div className="space-y-2">
                      <p className="font-medium">候选通班成员</p>
                      <div className="grid gap-2">
                        {candidates.map((user) => (
                          <button
                            key={String(user._id)}
                            type="button"
                            onClick={() => confirmUser(row, user)}
                            className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-slate-900">{displayUserName(user)}</span>
                              <span className="block truncate text-xs text-slate-500">{user.studentId} · {user.email}</span>
                            </span>
                            <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-primary">
                              <UserCheck className="h-3.5 w-3.5" />
                              确认
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {pendingExactUser ? <p>检测到同名通班成员，请确认是不是他/她。</p> : null}
                  {row.message ? <p>{row.message}</p> : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Button type="button" variant="outline" onClick={addRow} disabled={rows.length >= maxMembers - 1}>
        <Plus className="mr-2 h-4 w-4" />
        添加核心成员
      </Button>
      {rows.length >= maxMembers - 1 ? <p className="text-xs text-slate-500">除队长外最多添加 {maxMembers - 1} 位核心成员。</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
