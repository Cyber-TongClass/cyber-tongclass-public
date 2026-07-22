"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, FileText, Send, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useCreateFeedbackEntry, useDeleteFeedbackEntry, useFeedbackEntries } from "@/lib/api"
import { CollapsibleText } from "@/components/intranet/collapsible-text"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN")
}

export default function FeedbackPage() {
  const { currentUser, isAdmin } = useAuth()
  const entries = useFeedbackEntries() || []
  const createEntry = useCreateFeedbackEntry()
  const deleteEntry = useDeleteFeedbackEntry()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      setSubmitting(true)
      setError("")
      await createEntry({
        title,
        content,
        isAnonymous,
        authorId: currentUser._id as any,
      })
      setTitle("")
      setContent("")
      setIsAnonymous(false)
    } catch (submitError: any) {
      setError(submitError?.message || "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (entryId: string, entryTitle: string) => {
    if (!currentUser) return

    await confirm({
      title: "删除反馈",
      description: `你确定要删除“${entryTitle}”这条反馈吗？`,
      confirmLabel: "确定删除",
      variant: "danger",
      onConfirm: async () => {
        await deleteEntry({ id: entryId as any, actorId: currentUser._id as any } as any)
      },
    })
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10">
      <div className="container-custom space-y-6">
        <Button asChild variant="ghost" className="-ml-3 gap-2">
          <Link href="/tong-class/intranet">
            <ArrowLeft className="h-4 w-4" />
            返回内网首页
          </Link>
        </Button>

        <div>
          <h1 className="text-4xl font-extrabold text-slate-900">意见反馈</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            欢迎同学们反馈关于课程、活动、组织运行或日常体验的建议。这里默认实名提交，也可以选择匿名哦！管理员会定期收集整理同学们的反馈，并向院办/管委会汇报。你的每条建议都是让通班变得更好的宝贵资源！
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>提交新反馈</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-title">标题</Label>
                <Input id="feedback-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-content">内容</Label>
                <Textarea
                  id="feedback-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="写下你对通班的建议与想法吧！"
                  required
                />
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                匿名提交（默认实名）
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="gap-2" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "提交中..." : "提交反馈"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-extrabold">近期反馈</h2>
          </div>

          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">暂时还没有反馈，欢迎提交第一条建议。</CardContent>
            </Card>
          ) : (
            entries.map((entry: any) => {
              const canDelete = !!currentUser && (String(entry.authorId) === String(currentUser._id) || isAdmin)

              return (
                <Card key={entry._id}>
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl">{entry.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span>{entry.publicAuthorName}</span>
                          <span>{formatTime(entry.createdAt)}</span>
                        </div>
                      </div>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-500 hover:text-red-600"
                          onClick={() => handleDelete(entry._id, entry.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CollapsibleText text={entry.content} collapsedLength={240} />
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
