import Link from "next/link"
import { ArrowLeft, ArrowRight, Network, UserRound } from "lucide-react"
import type {
  PublicDirectoryPerson,
  PublicDirectoryUpdate,
  PublicResearchGroup,
  PublicResearchOutput,
} from "@/components/institute/demo-directory-data"
import { ResearchOutputList } from "@/components/institute/research-output-list"

type ResearchGroupProfileProps = {
  group: PublicResearchGroup
  leader?: PublicDirectoryPerson
  members?: readonly PublicDirectoryPerson[]
  outputs?: readonly PublicResearchOutput[]
  updates?: readonly PublicDirectoryUpdate[]
}

export function ResearchGroupProfile({
  group,
  leader,
  members = [],
  outputs = [],
  updates = [],
}: ResearchGroupProfileProps) {
  const publicMembers = members.filter((member) => member.visibility === "public" && group.memberSlugs.includes(member.slug))
  const relatedOutputs = outputs.filter((output) => output.groupSlugs.includes(group.slug))
  const relatedUpdates = updates.filter((update) => update.relatedGroupSlugs.includes(group.slug))

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="container-custom max-w-5xl">
        <Link
          href="/groups"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回研究团队目录
        </Link>

        <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-primary">
              <Network className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{group.nameZh}</h1>
                {group.isDemo ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">演示数据</span> : null}
              </div>
              <p className="mt-2 text-base font-medium text-slate-500">{group.nameEn}</p>
            </div>
          </div>

          <p className="mt-7 max-w-3xl text-base leading-7 text-slate-600">{group.description}</p>

          <section aria-labelledby="group-research-areas" className="mt-8">
            <h2 id="group-research-areas" className="text-lg font-extrabold text-slate-900">研究主题</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.researchAreas.map((area) => (
                <span key={area} className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-primary">
                  {area}
                </span>
              ))}
            </div>
          </section>

          <section aria-labelledby="group-recruitment-note" className="mt-8 rounded-lg bg-slate-50 p-4">
            <h2 id="group-recruitment-note" className="text-sm font-extrabold text-slate-900">公开说明</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{group.recruitmentNote}</p>
          </section>
        </article>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <section aria-labelledby="group-members-title" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-primary">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 id="group-members-title" className="text-xl font-extrabold tracking-tight text-slate-900">公开成员</h2>
            </div>
            {leader && leader.visibility === "public" ? (
              <Link
                href={`/people/${leader.slug}`}
                className="mt-5 block rounded-lg border border-sky-100 bg-sky-50/60 p-4 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span className="text-xs font-semibold text-primary">公开负责人</span>
                <span className="mt-1 block text-sm font-bold text-slate-900">{leader.nameZh}</span>
                <span className="mt-1 block text-xs text-slate-500">{leader.nameEn}</span>
              </Link>
            ) : null}
            {publicMembers.length > 0 ? (
              <ul className="mt-3 space-y-2" aria-label="公开成员">
                {publicMembers.map((member) => (
                  <li key={member.slug}>
                    <Link
                      href={`/people/${member.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-sky-300 hover:bg-sky-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <span>
                        <span className="block text-sm font-bold text-slate-900">{member.nameZh}</span>
                        <span className="mt-1 block text-xs text-slate-500">{member.title}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-600">暂未发布可公开展示的成员资料。</p>
            )}
          </section>

          <ResearchOutputList outputs={relatedOutputs} />
        </div>

        <section aria-labelledby="group-updates-title" className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 id="group-updates-title" className="text-xl font-extrabold tracking-tight text-slate-900">相关动态</h2>
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
