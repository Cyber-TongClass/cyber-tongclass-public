"use client"

import { useState, type FormEvent } from "react"
import { AlertCircle, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CoffeeTalkApplicantProfileView } from "@/lib/coffee-talk-applicant-profile"

export interface CoffeeTalkTeacherOption {
  id: string
  name: string
  title?: string
  isDemo?: boolean
}

export interface CoffeeTalkApplicationDraft {
  teacherPreference: string
  topic: string
  availability: string
  notes: string
}

export interface CoffeeTalkApplicationFormProps {
  teachers: readonly CoffeeTalkTeacherOption[]
  applicantProfile: CoffeeTalkApplicantProfileView
  backendAvailable?: boolean
  onSubmit?: (draft: CoffeeTalkApplicationDraft) => void | Promise<void>
}

const initialDraft: CoffeeTalkApplicationDraft = {
  teacherPreference: "",
  topic: "",
  availability: "",
  notes: "",
}

export function CoffeeTalkApplicationForm({
  teachers,
  applicantProfile,
  backendAvailable = false,
  onSubmit,
}: CoffeeTalkApplicationFormProps) {
  const [draft, setDraft] = useState<CoffeeTalkApplicationDraft>(initialDraft)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canSubmit = backendAvailable && Boolean(onSubmit) && teachers.length > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit || !onSubmit) return

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await onSubmit(draft)
    } catch {
      setSubmitError("申请暂未提交成功，请稍后重试。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {!backendAvailable ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4" role="status">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="font-medium text-amber-950">申请提交服务尚未开放</p>
              <p className="mt-1 text-sm leading-6 text-amber-900">表单内容仅供填写预览，当前不会发送或保存任何信息。</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="coffee-talk-applicant-name">申请人姓名</Label>
          <Input
            id="coffee-talk-applicant-name"
            name="applicantName"
            autoComplete="name"
            required
            readOnly
            value={applicantProfile.applicantName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coffee-talk-email">邮箱</Label>
          <Input
            id="coffee-talk-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            readOnly
            value={applicantProfile.email}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coffee-talk-affiliation">院系 / 单位</Label>
          <Input
            id="coffee-talk-affiliation"
            name="affiliation"
            required
            readOnly
            value={applicantProfile.affiliation}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coffee-talk-identity">身份</Label>
          <Input
            id="coffee-talk-identity"
            name="identity"
            required
            readOnly
            value={applicantProfile.identity}
          />
        </div>
      </div>
      <p className="-mt-3 text-xs leading-5 text-slate-500">以下资料来自个人账户，无法在此修改。</p>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-teacher">教师偏好</Label>
        <select
          id="coffee-talk-teacher"
          name="teacherPreference"
          required
          value={draft.teacherPreference}
          onChange={(event) => setDraft((current) => ({ ...current, teacherPreference: event.target.value }))}
          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="" disabled>{teachers.length > 0 ? "请选择希望交流的教师" : "当前没有可选教师"}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}{teacher.title ? ` · ${teacher.title}` : ""}{teacher.isDemo ? "（演示数据）" : ""}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-slate-500">标有“演示数据”的教师仅用于展示填写流程。</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-topic">交流主题</Label>
        <Input
          id="coffee-talk-topic"
          name="topic"
          required
          value={draft.topic}
          onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-availability">可用时间</Label>
        <Textarea
          id="coffee-talk-availability"
          name="availability"
          required
          rows={4}
          aria-describedby="coffee-talk-availability-hint"
          placeholder="请用文字说明方便交流的日期和时段。"
          value={draft.availability}
          onChange={(event) => setDraft((current) => ({ ...current, availability: event.target.value }))}
        />
        <p id="coffee-talk-availability-hint" className="text-xs leading-5 text-slate-500">请提供若干可协调的时段。</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-notes">补充说明</Label>
        <Textarea
          id="coffee-talk-notes"
          name="notes"
          rows={5}
          aria-describedby="coffee-talk-notes-hint"
          placeholder="可选：简要说明希望讨论的问题或背景。"
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
        />
        <p id="coffee-talk-notes-hint" className="text-xs leading-5 text-slate-500">请勿在此填写不必要的敏感信息。</p>
      </div>

      {submitError ? (
        <p className="flex items-center gap-2 text-sm text-red-700" role="alert">
          <Info className="h-4 w-4" aria-hidden="true" />
          {submitError}
        </p>
      ) : null}

      <Button type="submit" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? "正在提交…" : "提交申请"}
      </Button>
    </form>
  )
}
