"use client"

import { useEffect, useState } from "react"
import { Check, Eye, EyeOff, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ManagedResearchGroupProfile } from "@/types/institute"

export type ResearchGroupProfileDraft = ManagedResearchGroupProfile

type ResearchGroupProfileEditorProps = {
  profile: ResearchGroupProfileDraft
  disabled?: boolean
  onSave: (profile: ResearchGroupProfileDraft) => Promise<unknown>
}

const fieldClass =
  "aia-focus w-full border aia-border-rule bg-transparent px-3 py-2.5 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="aia-mono mb-2 block text-xs font-medium tracking-[0.08em] text-[hsl(var(--aia-ink))]">
      {children}
    </label>
  )
}

export function ResearchGroupProfileEditor({
  profile,
  disabled = false,
  onSave,
}: ResearchGroupProfileEditorProps) {
  const [draft, setDraft] = useState(profile)
  const [area, setArea] = useState("")
  const [link, setLink] = useState({ label: "", href: "" })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => setDraft(profile), [profile])

  function setText(field: keyof ResearchGroupProfileDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function addArea() {
    const value = area.trim()
    if (!value || draft.researchAreas.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) return
    setDraft((current) => ({ ...current, researchAreas: [...current.researchAreas, value] }))
    setArea("")
  }

  function addLink() {
    const label = link.label.trim()
    const href = link.href.trim()
    if (!label || !href) return
    setDraft((current) => ({ ...current, publicLinks: [...current.publicLinks, { label, href }] }))
    setLink({ label: "", href: "" })
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      await onSave(draft)
      setMessage("课题组资料已保存。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="group-profile-editor-title" className="mt-10 border-t aia-border-rule pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="aia-kicker">Public profile</p>
          <h2 id="group-profile-editor-title" className="aia-serif mt-2 text-2xl font-semibold text-[hsl(var(--aia-ink))]">
            公开资料
          </h2>
          <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
            这里的内容与课题组公开页面保持一致；未公开时仍可编辑并预备资料。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft.visibility === "public"}
          disabled={disabled || saving}
          onClick={() => setDraft((current) => ({
            ...current,
            visibility: current.visibility === "public" ? "hidden" : "public",
          }))}
          className="aia-focus inline-flex min-h-10 items-center gap-2 border aia-border-rule px-3 text-sm font-medium text-[hsl(var(--aia-ink))] disabled:opacity-50"
        >
          {draft.visibility === "public"
            ? <Eye className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            : <EyeOff className="h-4 w-4 aia-text-muted" aria-hidden="true" />}
          {draft.visibility === "public" ? "已公开" : "暂不公开"}
        </button>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="group-name-zh">中文名称</FieldLabel>
          <input id="group-name-zh" className={fieldClass} value={draft.nameZh} onChange={(event) => setText("nameZh", event.target.value)} disabled={disabled || saving} />
        </div>
        <div>
          <FieldLabel htmlFor="group-name-en">英文名称</FieldLabel>
          <input id="group-name-en" className={fieldClass} value={draft.nameEn} onChange={(event) => setText("nameEn", event.target.value)} disabled={disabled || saving} />
        </div>
        <div>
          <FieldLabel htmlFor="group-summary-zh">中文摘要</FieldLabel>
          <textarea id="group-summary-zh" rows={3} className={fieldClass} value={draft.summaryZh} onChange={(event) => setText("summaryZh", event.target.value)} disabled={disabled || saving} />
        </div>
        <div>
          <FieldLabel htmlFor="group-summary-en">英文摘要</FieldLabel>
          <textarea id="group-summary-en" rows={3} className={fieldClass} value={draft.summaryEn} onChange={(event) => setText("summaryEn", event.target.value)} disabled={disabled || saving} />
        </div>
        <div>
          <FieldLabel htmlFor="group-description-zh">中文介绍</FieldLabel>
          <textarea id="group-description-zh" rows={6} className={fieldClass} value={draft.descriptionZh} onChange={(event) => setText("descriptionZh", event.target.value)} disabled={disabled || saving} />
        </div>
        <div>
          <FieldLabel htmlFor="group-description-en">英文介绍</FieldLabel>
          <textarea id="group-description-en" rows={6} className={fieldClass} value={draft.descriptionEn} onChange={(event) => setText("descriptionEn", event.target.value)} disabled={disabled || saving} />
        </div>
      </div>

      <div className="mt-6">
        <FieldLabel htmlFor="group-research-area">研究方向</FieldLabel>
        <div className="flex flex-wrap gap-2" aria-label="研究方向标签">
          {draft.researchAreas.map((item) => (
            <span key={item} className="aia-mono aia-bg-tag inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[hsl(var(--aia-ink))]">
              {item}
              <button
                type="button"
                aria-label={`移除研究方向 ${item}`}
                className="aia-focus"
                disabled={disabled || saving}
                onClick={() => setDraft((current) => ({ ...current, researchAreas: current.researchAreas.filter((areaItem) => areaItem !== item) }))}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            id="group-research-area"
            className={fieldClass}
            value={area}
            onChange={(event) => setArea(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addArea()
              }
            }}
            placeholder="输入方向后添加"
            disabled={disabled || saving}
          />
          <Button type="button" variant="outline" disabled={disabled || saving || !area.trim()} onClick={addArea}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />添加研究方向
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="group-recruitment-zh">中文招生与合作说明</FieldLabel>
          <textarea id="group-recruitment-zh" rows={4} className={fieldClass} value={draft.recruitmentZh} onChange={(event) => setText("recruitmentZh", event.target.value)} disabled={disabled || saving} />
        </div>
        <div>
          <FieldLabel htmlFor="group-recruitment-en">英文招生与合作说明</FieldLabel>
          <textarea id="group-recruitment-en" rows={4} className={fieldClass} value={draft.recruitmentEn} onChange={(event) => setText("recruitmentEn", event.target.value)} disabled={disabled || saving} />
        </div>
      </div>

      <div className="mt-6">
        <p className="aia-mono text-xs font-medium tracking-[0.08em] text-[hsl(var(--aia-ink))]">公开链接</p>
        {draft.publicLinks.length > 0 ? (
          <ul className="mt-3 border-t aia-border-rule">
            {draft.publicLinks.map((item, index) => (
              <li key={`${item.href}-${index}`} className="flex items-center justify-between gap-4 border-b aia-border-rule py-3 text-sm">
                <span className="min-w-0">
                  <span className="aia-serif block font-semibold text-[hsl(var(--aia-ink))]">{item.label}</span>
                  <span className="aia-mono aia-text-muted mt-0.5 block truncate text-xs">{item.href}</span>
                </span>
                <button type="button" className="aia-link aia-focus shrink-0 text-xs" disabled={disabled || saving} onClick={() => setDraft((current) => ({ ...current, publicLinks: current.publicLinks.filter((_, itemIndex) => itemIndex !== index) }))}>
                  移除
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="aia-text-muted mt-3 text-sm">暂无公开链接。</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]">
          <label className="sr-only" htmlFor="group-link-label">链接名称</label>
          <input id="group-link-label" className={fieldClass} value={link.label} onChange={(event) => setLink((current) => ({ ...current, label: event.target.value }))} placeholder="链接名称" disabled={disabled || saving} />
          <label className="sr-only" htmlFor="group-link-href">链接地址</label>
          <input id="group-link-href" className={fieldClass} value={link.href} onChange={(event) => setLink((current) => ({ ...current, href: event.target.value }))} placeholder="https://…" disabled={disabled || saving} />
          <Button type="button" variant="outline" disabled={disabled || saving || !link.label.trim() || !link.href.trim()} onClick={addLink}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />添加公开链接
          </Button>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4 border-t aia-border-rule pt-6">
        <Button type="button" disabled={disabled || saving || !draft.nameZh.trim() || !draft.nameEn.trim()} onClick={() => void save()}>
          <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />{saving ? "正在保存…" : "保存公开资料"}
        </Button>
        {message ? <p role="status" className="aia-text-muted text-sm">{message}</p> : null}
      </div>
    </section>
  )
}
