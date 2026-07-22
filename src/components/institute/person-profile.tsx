import Link from "next/link"
import { ArrowLeft, ArrowRight, Coffee, GraduationCap, Network, UserRound } from "lucide-react"
import type {
  PublicDirectoryPerson,
  PublicDirectoryUpdate,
  PublicResearchGroup,
  PublicResearchOutput,
} from "@/components/institute/demo-directory-data"
import { ResearchOutputList } from "@/components/institute/research-output-list"

type PersonProfileProps = {
  person: PublicDirectoryPerson
  groups?: readonly PublicResearchGroup[]
  outputs?: readonly PublicResearchOutput[]
  updates?: readonly PublicDirectoryUpdate[]
}

export function PersonProfile({ person, groups = [], outputs = [], updates = [] }: PersonProfileProps) {
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
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="container-custom max-w-5xl">
        <Link
          href="/people"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回人员目录
        </Link>

        <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-50 text-primary">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{person.nameZh}</h1>
                  {person.isDemo ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">演示数据</span> : null}
                </div>
                <p className="mt-2 text-base font-medium text-slate-500">{person.nameEn}</p>
                <p className="mt-3 text-sm font-semibold text-primary">{person.title}</p>
              </div>
            </div>
            {person.kind === "teacher" && person.coffeeTalkOpen ? (
              <Link
                href="/services/coffee-talk"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                申请 Coffee Talk
                <Coffee className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <p className="mt-7 max-w-3xl text-base leading-7 text-slate-600">{person.bio}</p>

          <section aria-labelledby="person-research-areas" className="mt-8">
            <h2 id="person-research-areas" className="text-lg font-extrabold text-slate-900">研究方向</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {person.researchAreas.map((area) => (
                <span key={area} className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-primary">
                  {area}
                </span>
              ))}
            </div>
          </section>
        </article>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <section aria-labelledby="person-groups-title" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-primary">
                <Network className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 id="person-groups-title" className="text-xl font-extrabold tracking-tight text-slate-900">相关团队</h2>
            </div>
            {publicGroups.length > 0 ? (
              <ul className="mt-5 space-y-3" aria-label="相关公开团队">
                {publicGroups.map((group) => (
                  <li key={group.slug}>
                    <Link
                      href={`/groups/${group.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-sky-300 hover:bg-sky-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <span>
                        <span className="block text-sm font-bold text-slate-900">{group.nameZh}</span>
                        <span className="mt-1 block text-xs text-slate-500">{group.nameEn}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-600">暂未发布相关公开团队资料。</p>
            )}
          </section>

          <ResearchOutputList outputs={relatedOutputs} />
        </div>

        <section aria-labelledby="person-updates-title" className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 id="person-updates-title" className="text-xl font-extrabold tracking-tight text-slate-900">相关动态</h2>
          {relatedUpdates.length > 0 ? (
            <ul className="mt-5 divide-y divide-slate-200" aria-label="相关公开动态">
              {relatedUpdates.map((update) => (
                <li key={update.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                    <span>{update.dateLabel}</span>
                    {update.isDemo ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">演示数据</span> : null}
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">{update.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{update.summary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-600">暂未发布相关公开动态。</p>
          )}
        </section>
      </div>
    </div>
  )
}
