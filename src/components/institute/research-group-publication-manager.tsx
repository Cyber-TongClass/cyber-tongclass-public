"use client"

import { useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import type { ManagedResearchGroupPublication } from "@/types/institute"

export type ResearchGroupManagedPublication = ManagedResearchGroupPublication

type ResearchGroupPublicationManagerProps = {
  publications: ResearchGroupManagedPublication[]
  disabled?: boolean
  onSetVisibility: (publicationId: string, visible: boolean) => Promise<unknown>
}

const relationLabels: Record<string, string> = {
  automatic: "成员文章 · 自动归组",
  explicit: "手动关联",
  both: "成员文章 · 已手动关联",
}

export function ResearchGroupPublicationManager({
  publications,
  disabled = false,
  onSetVisibility,
}: ResearchGroupPublicationManagerProps) {
  const [pendingPublicationId, setPendingPublicationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const counts = useMemo(() => ({
    public: publications.filter((publication) => publication.effectiveVisibility === "public").length,
    hidden: publications.filter((publication) => publication.effectiveVisibility === "hidden").length,
  }), [publications])

  async function toggle(publication: ResearchGroupManagedPublication) {
    setPendingPublicationId(publication.id)
    setError(null)
    try {
      await onSetVisibility(publication.id, publication.effectiveVisibility !== "public")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "文章展示设置保存失败。")
    } finally {
      setPendingPublicationId(null)
    }
  }

  return (
    <section aria-labelledby="group-publications-manager-title" className="min-w-0 border-t aia-border-rule pt-7">
      <p className="aia-kicker">Publications</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="group-publications-manager-title" className="aia-serif text-xl font-semibold text-[hsl(var(--aia-ink))]">组内文章</h2>
        <p className="aia-mono aia-text-muted text-xs">
          全部 {publications.length} · 公开 {counts.public} · 隐藏 {counts.hidden}
        </p>
      </div>
      <p className="aia-text-muted mt-2 text-sm leading-6">
        系统按成员账号的结构化作者关系自动归组。隐藏只影响课题组公开页，文章仍保留在本列表中。
      </p>

      {publications.length > 0 ? (
        <ul className="mt-5 border-b aia-border-rule">
          {publications.map((publication) => {
            const visible = publication.effectiveVisibility === "public"
            const pending = pendingPublicationId === publication.id
            return (
              <li key={publication.id} className="border-t aia-border-rule py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="aia-mono text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--aia-red))]">
                      {relationLabels[publication.relationSource] ?? publication.relationSource}
                    </p>
                    <h3 className="aia-serif mt-1.5 text-base font-semibold leading-6 text-[hsl(var(--aia-ink))]">{publication.title}</h3>
                    <p className="aia-text-muted mt-1.5 text-xs leading-5">
                      {publication.authors.join("、") || "作者信息待补充"}
                      {publication.venue ? ` · ${publication.venue}` : ""}
                      {publication.year ? ` · ${publication.year}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    aria-label={`${visible ? "隐藏" : "显示"}文章《${publication.title}》`}
                    disabled={disabled || pending}
                    onClick={() => void toggle(publication)}
                    className="aia-focus inline-flex min-h-11 shrink-0 items-center gap-1.5 border aia-border-rule px-2.5 text-xs font-medium text-[hsl(var(--aia-ink))] disabled:opacity-50"
                  >
                    {visible ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                    {pending ? "保存中…" : visible ? "显示在课题组主页" : "已隐藏"}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="aia-text-muted mt-5 border-y aia-border-rule py-5 text-sm">
          暂未找到由负责人或组内成员署名的结构化文章。
        </p>
      )}
      {error ? <p role="alert" className="mt-4 text-sm text-[hsl(var(--aia-red))]">{error}</p> : null}
    </section>
  )
}
