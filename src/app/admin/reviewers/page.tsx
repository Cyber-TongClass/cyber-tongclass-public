"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Search, Plus, Save, KeyRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCreateReviewerAccount, useResetReviewerPassword, useReviewerAccounts, useUpdateReviewerAccount } from "@/lib/api"
import type { ReviewerAccount } from "@/types"

const ACADEMIC_EXCHANGE_PERMISSION = "academicExchange:read"

function formatDate(value?: number) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function AdminReviewersPage() {
  const reviewers = useReviewerAccounts() as ReviewerAccount[] | undefined
  const createReviewer = useCreateReviewerAccount()
  const updateReviewer = useUpdateReviewerAccount()
  const resetPassword = useResetReviewerPassword()

  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [newReviewer, setNewReviewer] = useState({
    username: "",
    displayName: "",
    password: "",
    enabled: true,
    academicExchangeRead: true,
  })
  const [rowDrafts, setRowDrafts] = useState<Record<string, {
    displayName: string
    enabled: boolean
    academicExchangeRead: boolean
    password: string
  }>>({})

  const filteredReviewers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return (reviewers || []).filter((reviewer) => {
      if (!query) return true
      return [reviewer.username, reviewer.displayName].join(" ").toLowerCase().includes(query)
    })
  }, [reviewers, searchQuery])

  const getDraft = (reviewer: ReviewerAccount) => {
    return rowDrafts[reviewer._id] || {
      displayName: reviewer.displayName,
      enabled: reviewer.enabled,
      academicExchangeRead: reviewer.permissions.includes(ACADEMIC_EXCHANGE_PERMISSION),
      password: "",
    }
  }

  const patchDraft = (reviewer: ReviewerAccount, patch: Partial<ReturnType<typeof getDraft>>) => {
    setRowDrafts((current) => ({
      ...current,
      [reviewer._id]: {
        ...(current[reviewer._id] || {
          displayName: reviewer.displayName,
          enabled: reviewer.enabled,
          academicExchangeRead: reviewer.permissions.includes(ACADEMIC_EXCHANGE_PERMISSION),
          password: "",
        }),
        ...patch,
      },
    }))
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage("")
    setSubmitting(true)
    try {
      await createReviewer({
        username: newReviewer.username,
        displayName: newReviewer.displayName,
        password: newReviewer.password,
        enabled: newReviewer.enabled,
        permissions: newReviewer.academicExchangeRead ? [ACADEMIC_EXCHANGE_PERMISSION] : [],
      })
      setNewReviewer({
        username: "",
        displayName: "",
        password: "",
        enabled: true,
        academicExchangeRead: true,
      })
      setMessage("Reviewer 账号已创建。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建 Reviewer 失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSave = async (reviewer: ReviewerAccount) => {
    const draft = getDraft(reviewer)
    setMessage("")
    setSavingId(reviewer._id)
    try {
      await updateReviewer({
        id: reviewer._id,
        displayName: draft.displayName,
        enabled: draft.enabled,
        permissions: draft.academicExchangeRead ? [ACADEMIC_EXCHANGE_PERMISSION] : [],
      })
      setMessage("Reviewer 账号已更新。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存 Reviewer 失败")
    } finally {
      setSavingId(null)
    }
  }

  const handleResetPassword = async (reviewer: ReviewerAccount) => {
    const draft = getDraft(reviewer)
    setMessage("")
    setResettingId(reviewer._id)
    try {
      await resetPassword({
        id: reviewer._id,
        password: draft.password,
      })
      patchDraft(reviewer, { password: "" })
      setMessage("Reviewer 密码已重置，已有登录会话已失效。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重置密码失败")
    } finally {
      setResettingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Reviewer 管理</h1>
        <p className="mt-1 text-gray-500">管理外部只读账号。Reviewer 不能访问内网和后台，只能查看已授权的只读模块。</p>
      </div>

      {message ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新建 Reviewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="new-reviewer-username">用户名</Label>
              <Input
                id="new-reviewer-username"
                value={newReviewer.username}
                onChange={(event) => setNewReviewer((current) => ({ ...current, username: event.target.value }))}
                placeholder="reviewer-name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-reviewer-display-name">显示名</Label>
              <Input
                id="new-reviewer-display-name"
                value={newReviewer.displayName}
                onChange={(event) => setNewReviewer((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="财务处老师"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-reviewer-password">初始密码</Label>
              <Input
                id="new-reviewer-password"
                type="password"
                value={newReviewer.password}
                onChange={(event) => setNewReviewer((current) => ({ ...current, password: event.target.value }))}
                placeholder="至少 8 位"
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {submitting ? "创建中..." : "创建账号"}
            </Button>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newReviewer.academicExchangeRead}
                onChange={(event) => setNewReviewer((current) => ({ ...current, academicExchangeRead: event.target.checked }))}
              />
              学术交流报销只读
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newReviewer.enabled}
                onChange={(event) => setNewReviewer((current) => ({ ...current, enabled: event.target.checked }))}
              />
              立即启用
            </label>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="搜索 Reviewer 用户名或显示名..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>账号</TableHead>
                <TableHead>显示名</TableHead>
                <TableHead>权限</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近登录</TableHead>
                <TableHead>重置密码</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewers === undefined ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">Loading...</TableCell>
                </TableRow>
              ) : filteredReviewers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">暂无 Reviewer 账号</TableCell>
                </TableRow>
              ) : (
                filteredReviewers.map((reviewer) => {
                  const draft = getDraft(reviewer)
                  return (
                    <TableRow key={reviewer._id}>
                      <TableCell className="font-medium">{reviewer.username}</TableCell>
                      <TableCell>
                        <Input
                          value={draft.displayName}
                          onChange={(event) => patchDraft(reviewer, { displayName: event.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.academicExchangeRead}
                            onChange={(event) => patchDraft(reviewer, { academicExchangeRead: event.target.checked })}
                          />
                          学术交流报销只读
                        </label>
                      </TableCell>
                      <TableCell>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(event) => patchDraft(reviewer, { enabled: event.target.checked })}
                          />
                          <Badge className={draft.enabled ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}>
                            {draft.enabled ? "启用" : "停用"}
                          </Badge>
                        </label>
                      </TableCell>
                      <TableCell className="text-slate-500">{formatDate(reviewer.lastLoginAt)}</TableCell>
                      <TableCell>
                        <div className="flex min-w-[220px] gap-2">
                          <Input
                            type="password"
                            value={draft.password}
                            onChange={(event) => patchDraft(reviewer, { password: event.target.value })}
                            placeholder="新密码"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!draft.password || resettingId === reviewer._id}
                            onClick={() => handleResetPassword(reviewer)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSave(reviewer)}
                          disabled={savingId === reviewer._id}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {savingId === reviewer._id ? "保存中..." : "保存"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
