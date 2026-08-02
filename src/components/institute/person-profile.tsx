import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Coffee, GraduationCap, Network, UserRound } from "lucide-react"

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

type PersonProfileProps = {
  person: PublicDirectoryPerson
  groups?: readonly PublicResearchGroup[]
  outputs?: readonly PublicResearchOutput[]
  updates?: readonly PublicDirectoryUpdate[]
}

export function PersonProfile({
  person,
  groups = [],
  outputs = [],
  updates = [],
}: PersonProfileProps) {
  const Icon = person.kind === "teacher" ? UserRound : GraduationCap
  const publicGroups = groups.filter(
    (group) => group.visibility === "public" && (
      group.memberSlugs.includes(person.slug)
      || person.groupSlugs.includes(group.slug)
      || group.leaderSlug === person.slug
    ),
  )
  const relatedOutputs = outputs.filter((output) => output.contributorSlugs.includes(person.slug))
  const relatedUpdates = updates.filter((update) => update.relatedPersonSlugs.includes(person.slug))

  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container-custom max-w-5xl">
        <SafeReturnLink fallback="/people" className="aia-link aia-focus inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回人员目录
        </SafeReturnLink>

        <article className="mt-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-5">
              {person.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.photoUrl} alt={`${person.nameZh}的公开头像`} className="h-24 w-24 shrink-0 rounded-full border aia-border-rule object-cover sm:h-28 sm:w-28" />
              ) : null}
              <div>
              <p className="aia-kicker flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {person.kind === "teacher" ? "教师" : "研究生"}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="aia-serif text-4xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
                  {person.nameZh}
                </h1>
                {person.isDemo ? (
                  <span className="aia-mono border border-dashed aia-border-rule px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[hsl(var(--aia-muted))]">
                    演示数据
                  </span>
                ) : null}
              </div>
              <p className="aia-mono mt-3 text-sm text-[hsl(var(--aia-muted))]">{person.nameEn}</p>
              <p className="mt-3 text-sm font-semibold text-[hsl(var(--aia-red))]">{person.title}</p>
              </div>
            </div>
            {person.kind === "teacher" && person.coffeeTalkOpen ? (
              <Link
                href={withReturnTo(`/services/coffee-talk/apply?teacher=${encodeURIComponent(person.slug)}`, `/people/${person.slug}`)}
                className="aia-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-[hsl(var(--aia-red))] px-5 py-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-[hsl(var(--aia-red-deep))]"
              >
                申请 Coffee Talk
                <Coffee className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <AiaRule className="mt-8" />

          <p className="aia-text-muted mt-8 max-w-3xl text-base leading-8">{person.bio}</p>

          <section aria-labelledby="person-research-areas" className="mt-10">
            <h2 id="person-research-areas" className="aia-serif text-lg font-semibold text-[hsl(var(--aia-ink))]">
              研究方向
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {person.researchAreas.map((area) => (
                <span
                  key={area}
                  className="aia-mono aia-bg-tag px-2.5 py-1 text-[0.7rem] font-medium tracking-[0.08em] text-[hsl(var(--aia-ink))]"
                >
                  {area}
                </span>
              ))}
            </div>
          </section>
        </article>

        {person.kind !== "teacher" ? (
          <>
            <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.35fr]">
              <section aria-labelledby="person-groups-title" className="border aia-border-rule p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <Network className="h-5 w-5 text-[hsl(var(--aia-muted))]" aria-hidden="true" />
                  <h2 id="person-groups-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
                    相关团队
                  </h2>
                </div>
                {publicGroups.length > 0 ? (
                  <ul className="mt-5 border-t aia-border-rule" aria-label="相关公开团队">
                    {publicGroups.map((group) => (
                      <li key={group.slug} className="border-b aia-border-rule">
                        <Link
                          href={withReturnTo(`/groups/${group.slug}`, `/people/${person.slug}`)}
                          className="aia-focus group flex items-center justify-between gap-3 py-4"
                        >
                          <span>
                            <span className="aia-serif block text-base font-semibold text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                              {group.nameZh}
                            </span>
                            <span className="aia-mono mt-1 block text-xs text-[hsl(var(--aia-muted))]">{group.nameEn}</span>
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
                  <p className="aia-text-muted mt-5 text-sm leading-6">暂未发布相关公开团队资料。</p>
                )}
              </section>

              <ResearchOutputList outputs={relatedOutputs} />
            </div>

            <section aria-labelledby="person-updates-title" className="mt-10 border aia-border-rule p-6 sm:p-7">
              <h2 id="person-updates-title" className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
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
          </>
        ) : null}
      </div>
    </div>
  )
}
