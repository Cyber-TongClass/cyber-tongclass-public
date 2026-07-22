"use client"

import Link from "next/link"
import { ArrowRight, BrainCircuit, UsersRound } from "lucide-react"

import { usePublicInstituteResearch } from "@/lib/api"
import type { PublicInstituteResearch } from "@/types/institute"

export default function ResearchPage() {
  const research = usePublicInstituteResearch({ limit: 24 }) as PublicInstituteResearch[] | undefined

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Research</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">研究</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            汇集研究主题、协作入口与经发布流程确认的公开研究成果，帮助访问者从公开信息开始了解研究院工作。
          </p>
        </div>
      </section>

      <section aria-labelledby="research-entry-title" className="bg-white py-16 sm:py-20">
        <div className="container-custom max-w-5xl">
          <div className="mb-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 p-7 shadow-sm">
              <BrainCircuit className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 id="research-entry-title" className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
                研究主题与项目
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                下方仅展示已经公开发布的研究成果；未公开或尚未核验的资料不会出现在这里。
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-7 shadow-sm">
              <UsersRound className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">协作入口</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                通过研究团队目录了解面向公开访问的协作单元与后续服务信息。
              </p>
              <Link
                href="/groups"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                浏览研究团队
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Public research</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">公开研究成果</h2>
            </div>
          </div>

          {research === undefined ? (
            <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">
              正在加载公开研究成果…
            </p>
          ) : research.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-7 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-900">暂无已公开的研究成果</p>
              <p className="mt-2">新的内容将在通过发布流程后显示在此处。</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {research.map((item) => (
                <article key={`${item.title}-${item.year}`} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-primary">{item.category}</span>
                    <span className="text-slate-500">{item.year}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{item.title}</h3>
                  {item.authors.length > 0 ? <p className="mt-2 text-sm text-slate-600">{item.authors.join("、")}</p> : null}
                  <p className="mt-2 text-sm font-medium text-slate-700">{item.venue}</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.abstract}</p>
                  {(item.people?.length || item.researchGroups?.length) ? (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs">
                      {item.people?.map((person) => (
                        <Link
                          key={`person-${person.slug}`}
                          href={`/people/${person.slug}`}
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-700 hover:border-primary hover:text-primary"
                        >
                          {person.nameZh || person.nameEn}
                        </Link>
                      ))}
                      {item.researchGroups?.map((group) => (
                        <Link
                          key={`group-${group.slug}`}
                          href={`/groups/${group.slug}`}
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-700 hover:border-primary hover:text-primary"
                        >
                          {group.nameZh || group.nameEn}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
