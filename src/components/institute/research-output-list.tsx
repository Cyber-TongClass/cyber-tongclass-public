import { BookOpenText, Mail } from "lucide-react"
import Link from "next/link"

import type { PublicResearchOutput } from "@/components/institute/demo-directory-data"

type ResearchOutputListProps = {
  outputs: readonly PublicResearchOutput[]
  heading?: string
  emptyMessage?: string
  showSummary?: boolean
  underlineTitleLinks?: boolean
}

export function ResearchOutputList({
  outputs,
  heading = "相关成果",
  emptyMessage = "暂未发布可公开展示的相关成果。",
  showSummary = true,
  underlineTitleLinks = true,
}: ResearchOutputListProps) {
  return (
    <section aria-labelledby="research-output-title" className="border aia-border-rule p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <BookOpenText className="mt-1 h-5 w-5 shrink-0 text-[hsl(var(--aia-muted))]" aria-hidden="true" />
        <div>
          <h2 id="research-output-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            {heading}
          </h2>
          <p className="aia-text-muted mt-1 text-sm leading-6">仅展示已批准公开的目录条目。</p>
        </div>
      </div>

      {outputs.length > 0 ? (
        <ul className="mt-6 border-t aia-border-rule" aria-label={heading}>
          {outputs.map((output) => (
            <li key={output.id} className="border-b aia-border-rule py-4">
              <div className="aia-mono flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--aia-muted))]">
                <span>{output.kind}</span>
                <span aria-hidden="true">·</span>
                <span>{output.year}</span>
                {output.isCorrespondingContributor ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" aria-hidden="true" />
                    通讯作者
                  </span>
                ) : null}
                {output.isDemo ? (
                  <span className="border border-dashed aia-border-rule px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.12em]">
                    演示数据
                  </span>
                ) : null}
              </div>
              <h3 className="aia-serif mt-2 text-base font-semibold text-[hsl(var(--aia-ink))]">
                {output.href ? (
                  <Link
                    href={output.href}
                    className={underlineTitleLinks
                      ? "aia-link aia-focus"
                      : "aia-focus transition-colors hover:text-[hsl(var(--aia-red))]"}
                  >
                    {output.title}
                  </Link>
                ) : output.title}
              </h3>
              {showSummary ? (
                <p className="aia-text-muted mt-2 text-sm leading-6">{output.summary}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="aia-text-muted mt-6 border border-dashed aia-border-rule p-4 text-sm leading-6">{emptyMessage}</p>
      )}
    </section>
  )
}
