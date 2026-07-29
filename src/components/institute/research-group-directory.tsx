import Link from "next/link"
import { ArrowUpRight, Network } from "lucide-react"

import type { PublicResearchGroup } from "@/components/institute/demo-directory-data"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"

type ResearchGroupDirectoryProps = {
  groups: readonly PublicResearchGroup[]
  heading?: string
  description?: string
  emptyMessage?: string
}

export function ResearchGroupDirectory({
  groups,
  heading = "研究团队目录",
  description = "浏览经批准公开的研究组与协作单元。",
  emptyMessage = "暂未发布可公开展示的研究团队。",
}: ResearchGroupDirectoryProps) {
  const visibleGroups = groups
    .filter((group) => group.visibility === "public")
    .toSorted((left, right) => left.sortOrder - right.sortOrder)

  return (
    <section aria-labelledby="research-group-directory-title" className="border-b aia-border-rule py-16 sm:py-20">
      <div className="container-custom">
        <AiaSectionHeading
          kicker="研究团队 · Groups"
          title={heading}
          description={description}
          headingId="research-group-directory-title"
        />

        {visibleGroups.length > 0 ? (
          <ul className="mt-10 grid gap-5 md:grid-cols-2" aria-label="研究团队公开目录">
            {visibleGroups.map((group) => (
              <li key={group.slug}>
                <Link
                  href={`/groups/${group.slug}`}
                  className="aia-focus group flex h-full flex-col border aia-border-rule p-6 transition-colors hover:border-[hsl(var(--aia-red))]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <Network
                      className="h-5 w-5 text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
                      aria-hidden="true"
                    />
                    {group.isDemo ? (
                      <span className="aia-mono border border-dashed aia-border-rule px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[hsl(var(--aia-muted))]">
                        演示数据
                      </span>
                    ) : null}
                  </div>
                  <h3 className="aia-serif mt-5 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                    {group.nameZh}
                  </h3>
                  <p className="aia-mono mt-1 text-xs text-[hsl(var(--aia-muted))]">{group.nameEn}</p>
                  <p className="aia-text-muted mt-4 flex-1 text-sm leading-6">{group.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2" aria-label="研究主题">
                    {group.researchAreas.map((area) => (
                      <span
                        key={area}
                        className="aia-mono aia-bg-tag px-2 py-1 text-[0.7rem] font-medium tracking-[0.08em] text-[hsl(var(--aia-ink))]"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                  <span className="aia-kicker mt-6 inline-flex items-center gap-1.5">
                    查看团队公开资料
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="aia-text-muted mt-10 border border-dashed aia-border-rule p-6 text-sm leading-6">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  )
}
