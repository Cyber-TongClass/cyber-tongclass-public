"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  encodePublicationAuthor,
  parsePublicationAuthor,
  type PublicationAuthor,
} from "@/lib/publication-authors"
import type { User } from "@/types"

type AuthorRow = PublicationAuthor & {
  key: string
  confirmedUserId?: string
  declinedUserId?: string
  message?: string
}

type PublicationAuthorEditorProps = {
  value: string[]
  users: User[]
  onChange: (authors: string[]) => void
  onValidationChange?: (hasInvalidTongClassSelection: boolean) => void
  error?: string
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function buildRow(author?: PublicationAuthor): AuthorRow {
  const key = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

  return {
    key,
    name: author?.name || "",
    isTongClass: author?.isTongClass || false,
    userId: author?.userId,
    username: author?.username,
    coFirst: author?.coFirst || false,
    corresponding: author?.corresponding || false,
    confirmedUserId: author?.isTongClass && author.userId ? author.userId : undefined,
  }
}

function findUserByName(users: User[], name: string) {
  const target = normalize(name)
  if (!target) return null

  return users.find((user) => {
    return [
      user.englishName,
      user.chineseName || "",
      user.username,
      user.email,
    ].some((candidate) => normalize(candidate) === target)
  }) || null
}

function hasUnresolvedMemberMatch(rows: AuthorRow[], users: User[]) {
  return rows.some((row) => {
    const matchedUser = findUserByName(users, row.name)
    if (!matchedUser) return false

    const matchedUserId = String(matchedUser._id)
    return row.confirmedUserId !== matchedUserId && row.declinedUserId !== matchedUserId
  })
}

export function PublicationAuthorEditor({ value, users, onChange, onValidationChange, error }: PublicationAuthorEditorProps) {
  const lastEmittedValue = useRef<string | null>(null)
  const [rows, setRows] = useState<AuthorRow[]>(() => {
    const parsed = value.length > 0 ? value.map(parsePublicationAuthor) : []
    return parsed.length > 0 ? parsed.map(buildRow) : [buildRow()]
  })
  const rowsRef = useRef(rows)

  const userMap = useMemo(() => new Map(users.map((user) => [String(user._id), user])), [users])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    const incomingValue = JSON.stringify(value)
    if (incomingValue === lastEmittedValue.current) {
      onValidationChange?.(hasUnresolvedMemberMatch(rowsRef.current, users))
      return
    }

    if (value.length === 0) {
      const nextRows = [buildRow()]
      setRows(nextRows)
      onValidationChange?.(hasUnresolvedMemberMatch(nextRows, users))
      return
    }

    const nextRows = value.map((author) => buildRow(parsePublicationAuthor(author)))
    setRows(nextRows)
    onValidationChange?.(hasUnresolvedMemberMatch(nextRows, users))
  }, [onValidationChange, users, value])

  const emitChange = (nextRows: AuthorRow[]) => {
    const encodedRows = nextRows
      .map((row) => encodePublicationAuthor(row))
      .filter(Boolean)

    lastEmittedValue.current = JSON.stringify(encodedRows)
    setRows(nextRows)
    onValidationChange?.(hasUnresolvedMemberMatch(nextRows, users))
    onChange(encodedRows)
  }

  const updateRow = (key: string, patch: Partial<AuthorRow>) => {
    emitChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const handleNameChange = (key: string, name: string) => {
    updateRow(key, {
      name,
      isTongClass: false,
      userId: undefined,
      username: undefined,
      confirmedUserId: undefined,
      declinedUserId: undefined,
      message: undefined,
    })
  }

  const confirmUser = (row: AuthorRow) => {
    const matchedUser = findUserByName(users, row.name)
    if (!matchedUser) return

    updateRow(row.key, {
      isTongClass: true,
      userId: String(matchedUser._id),
      username: matchedUser.username,
      confirmedUserId: String(matchedUser._id),
      declinedUserId: undefined,
      message: "已确认通班成员，成果会出现在该成员的个人学术中。",
    })
  }

  const declineUser = (row: AuthorRow) => {
    const matchedUser = findUserByName(users, row.name)
    if (!matchedUser) return

    updateRow(row.key, {
      isTongClass: false,
      userId: undefined,
      username: undefined,
      confirmedUserId: undefined,
      declinedUserId: String(matchedUser._id),
      message: "已选择不是该通班成员，这位作者将按普通作者保存。",
    })
  }

  const addRow = () => emitChange([...rows, buildRow()])
  const removeRow = (key: string) => emitChange(rows.length > 1 ? rows.filter((row) => row.key !== key) : rows)

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>作者</Label>
        <p className="text-xs text-slate-500">每个输入框只能填写一个名字，要求是真实姓名的英文拼音（如：Guangyuan Jiang）。</p>
        <p className="text-xs text-slate-500">如需添加更多作者，请点击下方加号。</p>
        <p className="text-xs text-slate-500">如果作者是通班成员，系统会尝试自动识别并关联到该成员的个人学术主页，您需要确认匹配是否正确。若匹配失败，请检查姓名拼写是否正确。</p>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const matchedUser = findUserByName(users, row.name)
          const matchedUserId = matchedUser ? String(matchedUser._id) : null
          const confirmedUser = row.confirmedUserId ? userMap.get(String(row.confirmedUserId)) : null
          const isDeclinedMatch = Boolean(matchedUserId && row.declinedUserId === matchedUserId)
          const pendingUser = matchedUser && !confirmedUser && !isDeclinedMatch ? matchedUser : null
          const displayedUser = confirmedUser || pendingUser || (isDeclinedMatch ? matchedUser : null)
          const photo = displayedUser?.realPhoto || displayedUser?.avatar

          return (
            <div key={row.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={row.name}
                  onChange={(event) => handleNameChange(row.key, event.target.value)}
                  placeholder={index === 0 ? "请填写一位作者的英文名 姓" : "填写一位作者姓名"}
                  required={index === 0}
                />

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(row.coFirst)}
                      onChange={(event) => updateRow(row.key, { coFirst: event.target.checked })}
                    />
                    Co-first author
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(row.corresponding)}
                      onChange={(event) => updateRow(row.key, { corresponding: event.target.checked })}
                    />
                    Corresponding author
                  </label>
                  {rows.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.key)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>

              {(row.message || displayedUser) && (
                <div
                  className={cn(
                    "mt-3 rounded-md border p-3 text-sm",
                    pendingUser
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : confirmedUser
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  )}
                >
                  {displayedUser && (
                    <div className="mb-2 flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-primary/10 text-primary">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={displayedUser.englishName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold">
                            {(displayedUser.englishName || "T").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{displayedUser.englishName}</p>
                        {displayedUser.chineseName && (
                          <p className="text-xs text-slate-500">{displayedUser.chineseName}</p>
                        )}
                      </div>
                      {pendingUser && (
                        <>
                          <Button type="button" size="sm" onClick={() => confirmUser(row)}>
                            是他/她
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => declineUser(row)}>
                            不是他/她
                          </Button>
                        </>
                      )}
                      {confirmedUser && (
                        <Button type="button" size="sm" variant="outline" onClick={() => declineUser(row)}>
                          不是他/她
                        </Button>
                      )}
                      {isDeclinedMatch && (
                        <Button type="button" size="sm" onClick={() => confirmUser(row)}>
                          改为是他/她
                        </Button>
                      )}
                    </div>
                  )}
                  {pendingUser && <p>检测到同名通班成员，请确认这位作者是不是他/她。</p>}
                  {row.message && <p>{row.message}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Button type="button" variant="outline" onClick={addRow}>
        <Plus className="mr-2 h-4 w-4" />
        添加作者
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
