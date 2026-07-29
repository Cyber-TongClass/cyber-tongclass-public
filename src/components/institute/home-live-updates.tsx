"use client"

import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { usePublicInstituteUpdates } from "@/lib/api"
import type { PublicInstituteUpdate } from "@/types/institute"

const HOME_UPDATES_LIMIT = 6

const updateDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

export function HomeLiveUpdates({ index }: { index?: string }) {
  const updates = usePublicInstituteUpdates({ limit: HOME_UPDATES_LIMIT }) as
    | PublicInstituteUpdate[]
    | undefined

  return (
    <section aria-labelledby="home-updates-title" className="border-b aia-border-rule">
      <div className="container-custom py-16 sm:py-20">
        <AiaSectionHeading
          kicker="动态 · Updates"
          index={index}
          title="焦点动态"
          description="研究院公开发布的动态与公告。"
          href="/updates"
          hrefLabel="全部动态"
          headingId="home-updates-title"
        />

        {updates === undefined ? (
          <p role="status" className="aia-text-muted mt-10 text-sm leading-7">
            正在加载公开动态…
          </p>
        ) : updates.length === 0 ? (
          <p className="aia-text-muted mt-10 text-sm leading-7">
            暂无已公开的动态，新的公告将在发布后显示在此处。
          </p>
        ) : (
          <ol className="mt-10 border-t aia-border-rule">
            {updates.map((update) => (
              <li
                key={`${update.title}-${update.publishedAt}`}
                className="grid gap-x-10 gap-y-2 border-b aia-border-rule py-6 sm:grid-cols-[10rem_minmax(0,1fr)]"
              >
                <div className="flex flex-row items-baseline gap-3 sm:flex-col sm:gap-1.5">
                  <time
                    className="aia-mono text-xs text-[hsl(var(--aia-muted))]"
                    dateTime={new Date(update.publishedAt).toISOString()}
                  >
                    {updateDateFormatter.format(new Date(update.publishedAt))}
                  </time>
                  <span className="aia-mono text-xs uppercase tracking-[0.14em] text-[hsl(var(--aia-red))]">
                    {update.category}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="aia-serif text-xl font-semibold leading-snug text-[hsl(var(--aia-ink))] sm:text-2xl">
                    {update.title}
                  </h3>
                  {update.homepageSubtitle ? (
                    <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-7">
                      {update.homepageSubtitle}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
