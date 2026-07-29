"use client"

import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { usePublicInstituteResearch } from "@/lib/api"
import { formatPublicationAuthorsForText } from "@/lib/publication-authors"
import type { PublicInstituteResearch } from "@/types/institute"

const HOME_RESEARCH_LIMIT = 6

export function HomeLiveResearch({ index }: { index?: string }) {
  const research = usePublicInstituteResearch({ limit: HOME_RESEARCH_LIMIT }) as
    | PublicInstituteResearch[]
    | undefined

  return (
    <section aria-labelledby="home-research-title" className="border-b aia-border-rule">
      <div className="container-custom py-16 sm:py-20">
        <AiaSectionHeading
          kicker="研究 · Research"
          index={index}
          title="研究成果"
          description="研究院公开收录的近期研究成果。"
          href="/research"
          hrefLabel="全部研究"
          headingId="home-research-title"
        />

        {research === undefined ? (
          <p role="status" className="aia-text-muted mt-10 text-sm leading-7">
            正在加载公开研究成果…
          </p>
        ) : research.length === 0 ? (
          <p className="aia-text-muted mt-10 text-sm leading-7">
            暂无已公开的研究成果，收录完成后将在此呈现。
          </p>
        ) : (
          <ol className="mt-10 border-t aia-border-rule">
            {research.map((item) => {
              const isSafeExternalUrl = item.url?.startsWith("https://") || item.url?.startsWith("http://")
              return (
                <li
                  key={`${item.title}-${item.year}`}
                  className="grid gap-x-10 gap-y-2 border-b aia-border-rule py-6 sm:grid-cols-[6rem_minmax(0,1fr)]"
                >
                  <span className="aia-mono text-sm text-[hsl(var(--aia-muted))]">{item.year}</span>
                  <div className="min-w-0">
                    <h3 className="aia-serif text-xl font-semibold leading-snug text-[hsl(var(--aia-ink))]">
                      {item.title}
                    </h3>
                    <p className="aia-text-muted mt-2 text-sm leading-7">
                      {formatPublicationAuthorsForText(item.authors)}
                      {item.venue ? ` · ${item.venue}` : ""}
                    </p>
                    {isSafeExternalUrl ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="aia-link aia-focus mt-2 inline-block text-sm"
                      >
                        查看原文
                      </a>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
