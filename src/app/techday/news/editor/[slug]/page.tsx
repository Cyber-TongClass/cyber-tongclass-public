"use client"

import { FormEvent, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { MarkdownSplitEditor } from "@/components/markdown/markdown-split-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type TechDayActorArgs, useTechDayActorArgs, useTechDayPostBySlug, useUpdateTechDayPost } from "@/lib/api"

type TechDayPost = {
  _id: string
  title: string
  slug: string
  date: string
  category?: string
  summary?: string
  tags?: string[]
  content?: string
  published: boolean
  visibility?: string[]
}

function postToForm(post: TechDayPost) {
  return {
    title: post.title,
    slug: post.slug,
    date: post.date,
    category: post.category || "",
    summary: post.summary || "",
    tags: post.tags?.join(", ") || "",
    content: post.content || "",
    published: post.published,
  }
}

function EditTechDayPostForm({ actorArgs, post }: { actorArgs: TechDayActorArgs; post: TechDayPost }) {
  const router = useRouter()
  const update = useUpdateTechDayPost()
  const [form, setForm] = useState(() => postToForm(post))
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await update({
        ...actorArgs,
        id: post._id,
        ...form,
        tags: form.tags.split(/[,\n，]/).map((tag) => tag.trim()).filter(Boolean),
        visibility: post.visibility || ["public"],
      })
      router.push("/techday/news/manage")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{post.title}</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2"><Label>标题</Label><Input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required /></div>
          <div className="grid gap-2 md:grid-cols-4">
            <Input value={form.slug} onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))} />
            <Input value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} />
            <Input placeholder="分类" value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} />
            <Input placeholder="标签，逗号分隔" value={form.tags} onChange={(event) => setForm((value) => ({ ...value, tags: event.target.value }))} />
          </div>
          <Input placeholder="摘要" value={form.summary} onChange={(event) => setForm((value) => ({ ...value, summary: event.target.value }))} />
          <MarkdownSplitEditor id="edit-techday-post" value={form.content} onChange={(content) => setForm((value) => ({ ...value, content }))} minHeightClassName="min-h-[420px]" />
          <div className="flex items-center gap-3"><Button type="submit">保存</Button>{message ? <p className="text-sm text-red-600">{message}</p> : null}</div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function EditTechDayPostPage() {
  const params = useParams<{ slug: string }>()
  const actorArgs = useTechDayActorArgs()
  const post = useTechDayPostBySlug(params.slug, actorArgs)

  return (
    <TechDayShell title="编辑公告">
      <TechDayAccessGuard role="admin" allowPublisher>
        {post ? <EditTechDayPostForm key={post._id} actorArgs={actorArgs} post={post as TechDayPost} /> : <p className="text-sm text-slate-600">公告加载中...</p>}
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
