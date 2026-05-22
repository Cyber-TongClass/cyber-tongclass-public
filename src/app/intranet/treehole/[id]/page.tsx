"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowLeft, MessageSquare, Send, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  useCreateTreeholeReply,
  useDeleteTreeholePost,
  useDeleteTreeholeReply,
  useTreeholePostById,
  useVoteTreeholePost,
  useVoteTreeholeReply,
} from "@/lib/api"
import { ContentVoteButtons } from "@/components/content-vote-buttons"
import { CollapsibleText } from "@/components/intranet/collapsible-text"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN")
}

export default function TreeholeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { currentUser, isAdmin } = useAuth()
  const detail = useTreeholePostById(params.id)
  const createReply = useCreateTreeholeReply()
  const deletePost = useDeleteTreeholePost()
  const deleteReply = useDeleteTreeholeReply()
  const votePost = useVoteTreeholePost()
  const voteReply = useVoteTreeholeReply()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [replyContent, setReplyContent] = useState("")
  const [replyAnonymous, setReplyAnonymous] = useState(true)
  const [replySortBy, setReplySortBy] = useState("oldest")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const sortedReplies = useMemo(() => {
    const replyList = ((detail as any)?.replies || []) as any[]
    return [...replyList].sort((a: any, b: any) => {
      if (replySortBy === "score-desc") return (b.voteScore || 0) - (a.voteScore || 0)
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
  }, [detail, replySortBy])

  if (detail === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">加载中...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10">
        <div className="container-custom space-y-6">
          <Button asChild variant="ghost" className="-ml-3 gap-2">
            <Link href="/intranet/treehole">
              <ArrowLeft className="h-4 w-4" />
              返回树洞
            </Link>
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-slate-500">该帖子不存在或已被删除。</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { post, replies } = detail as any
  const canDeletePost = !!currentUser && (String(post.authorId) === String(currentUser._id) || isAdmin)

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      setSubmitting(true)
      setError("")
      await createReply({
        postId: post._id,
        content: replyContent,
        isAnonymous: replyAnonymous,
        authorId: currentUser._id as any,
      })
      setReplyContent("")
      setReplyAnonymous(false)
    } catch (submitError: any) {
      setError(submitError?.message || "回复失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePost = async () => {
    if (!currentUser) return
    await confirm({
      title: "删除帖子",
      description: "删除主贴后，该帖子下的全部回帖也会一并删除。确定继续吗？",
      confirmLabel: "确定删除",
      variant: "danger",
      onConfirm: async () => {
        await deletePost({ id: post._id as any, actorId: currentUser._id as any } as any)
        router.push("/intranet/treehole")
      },
    })
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!currentUser) return
    await confirm({
      title: "删除回复",
      description: "确定删除这条回复吗？",
      confirmLabel: "确定删除",
      variant: "danger",
      onConfirm: async () => {
        await deleteReply({ id: replyId as any, actorId: currentUser._id as any } as any)
      },
    })
  }

  const handleVotePost = async (value?: 1 | -1) => {
    await votePost({ id: post._id, value })
  }

  const handleVoteReply = async (replyId: string, value?: 1 | -1) => {
    await voteReply({ id: replyId, value })
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10">
      <div className="container-custom space-y-6">
        <Button asChild variant="ghost" className="-ml-3 gap-2">
          <Link href="/intranet/treehole">
            <ArrowLeft className="h-4 w-4" />
            返回树洞
          </Link>
        </Button>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-3xl">{post.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  {post.serialLabel ? <span className="font-mono font-semibold text-primary">#{post.serialLabel}</span> : null}
                  <span>{post.publicAuthorName}</span>
                  <span>{formatTime(post.createdAt)}</span>
                  <span>{replies.length} 条回帖</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ContentVoteButtons
                  likes={post.likes}
                  dislikes={post.dislikes}
                  currentUserVote={post.currentUserVote}
                  onVote={handleVotePost}
                />
                {canDeletePost ? (
                  <Button type="button" variant="ghost" size="icon" className="text-slate-500 hover:text-red-600" onClick={handleDeletePost}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CollapsibleText text={post.content} collapsedLength={420} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>回复帖子</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReplySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reply-content">回复内容</Label>
                <Textarea
                  id="reply-content"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={5}
                  placeholder="写下你的回复吧！"
                  required
                />
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={replyAnonymous}
                  onChange={(e) => setReplyAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                匿名回复（默认匿名）
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="gap-2" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "提交中..." : "发布回复"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-extrabold">全部回帖</h2>
            </div>
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
              value={replySortBy}
              onChange={(event) => setReplySortBy(event.target.value)}
            >
              <option value="oldest">最早回复</option>
              <option value="score-desc">点赞数</option>
            </select>
          </div>

          {sortedReplies.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">还没有回帖，来抢沙发吧！</CardContent>
            </Card>
          ) : (
            sortedReplies.map((reply: any) => {
              const canDeleteReply = !!currentUser && (String(reply.authorId) === String(currentUser._id) || isAdmin)

              return (
                <Card key={reply._id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="font-medium text-slate-900">{reply.publicAuthorName}</span>
                          <span>{formatTime(reply.createdAt)}</span>
                        </div>
                        <CollapsibleText text={reply.content} collapsedLength={260} />
                      </div>
                      <div className="flex items-center gap-2">
                        <ContentVoteButtons
                          likes={reply.likes}
                          dislikes={reply.dislikes}
                          currentUserVote={reply.currentUserVote}
                          onVote={(value) => handleVoteReply(reply._id, value)}
                        />
                        {canDeleteReply ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:text-red-600"
                            onClick={() => handleDeleteReply(reply._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
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
