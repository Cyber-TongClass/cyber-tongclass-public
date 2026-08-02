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
import { getSafeExternalUrl } from "@/lib/safe-external-url"
import { withReturnTo } from "@/lib/safe-local-path"

type PublicGroupMember = {
  person: PublicDirectoryPerson
  roleLabel?: string
}

type RosterEntry = {
  name: string
  subtitle?: string
  profileHref?: string
}

type ResearchGroupProfileProps = {
  group: PublicResearchGroup
  leader?: PublicDirectoryPerson
  members?: readonly PublicDirectoryPerson[]
  memberRoles?: readonly PublicGroupMember[]
  roster?: readonly RosterEntry[]
  outputs?: readonly PublicResearchOutput[]
  updates?: readonly PublicDirectoryUpdate[]
}

type OrderedPublicGroupMember = PublicGroupMember & {
  isLeader: boolean
}

function buildOrderedPublicGroupMembers({
  leader,
  memberRoles,
}: {
  leader?: PublicDirectoryPerson
  memberRoles: readonly PublicGroupMember[]
}): OrderedPublicGroupMember[] {
  const orderedMembers: OrderedPublicGroupMember[] = []

  if (leader?.visibility === "public") {
    const leaderMembership = memberRoles.find((member) => member.person.slug === leader.slug)
    orderedMembers.push({
      person: leader,
      roleLabel: leaderMembership?.roleLabel ?? "公开负责人",
      isLeader: true,
    })
  }

  for (const member of memberRoles) {
    if (member.person.slug === leader?.slug) continue
    orderedMembers.push({ ...member, isLeader: false })
  }

  return orderedMembers
}

export function ResearchGroupProfile({
  group,
  leader,
  members = [],
  memberRoles,
  roster = [],
  outputs = [],
  updates = [],
}: ResearchGroupProfileProps) {
  const membershipMembers: readonly PublicGroupMember[] = memberRoles === undefined
    ? members
      .filter((member) => member.visibility === "public" && group.memberSlugs.includes(member.slug))
      .map((member) => ({ person: member }))
    : memberRoles.filter((member) => member.person.visibility === "public")
  const orderedPublicMembers = buildOrderedPublicGroupMembers({
    leader,
    memberRoles: membershipMembers,
  })
  const publicLeader = orderedPublicMembers[0]?.isLeader ? orderedPublicMembers[0] : undefined
  const publicMembers = publicLeader ? orderedPublicMembers.slice(1) : orderedPublicMembers
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

          {group.publicLinks.length > 0 ? (
            <section aria-labelledby="group-public-links" className="mt-10">
              <h2 id="group-public-links" className="aia-serif text-lg font-semibold text-[hsl(var(--aia-ink))]">
                公开链接
              </h2>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3" aria-label="团队公开链接">
                {group.publicLinks.map((link) => {
                  const safeHref = getSafeExternalUrl(link.href)
                  return (
                    <li key={`${link.label}-${link.href}`} className="aia-mono text-xs tracking-[0.05em]">
                      {safeHref ? (
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noreferrer"
                          className="aia-link aia-focus inline-flex items-center gap-1.5"
                        >
                          {link.label}
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-[hsl(var(--aia-muted))]">{link.label}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

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
            {publicLeader ? (
              <Link
                href={withReturnTo(`/people/${publicLeader.person.slug}`, `/groups/${group.slug}`)}
                className="aia-focus group mt-5 block border aia-border-rule p-4 transition-colors hover:border-[hsl(var(--aia-red))]"
              >
                <span className="aia-mono text-xs uppercase tracking-[0.12em] text-[hsl(var(--aia-red))]">
                  {publicLeader.roleLabel}
                </span>
                <span className="aia-serif mt-2 block text-base font-semibold text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                  {publicLeader.person.nameZh}
                </span>
                <span className="aia-mono mt-1 block text-xs text-[hsl(var(--aia-muted))]">{publicLeader.person.nameEn}</span>
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
            ) : roster.length === 0 ? (
              <p className="aia-text-muted mt-5 text-sm leading-6">暂未发布可公开展示的成员资料。</p>
            ) : null}
            {roster.length > 0 ? (
              <div className="mt-6">
                <h3 className="aia-mono text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--aia-ink))]">
                  课题组成员
                </h3>
                <ul className="mt-3 border-t aia-border-rule" aria-label="课题组成员名单">
                  {roster.map((entry) => (
                    <li key={entry.name} className="flex items-baseline justify-between gap-3 border-b aia-border-rule py-3">
                      {entry.profileHref ? (
                        <Link
                          href={withReturnTo(entry.profileHref, `/groups/${group.slug}`)}
                          className="aia-link aia-focus aia-serif text-base font-semibold"
                        >
                          {entry.name}
                        </Link>
                      ) : (
                        <span className="aia-serif text-base font-semibold text-[hsl(var(--aia-ink))]">{entry.name}</span>
                      )}
                      {entry.subtitle ? (
                        <span className="aia-text-muted shrink-0 text-xs">{entry.subtitle}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <ResearchOutputList
            outputs={relatedOutputs}
            showSummary={false}
            underlineTitleLinks={false}
          />
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
