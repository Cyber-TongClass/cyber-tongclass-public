"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { MarkdownSplitEditor } from "@/components/markdown/markdown-split-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateTechDayPost, useTechDayActorArgs } from "@/lib/api"

export default function NewTechDayPostPage() {
  const router = useRouter()
  const actorArgs = useTechDayActorArgs()
  const create = useCreateTechDayPost()
  const [form, setForm] = useState({ title: "", date: new Date().toISOString().slice(0, 10), category: "", summary: "", tags: "", content: "" })
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await create({
        ...actorArgs,
        ...form,
        tags: form.tags.split(/[,\n，]/).map((tag) => tag.trim()).filter(Boolean),
        visibility: ["public"],
        published: false,
      })
      router.push("/techday/news/manage")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    }
  }

  return (
    <TechDayShell title="新建公告">
      <TechDayAccessGuard role="admin" allowPublisher>
        <Card>
          <CardHeader><CardTitle>公告内容</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid gap-2"><Label>标题</Label><Input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required /></div>
              <div className="grid gap-2 md:grid-cols-3">
                <Input value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} />
                <Input placeholder="分类" value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} />
                <Input placeholder="标签，逗号分隔" value={form.tags} onChange={(event) => setForm((value) => ({ ...value, tags: event.target.value }))} />
              </div>
              <Input placeholder="摘要" value={form.summary} onChange={(event) => setForm((value) => ({ ...value, summary: event.target.value }))} />
              <MarkdownSplitEditor id="new-techday-post" value={form.content} onChange={(content) => setForm((value) => ({ ...value, content }))} minHeightClassName="min-h-[420px]" />
              <div className="flex items-center gap-3"><Button type="submit">保存草稿</Button>{message ? <p className="text-sm text-red-600">{message}</p> : null}</div>
            </form>
          </CardContent>
        </Card>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
