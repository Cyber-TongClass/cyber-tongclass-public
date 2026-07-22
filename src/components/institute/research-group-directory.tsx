import Link from "next/link"
import { ArrowRight, Network } from "lucide-react"
import type { PublicResearchGroup } from "@/components/institute/demo-directory-data"

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
    <section aria-labelledby="research-group-directory-title" className="bg-white py-16 sm:py-20">
      <div className="container-custom">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Research groups</p>
          <h2 id="research-group-directory-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
        </div>

        {visibleGroups.length > 0 ? (
          <ul className="mt-10 grid gap-5 md:grid-cols-2" aria-label="研究团队公开目录">
            {visibleGroups.map((group) => (
              <li key={group.slug}>
                <Link
                  href={`/groups/${group.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-primary">
                      <Network className="h-5 w-5" aria-hidden="true" />
                    </div>
                    {group.isDemo ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">演示数据</span> : null}
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">{group.nameZh}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">{group.nameEn}</p>
                  <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{group.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2" aria-label="研究主题">
                    {group.researchAreas.map((area) => (
                      <span key={area} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-primary">
                        {area}
                      </span>
                    ))}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    查看团队公开资料
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">{emptyMessage}</p>
        )}
      </div>
    </section>
  )
}
