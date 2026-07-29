"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { useCreateEvent } from "@/lib/api"
import { MarkdownSplitEditor } from "@/components/markdown/markdown-split-editor"

const typeOptions = [
  { label: "学术", color: "#0F4C81" },
  { label: "会议", color: "#DC143C" },
  { label: "活动", color: "#2E7D32" },
  { label: "公告", color: "#F57C00" },
]

const typeToColor = Object.fromEntries(typeOptions.map((option) => [option.label, option.color])) as Record<string, string>

export default function NewEventPage() {
  const router = useRouter()
  const createEventMutation = useCreateEvent()

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    type: "学术",
    description: "",
    url: "",
    audiences: ["undergrad", "graduate"] as Array<"undergrad" | "graduate">,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createEventMutation({
      title: formData.title,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      description: formData.description,
      url: formData.url,
      color: typeToColor[formData.type] || "#0F4C81",
      audiences: formData.audiences,
    })

    router.push("/admin/events")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">创建活动</h1>
          <p className="text-gray-500 mt-1">填写并创建新活动</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>活动信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">活动标题</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">活动类型</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 rounded-md border border-input bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {typeOptions.map((type) => (
                    <option key={type.label} value={type.label}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">时间</Label>
                <Input
                  id="time"
                  placeholder="例如: 14:00 - 16:00"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">地点</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">外部链接</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>可见人群</Label>
              <div className="flex gap-4 text-sm">
                {(["undergrad", "graduate"] as const).map((audience) => (
                  <label key={audience} className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.audiences.includes(audience)} onChange={() => setFormData((prev) => ({ ...prev, audiences: prev.audiences.includes(audience) ? prev.audiences.filter((item) => item !== audience) : [...prev.audiences, audience] }))} />
                    {audience === "undergrad" ? "本科生" : "研究生"}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">活动描述（Markdown）</Label>
              <MarkdownSplitEditor
                id="description"
                value={formData.description}
                onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                placeholder="输入活动描述，支持 Markdown 语法。"
                minHeightClassName="min-h-[220px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
            <Save className="h-4 w-4 mr-2" />
            创建
          </Button>
        </div>
      </form>
    </div>
  )
}
