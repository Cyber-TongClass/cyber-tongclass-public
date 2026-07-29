"use client"

import { useState, type FormEvent } from "react"
import { AlertCircle, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { coffeeTalkErrorMessage } from "@/lib/coffee-talk"
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
  purpose: string
  researchBackground: string
  expectedOutcome: string
  preferredFormat: "online" | "offline" | "either"
  availability: string
  consentToShareProfile: boolean
  idempotencyKey: string
  notes: string
}

export interface CoffeeTalkApplicationFormProps {
  teachers: readonly CoffeeTalkTeacherOption[]
  applicantProfile: CoffeeTalkApplicantProfileView
  initialTeacherSlug?: string
  backendAvailable?: boolean
  onSubmit?: (draft: CoffeeTalkApplicationDraft) => void | Promise<void>
}

const coffeeTalkFieldLimits = {
  topic: 240,
  purpose: 2000,
  researchBackground: 4000,
  expectedOutcome: 2000,
  availability: 2000,
  notes: 4000,
} as const

function CharacterCount({ value, maximum }: { value: string; maximum: number }) {
  return (
    <span>
      已填写 {value.length} / {maximum} 字
    </span>
  )
}

function createInitialDraft(initialTeacherSlug = ""): CoffeeTalkApplicationDraft {
  return {
  teacherPreference: initialTeacherSlug,
  topic: "",
  purpose: "",
  researchBackground: "",
  expectedOutcome: "",
  preferredFormat: "either",
  availability: "",
  consentToShareProfile: false,
  idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `coffee-talk-${Date.now()}`,
  notes: "",
  }
}

export function CoffeeTalkApplicationForm({
  teachers,
  applicantProfile,
  initialTeacherSlug,
  backendAvailable = false,
  onSubmit,
}: CoffeeTalkApplicationFormProps) {
  const [draft, setDraft] = useState<CoffeeTalkApplicationDraft>(() => createInitialDraft(initialTeacherSlug))
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
    } catch (error) {
      setSubmitError(coffeeTalkErrorMessage(error, "申请暂未提交成功，请稍后重试。"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {!backendAvailable ? (
        <div className="border border-dashed aia-border-rule px-4 py-3" role="status">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--aia-red))]" aria-hidden="true" />
            <div>
              <p className="font-medium">申请提交服务尚未开放</p>
              <p className="aia-text-muted mt-1 text-sm leading-6">表单内容仅供填写预览，当前不会发送或保存任何信息。</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t aia-border-rule pt-6">
        <p className="aia-kicker">账户资料 · 只读</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
          <p className="aia-text-muted text-xs leading-5 sm:col-span-2">以上资料来自个人账户，无法在此修改。</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-teacher">教师偏好</Label>
        <select
          id="coffee-talk-teacher"
          name="teacherPreference"
          required
          value={draft.teacherPreference}
          onChange={(event) => setDraft((current) => ({ ...current, teacherPreference: event.target.value }))}
          className="flex h-10 w-full rounded-none border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="" disabled>{teachers.length > 0 ? "请选择希望交流的教师" : "当前没有可选教师"}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}{teacher.title ? ` · ${teacher.title}` : ""}{teacher.isDemo ? "（演示数据）" : ""}
            </option>
          ))}
        </select>
        <p className="aia-text-muted text-xs leading-5">标有“演示数据”的教师仅用于展示填写流程。</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-topic">交流主题</Label>
        <Input
          id="coffee-talk-topic"
          name="topic"
          required
          maxLength={240}
          aria-describedby="coffee-talk-topic-hint"
          value={draft.topic}
          onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))}
        />
        <p id="coffee-talk-topic-hint" className="aia-text-muted text-xs leading-5">
          <CharacterCount value={draft.topic} maximum={coffeeTalkFieldLimits.topic} />
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-purpose">交流目的</Label>
        <Textarea id="coffee-talk-purpose" name="purpose" required rows={3} maxLength={2000} aria-describedby="coffee-talk-purpose-hint" value={draft.purpose} onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value }))} />
        <p id="coffee-talk-purpose-hint" className="aia-text-muted text-xs leading-5">
          <CharacterCount value={draft.purpose} maximum={coffeeTalkFieldLimits.purpose} />
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-background">研究背景</Label>
        <Textarea id="coffee-talk-background" name="researchBackground" required rows={4} maxLength={4000} aria-describedby="coffee-talk-background-hint" value={draft.researchBackground} onChange={(event) => setDraft((current) => ({ ...current, researchBackground: event.target.value }))} />
        <p id="coffee-talk-background-hint" className="aia-text-muted text-xs leading-5">
          <CharacterCount value={draft.researchBackground} maximum={coffeeTalkFieldLimits.researchBackground} />
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-outcome">预期收获</Label>
        <Textarea id="coffee-talk-outcome" name="expectedOutcome" required rows={3} maxLength={2000} aria-describedby="coffee-talk-outcome-hint" value={draft.expectedOutcome} onChange={(event) => setDraft((current) => ({ ...current, expectedOutcome: event.target.value }))} />
        <p id="coffee-talk-outcome-hint" className="aia-text-muted text-xs leading-5">
          <CharacterCount value={draft.expectedOutcome} maximum={coffeeTalkFieldLimits.expectedOutcome} />
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-format">偏好形式</Label>
        <select
          id="coffee-talk-format"
          name="preferredFormat"
          value={draft.preferredFormat}
          onChange={(event) => setDraft((current) => ({
            ...current,
            preferredFormat: event.target.value as CoffeeTalkApplicationDraft["preferredFormat"],
          }))}
          className="flex h-10 w-full rounded-none border border-input bg-white px-3 py-2 text-sm"
        >
          <option value="either">线上或线下均可</option>
          <option value="online">线上</option>
          <option value="offline">线下</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-availability">可用时间</Label>
        <Textarea
          id="coffee-talk-availability"
          name="availability"
          required
          rows={4}
          maxLength={2000}
          aria-describedby="coffee-talk-availability-hint"
          placeholder="请用文字说明方便交流的日期和时段。"
          value={draft.availability}
          onChange={(event) => setDraft((current) => ({ ...current, availability: event.target.value }))}
        />
        <p id="coffee-talk-availability-hint" className="aia-text-muted text-xs leading-5">
          请提供若干可协调的时段。<CharacterCount value={draft.availability} maximum={coffeeTalkFieldLimits.availability} />
        </p>
      </div>

      <label className="flex items-start gap-3 border-t aia-border-rule pt-5 text-sm leading-6">
        <input
          type="checkbox"
          required
          checked={draft.consentToShareProfile}
          onChange={(event) => setDraft((current) => ({ ...current, consentToShareProfile: event.target.checked }))}
          className="mt-1 h-4 w-4"
        />
        <span>我同意将上述账户资料和申请内容提供给所选教师，用于处理本次 Coffee Talk 申请。</span>
      </label>

      <div className="space-y-2">
        <Label htmlFor="coffee-talk-notes">补充说明</Label>
        <Textarea
          id="coffee-talk-notes"
          name="notes"
          rows={5}
          maxLength={4000}
          aria-describedby="coffee-talk-notes-hint"
          placeholder="可选：简要说明希望讨论的问题或背景。"
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
        />
        <p id="coffee-talk-notes-hint" className="aia-text-muted text-xs leading-5">
          请勿在此填写不必要的敏感信息。<CharacterCount value={draft.notes} maximum={coffeeTalkFieldLimits.notes} />
        </p>
      </div>

      {submitError ? (
        <p className="flex items-center gap-2 text-sm text-[hsl(var(--aia-red))]" role="alert">
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
