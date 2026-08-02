"use client"

import Link from "next/link"
import { ArrowUpRight, CalendarDays } from "lucide-react"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { usePublicInstituteUpdates } from "@/lib/api"
import type { PublicInstituteUpdate } from "@/types/institute"

const HOME_UPDATES_LIMIT = 6

const updateDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

function UpdateMeta({ update, inverse = false }: { update: PublicInstituteUpdate; inverse?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${inverse ? "text-white/65" : "aia-text-muted"}`}>
      <time dateTime={new Date(update.publishedAt).toISOString()}>
        {updateDateFormatter.format(new Date(update.publishedAt))}
      </time>
      <span aria-hidden="true">·</span>
      <span>{update.category}</span>
    </div>
  )
}

export function HomeLiveUpdates({ index }: { index?: string }) {
  const updates = usePublicInstituteUpdates({ limit: HOME_UPDATES_LIMIT }) as PublicInstituteUpdate[] | undefined
  const lead = updates?.[0]
  const secondary = updates?.slice(1)

  return (
    <section aria-labelledby="home-updates-title" className="border-b aia-border-rule bg-[hsl(var(--aia-paper))]">
      <div className="container-custom py-16 sm:py-20 lg:py-24">
        <AiaSectionHeading
          kicker="动态 · Updates"
          index={index}
          title="焦点动态"
          description="研究院公开发布的动态与公告。"
          href="/updates"
          hrefLabel="全部动态"
          headingId="home-updates-title"
          showRule={false}
        />

        {updates === undefined ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]" role="status" aria-label="正在加载公开动态">
            <div className="min-h-72 animate-pulse bg-[hsl(var(--aia-tag))]" />
            <div className="space-y-5 pt-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="border-b aia-border-rule pb-5">
                  <div className="h-3 w-32 animate-pulse bg-[hsl(var(--aia-rule))]" />
                  <div className="mt-4 h-5 w-4/5 animate-pulse bg-[hsl(var(--aia-rule))]" />
                </div>
              ))}
            </div>
          </div>
        ) : updates.length === 0 ? (
          <div className="mt-10 flex min-h-48 items-center border-y aia-border-rule">
            <div>
              <CalendarDays className="h-5 w-5 text-[hsl(var(--aia-red))]" aria-hidden="true" />
              <p className="mt-4 text-base font-medium text-[hsl(var(--aia-ink))]">暂无已公开的动态</p>
              <p className="aia-text-muted mt-2 text-sm leading-7">新的公告将在发布后显示在这里。</p>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid border-y aia-border-rule lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
            {lead ? (
              <Link href="/updates" className="aia-focus group relative flex min-h-[25rem] flex-col justify-end overflow-hidden bg-[hsl(var(--aia-ink))] p-6 text-white sm:p-8 lg:border-r lg:border-[hsl(var(--aia-rule))]">
                {lead.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lead.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--aia-ink))] via-[hsl(var(--aia-ink)/0.7)] to-transparent" aria-hidden="true" />
                <div className="relative max-w-xl">
                  <UpdateMeta update={lead} inverse />
                  <h3 className="mt-4 text-2xl font-semibold leading-snug tracking-[-0.02em] sm:text-3xl">{lead.title}</h3>
                  {lead.homepageSubtitle ? <p className="mt-3 text-sm leading-7 text-white/75">{lead.homepageSubtitle}</p> : null}
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                    查看全部动态
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ) : null}

            <ol className="divide-y divide-[hsl(var(--aia-rule))]">
              {secondary?.map((update) => (
                <li key={update.id}>
                  <Link href="/updates" className="aia-focus group flex min-h-24 items-start gap-5 px-5 py-5 transition-colors hover:bg-white sm:px-7">
                    <div className="min-w-0 flex-1">
                      <UpdateMeta update={update} />
                      <h3 className="mt-2 text-base font-semibold leading-6 text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))] sm:text-lg">
                        {update.title}
                      </h3>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[hsl(var(--aia-muted))] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[hsl(var(--aia-red))]" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
