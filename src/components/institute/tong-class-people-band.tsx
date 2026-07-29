"use client"

import Link from "next/link"

import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { useUsers } from "@/lib/api"

const DEFAULT_BAND_LIMIT = 8

type BandMember = {
  username?: string
  chineseName?: string
  englishName?: string
  researchDirections?: string[]
  titles?: { title: string; link: string }[]
  cohort?: number | "mascot"
}

function memberDisplayName(member: BandMember) {
  return member.chineseName || member.englishName || member.username || ""
}

function memberMeta(member: BandMember) {
  const title = member.titles?.[0]?.title?.trim()
  if (title) return title
  const direction = member.researchDirections?.[0]?.trim()
  if (direction) return direction
  if (typeof member.cohort === "number") return `${member.cohort} 级`
  return ""
}

export function TongClassPeopleBand({
  index,
  kicker = "人员 · People",
  title = "通班人员",
  description = "来自通班的公开成员名录。人员目录在此优先呈现，更多研究院人员信息见人员目录。",
  headingHref = "/people",
  headingHrefLabel = "全部人员",
  limit = DEFAULT_BAND_LIMIT,
}: {
  index?: string
  kicker?: string
  title?: string
  description?: string
  headingHref?: string
  headingHrefLabel?: string
  limit?: number
}) {
  const users = useUsers() as BandMember[] | undefined
  const members = (users ?? [])
    .filter((member) => member.username && memberDisplayName(member))
    .slice(0, limit)

  return (
    <section aria-labelledby="tong-class-people-band-title" className="border-b aia-border-rule">
      <div className="container-custom py-16 sm:py-20">
        <AiaSectionHeading
          kicker={kicker}
          index={index}
          title={title}
          description={description}
          href={headingHref}
          hrefLabel={headingHrefLabel}
          headingId="tong-class-people-band-title"
        />

        {users === undefined ? (
          <p role="status" className="aia-text-muted mt-10 text-sm leading-7">
            正在载入公开人员…
          </p>
        ) : members.length === 0 ? (
          <p className="aia-text-muted mt-10 text-sm leading-7">
            公开人员信息整理中，稍后将在此呈现。
          </p>
        ) : (
          <ul className="mt-10 grid gap-x-10 border-t aia-border-rule sm:grid-cols-2 lg:grid-cols-4">
            {members.map((member) => {
              const meta = memberMeta(member)
              return (
                <li key={member.username} className="border-b aia-border-rule">
                  <Link
                    href={`/tong-class/members/${member.username}`}
                    className="aia-focus group block py-5"
                  >
                    <span className="aia-serif block text-lg font-semibold leading-snug text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                      {memberDisplayName(member)}
                    </span>
                    {member.englishName && member.chineseName ? (
                      <span className="aia-mono mt-1 block text-xs text-[hsl(var(--aia-muted))]">
                        {member.englishName}
                      </span>
                    ) : null}
                    {meta ? (
                      <span className="aia-text-muted mt-2 block text-xs leading-5">{meta}</span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
