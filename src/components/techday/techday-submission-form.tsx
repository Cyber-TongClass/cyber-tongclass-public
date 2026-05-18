"use client"

import { FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTechDayDirections } from "@/lib/api"
import { techDayPublicationStatusLabels, techDayTrackLabels, type TechDayPublicationStatus, type TechDayTrack } from "@/types/techday"

type SubmissionFormState = {
  title: string
  abstract: string
  contact: string
  venue: string
  authors: string
  track: TechDayTrack
  publicationStatus: TechDayPublicationStatus
  archiveConsent: boolean
  directionId?: string
  paperUrl: string
  year: string
}

const defaultState: SubmissionFormState = {
  title: "",
  abstract: "",
  contact: "",
  venue: "",
  authors: "",
  track: "poster",
  publicationStatus: "accepted",
  archiveConsent: true,
  directionId: undefined,
  paperUrl: "",
  year: String(new Date().getFullYear()),
}

export function TechDaySubmissionForm({
  initialValue,
  onSubmit,
  submitLabel = "提交",
}: {
  initialValue?: Partial<SubmissionFormState>
  onSubmit: (value: SubmissionFormState) => Promise<void>
  submitLabel?: string
}) {
  const directions = useTechDayDirections()
  const [form, setForm] = useState<SubmissionFormState>({ ...defaultState, ...initialValue })
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialValue) setForm((value) => ({ ...value, ...initialValue }))
  }, [initialValue])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await onSubmit(form)
      setMessage("已保存")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="td-title">标题</Label>
        <Input id="td-title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="td-authors">作者</Label>
        <Input id="td-authors" value={form.authors} onChange={(event) => setForm((value) => ({ ...value, authors: event.target.value }))} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="td-contact">联系方式</Label>
        <Input id="td-contact" value={form.contact} onChange={(event) => setForm((value) => ({ ...value, contact: event.target.value }))} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="td-venue">发表/接收信息</Label>
        <Input id="td-venue" value={form.venue} onChange={(event) => setForm((value) => ({ ...value, venue: event.target.value }))} required />
      </div>
      <div className="grid gap-2">
        <Label>方向</Label>
        <Select value={form.directionId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, directionId: value === "none" ? undefined : value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">未选择</SelectItem>
            {directions?.map((direction: any) => <SelectItem key={direction._id} value={direction._id}>{direction.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Track</Label>
        <Select value={form.track} onValueChange={(value) => setForm((current) => ({ ...current, track: value as TechDayTrack }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(techDayTrackLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>发表状态</Label>
        <Select value={form.publicationStatus} onValueChange={(value) => setForm((current) => ({ ...current, publicationStatus: value as TechDayPublicationStatus }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(techDayPublicationStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="td-year">年份</Label>
        <Input id="td-year" value={form.year} onChange={(event) => setForm((value) => ({ ...value, year: event.target.value }))} />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="td-url">论文/项目链接</Label>
        <Input id="td-url" value={form.paperUrl} onChange={(event) => setForm((value) => ({ ...value, paperUrl: event.target.value }))} />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="td-abstract">摘要</Label>
        <Textarea id="td-abstract" className="min-h-36" value={form.abstract} onChange={(event) => setForm((value) => ({ ...value, abstract: event.target.value }))} required />
      </div>
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={submitting}>{submitting ? "保存中..." : submitLabel}</Button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </form>
  )
}
