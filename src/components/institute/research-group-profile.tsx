import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Network, UserRound } from "lucide-react"

import type {
  PublicDirectoryPerson,
  PublicDirectoryUpdate,
  PublicResearchGroup,
  PublicResearchOutput,
} from "@/components/institute/demo-directory-data"
import { AiaRule } from "@/components/institute/editorial/rule"
import { ResearchOutputList } from "@/components/institute/research-output-list"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"
import { withReturnTo } from "@/lib/safe-local-path"

type PublicGroupMember = {
  person: PublicDirectoryPerson
  roleLabel?: string
}

type ResearchGroupProfileProps = {
  group: PublicResearchGroup
  leader?: PublicDirectoryPerson
  members?: readonly PublicDirectoryPerson[]
  memberRoles?: readonly PublicGroupMember[]
  outputs?: readonly PublicResearchOutput[]
  updates?: readonly PublicDirectoryUpdate[]
}

export function ResearchGroupProfile({
  group,
  leader,
  members = [],
  memberRoles,
  outputs = [],
  updates = [],
}: ResearchGroupProfileProps) {
  const membershipMembers: readonly PublicGroupMember[] = memberRoles === undefined
    ? members
      .filter((member) => member.visibility === "public" && group.memberSlugs.includes(member.slug))
      .map((member) => ({ person: member }))
    : memberRoles.filter((member) => member.person.visibility === "public")
  const publicMembers = membershipMembers.filter((member) => member.person.slug !== leader?.slug)
  const leaderRoleLabel = memberRoles
    ?.find((member) => member.person.slug === leader?.slug)
    ?.roleLabel ?? "公开负责人"
  const relatedOutputs = outputs.filter((output) => output.groupSlugs.includes(group.slug))
  const relatedUpdates = updates.filter((update) => update.relatedGroupSlugs.includes(group.slug))

  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container-custom max-w-5xl">
        <SafeReturnLink fallback="/groups" className="aia-link aia-focus inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回研究团队目录
        </SafeReturnLink>

        <article className="mt-8">
          <p className="aia-kicker flex items-center gap-2">
            <Network className="h-4 w-4" aria-hidden="true" />
            研究团队
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="aia-serif text-4xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
              {group.nameZh}
            </h1>
            {group.isDemo ? (
              <span className="aia-mono border border-dashed aia-border-rule px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[hsl(var(--aia-muted))]">
                演示数据
              </span>
            ) : null}
          </div>
          <p className="aia-mono mt-3 text-sm text-[hsl(var(--aia-muted))]">{group.nameEn}</p>

          <AiaRule className="mt-8" />

          <p className="aia-text-muted mt-8 max-w-3xl text-base leading-8">{group.description}</p>

          <section aria-labelledby="group-research-areas" className="mt-10">
            <h2 id="group-research-areas" className="aia-serif text-lg font-semibold text-[hsl(var(--aia-ink))]">
              研究主题
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.researchAreas.map((area) => (
                <span
                  key={area}
                  className="aia-mono aia-bg-tag px-2.5 py-1 text-[0.7rem] font-medium tracking-[0.08em] text-[hsl(var(--aia-ink))]"
                >
                  {area}
                </span>
              ))}
            </div>
          </section>

          <section aria-labelledby="group-recruitment-note" className="mt-10 border-l-2 border-[hsl(var(--aia-red))] pl-5">
            <h2 id="group-recruitment-note" className="aia-mono text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--aia-ink))]">
              公开说明
            </h2>
            <p className="aia-text-muted mt-3 max-w-3xl text-sm leading-7">{group.recruitmentNote}</p>
          </section>
        </article>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.35fr]">
          <section aria-labelledby="group-members-title" className="border aia-border-rule p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-[hsl(var(--aia-muted))]" aria-hidden="true" />
              <h2 id="group-members-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
                公开成员
              </h2>
            </div>
            {leader && leader.visibility === "public" ? (
              <Link
                href={withReturnTo(`/people/${leader.slug}`, `/groups/${group.slug}`)}
                className="aia-focus group mt-5 block border aia-border-rule p-4 transition-colors hover:border-[hsl(var(--aia-red))]"
              >
                <span className="aia-mono text-xs uppercase tracking-[0.12em] text-[hsl(var(--aia-red))]">
                  {leaderRoleLabel}
                </span>
                <span className="aia-serif mt-2 block text-base font-semibold text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                  {leader.nameZh}
                </span>
                <span className="aia-mono mt-1 block text-xs text-[hsl(var(--aia-muted))]">{leader.nameEn}</span>
              </Link>
            ) : null}
            {publicMembers.length > 0 ? (
              <ul className="mt-4 border-t aia-border-rule" aria-label="公开成员">
                {publicMembers.map((member) => (
                  <li key={member.person.slug} className="border-b aia-border-rule">
                    <Link
                      href={withReturnTo(`/people/${member.person.slug}`, `/groups/${group.slug}`)}
                      className="aia-focus group flex items-center justify-between gap-3 py-3.5"
                    >
                      <span>
                        <span className="aia-serif block text-base font-semibold text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                          {member.person.nameZh}
                        </span>
                        <span className="aia-text-muted mt-1 block text-xs">
                          {member.person.title}{member.roleLabel ? ` · ${member.roleLabel}` : ""}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="aia-text-muted mt-5 text-sm leading-6">暂未发布可公开展示的成员资料。</p>
            )}
          </section>

          <ResearchOutputList outputs={relatedOutputs} />
        </div>

        <section aria-labelledby="group-updates-title" className="mt-10 border aia-border-rule p-6 sm:p-7">
          <h2 id="group-updates-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            相关动态
          </h2>
          {relatedUpdates.length > 0 ? (
            <ul className="mt-5 border-t aia-border-rule" aria-label="相关公开动态">
              {relatedUpdates.map((update) => (
                <li key={update.id} className="border-b aia-border-rule py-4">
                  <div className="aia-mono flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--aia-muted))]">
                    <span>{update.dateLabel}</span>
                    {update.isDemo ? (
                      <span className="border border-dashed aia-border-rule px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.12em]">
                        演示数据
                      </span>
                    ) : null}
                  </div>
                  <h3 className="aia-serif mt-2 text-base font-semibold text-[hsl(var(--aia-ink))]">
                    {update.href ? <Link href={update.href} className="aia-link">{update.title}</Link> : update.title}
                  </h3>
                  <p className="aia-text-muted mt-2 text-sm leading-6">{update.summary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="aia-text-muted mt-5 text-sm leading-6">暂未发布相关公开动态。</p>
          )}
        </section>
      </div>
    </div>
  )
}
