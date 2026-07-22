"use client"

import Link from "next/link"
import { ArrowRight, BellRing, FileClock } from "lucide-react"

import { usePublicInstituteUpdates } from "@/lib/api"
import type { PublicInstituteUpdate } from "@/types/institute"

export default function UpdatesPage() {
  const updates = usePublicInstituteUpdates({ limit: 24 }) as PublicInstituteUpdate[] | undefined

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Updates</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">更新与公告</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            研究院的公开动态、公告和后续服务更新将在此集中呈现。
          </p>
        </div>
      </section>

      <section aria-labelledby="updates-status-title" className="bg-slate-50 py-16 sm:py-20">
        <div className="container-custom max-w-5xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-primary">
                <BellRing className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 id="updates-status-title" className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
                公开动态
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                为确保信息准确，这里仅显示已发布的研究院动态与公告。
              </p>
            </div>
          </div>

          {updates === undefined ? (
            <p className="mt-7 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm" role="status">
              正在加载公开动态…
            </p>
          ) : updates.length === 0 ? (
            <div className="mt-7 rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <p className="font-semibold text-slate-900">暂无已公开的动态</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                新的公告和更新将在完成发布流程后显示在此处。若需联系研究院，请使用下方入口。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/research"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  查看研究入口
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  联系研究院
                  <FileClock className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-7 space-y-5">
              {updates.map((update) => {
                const isSafeSourceUrl = update.sourceUrl?.startsWith("https://") || update.sourceUrl?.startsWith("http://")
                return (
                  <article key={`${update.title}-${update.publishedAt}`} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-primary">{update.category}</span>
                      <time className="text-slate-500" dateTime={new Date(update.publishedAt).toISOString()}>
                        {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(update.publishedAt))}
                      </time>
                    </div>
                    <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{update.title}</h3>
                    {update.homepageSubtitle ? <p className="mt-2 text-base font-medium text-slate-700">{update.homepageSubtitle}</p> : null}
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{update.content}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
                      {update.people?.map((person) => (
                        <Link
                          key={`person-${person.slug}`}
                          href={`/people/${person.slug}`}
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:border-primary hover:text-primary"
                        >
                          {person.nameZh || person.nameEn}
                        </Link>
                      ))}
                      {update.researchGroups?.map((group) => (
                        <Link
                          key={`group-${group.slug}`}
                          href={`/groups/${group.slug}`}
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:border-primary hover:text-primary"
                        >
                          {group.nameZh || group.nameEn}
                        </Link>
                      ))}
                      {isSafeSourceUrl ? (
                        <a
                          href={update.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex min-h-10 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          原始发布链接
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
