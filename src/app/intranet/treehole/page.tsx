"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, MessageSquare, Search, Send, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  useCreateTreeholePost,
  useDeleteTreeholePost,
  useEnsureTreeholeSerialNumbers,
  useTreeholePosts,
  useVoteTreeholePost,
} from "@/lib/api"
import { ContentVoteButtons } from "@/components/content-vote-buttons"
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

export default function TreeholePage() {
  const { currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [sortBy, setSortBy] = useState("latest")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const postsData = useTreeholePosts({ search: searchQuery.trim() || undefined })
  const posts = useMemo(() => postsData || [], [postsData])
  const createPost = useCreateTreeholePost()
  const deletePost = useDeleteTreeholePost()
  const ensureSerialNumbers = useEnsureTreeholeSerialNumbers()
  const votePost = useVoteTreeholePost()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  useEffect(() => {
    if (!currentUser) return
    void ensureSerialNumbers().catch((serialError) => {
      console.error("Failed to ensure treehole serial numbers:", serialError)
    })
  }, [currentUser, ensureSerialNumbers])

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a: any, b: any) => {
      if (sortBy === "score-desc") return (b.voteScore || 0) - (a.voteScore || 0)
      if (sortBy === "replies-desc") return (b.replyCount || 0) - (a.replyCount || 0)
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  }, [posts, sortBy])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      setSubmitting(true)
      setError("")
      await createPost({
        title,
        content,
        isAnonymous,
        authorId: currentUser._id as any,
      })
      setTitle("")
      setContent("")
      setIsAnonymous(false)
    } catch (submitError: any) {
      setError(submitError?.message || "发布失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (postId: string, postTitle: string) => {
    if (!currentUser) return

    await confirm({
      title: "删除树洞帖子",
      description: `你确定要删除“${postTitle}”这条帖子吗？对应回帖也会一并删除。`,
      confirmLabel: "确定删除",
      variant: "danger",
      onConfirm: async () => {
        await deletePost({ id: postId as any, actorId: currentUser._id as any } as any)
      },
    })
  }

  const handleVotePost = async (postId: string, value?: 1 | -1) => {
    await votePost({ id: postId, value })
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10">
      <div className="container-custom space-y-6">
        <Button asChild variant="ghost" className="-ml-3 gap-2">
          <Link href="/intranet">
            <ArrowLeft className="h-4 w-4" />
            返回内网首页
          </Link>
        </Button>

        <div>
          <h1 className="text-4xl font-extrabold text-slate-900">通班树洞</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            这里是面向通班成员的内部“树洞”讨论区，可以选择匿名或实名发帖。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>发布新帖子</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="treehole-title">标题</Label>
                <Input id="treehole-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treehole-content">内容</Label>
                <Textarea
                  id="treehole-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="写下你想说的话吧～ 请畅所欲言，但也请注意不要发布违反法律法规、公序良俗和学校相关规定的内容哦。"
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
                匿名发布（默认匿名）
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="gap-2" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "发布中..." : "发布帖子"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索编号、标题、作者或帖子内容"
                  className="pr-10"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="latest">最新发布</option>
                <option value="score-desc">点赞数</option>
                <option value="replies-desc">回帖数</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {sortedPosts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">还没有符合条件的帖子，来发第一条吧。</CardContent>
            </Card>
          ) : (
            sortedPosts.map((post: any) => {
              return (
                <Card key={post._id}>
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Link href={`/intranet/treehole/${post._id}`} className="block">
                          <CardTitle className="text-2xl hover:text-primary transition-colors">{post.title}</CardTitle>
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          {post.serialLabel ? <span className="font-mono font-semibold text-primary">#{post.serialLabel}</span> : null}
                          <span>{post.publicAuthorName}</span>
                          <span>{formatTime(post.createdAt)}</span>
                          <span>{post.replyCount} 条回帖</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ContentVoteButtons
                          likes={post.likes}
                          dislikes={post.dislikes}
                          currentUserVote={post.currentUserVote}
                          onVote={(value) => handleVotePost(post._id, value)}
                        />
                        {post.canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:text-red-600"
                            onClick={() => handleDelete(post._id, post.title)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CollapsibleText text={post.content} collapsedLength={220} />
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <MessageSquare className="h-4 w-4" />
                        进入帖子后可查看完整内容与回复
                      </span>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/intranet/treehole/${post._id}`}>进入帖子</Link>
                      </Button>
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
