"use client"

import Link from "next/link"
import { ArrowUpRight, Network } from "lucide-react"

import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { usePublicResearchGroups } from "@/lib/api"
import type { PublicResearchGroup } from "@/types/institute"

/**
 * Compact research-group listing for the people page. Hidden entirely until at
 * least one group is published; each row shows the leader and the roster
 * (display names plus leader-set subtitles) that leaders curate from the
 * private group-management page.
 */
export function LivePeopleGroups() {
  const groups = usePublicResearchGroups({ limit: 50 }) as PublicResearchGroup[] | undefined

  if (groups === undefined) {
    return (
      <section className="border-b aia-border-rule" aria-live="polite">
        <div className="container-custom py-16 sm:py-20">
          <p className="aia-text-muted border border-dashed aia-border-rule p-6 text-sm leading-6" role="status">
            正在加载课题组信息…
          </p>
        </div>
      </section>
    )
  }

  if (groups.length === 0) return null

  return (
    <section aria-labelledby="people-groups-title" className="border-b aia-border-rule">
      <div className="container-custom py-16 sm:py-20">
        <AiaSectionHeading
          kicker="课题组 · Research Groups"
          title="课题组"
          description="研究院教师负责的课题组及其成员名单。"
          href="/groups"
          hrefLabel="研究团队目录"
          headingId="people-groups-title"
        />

        <ul className="mt-10 border-t aia-border-rule">
          {groups.map((group) => {
            const roster = group.roster ?? []
            return (
              <li key={group.slug} className="border-b aia-border-rule py-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <Link
                    href={`/groups/${group.slug}`}
                    className="aia-focus group inline-flex items-baseline gap-3"
                  >
                    <span className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                      {group.nameZh}
                    </span>
                    <span className="aia-mono text-xs text-[hsl(var(--aia-muted))]">{group.nameEn}</span>
                    <ArrowUpRight
                      className="h-4 w-4 self-center text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
                      aria-hidden="true"
                    />
                  </Link>
                  {group.leader ? (
                    <p className="aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted">
                      负责人 · {group.leader.nameZh}
                    </p>
                  ) : null}
                </div>
                {roster.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${group.nameZh}成员名单`}>
                    {roster.map((entry) => (
                      <li
                        key={entry.name}
                        className="aia-bg-tag inline-flex items-baseline gap-2 px-2.5 py-1 text-sm text-[hsl(var(--aia-ink))]"
                      >
                        {entry.name}
                        {entry.subtitle ? (
                          <span className="aia-text-muted text-xs">{entry.subtitle}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="aia-text-muted mt-3 flex items-center gap-2 text-xs">
                    <Network className="h-3.5 w-3.5" aria-hidden="true" />
                    成员名单由课题组负责人维护，暂未公布。
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
