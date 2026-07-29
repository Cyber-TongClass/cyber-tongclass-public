import Link from "next/link"
import { ArrowUpRight, GraduationCap, UserRound } from "lucide-react"

import type { PublicDirectoryPerson } from "@/components/institute/demo-directory-data"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"

type PeopleDirectoryProps = {
  people: readonly PublicDirectoryPerson[]
  heading?: string
  description?: string
  emptyMessage?: string
}

function kindLabel(kind: PublicDirectoryPerson["kind"]) {
  return kind === "teacher" ? "教师" : "研究生"
}

function PersonCard({ person }: { person: PublicDirectoryPerson }) {
  const Icon = person.kind === "teacher" ? UserRound : GraduationCap

  return (
    <li>
      <Link
        href={`/people/${person.slug}`}
        className="aia-focus group flex h-full flex-col border aia-border-rule p-6 transition-colors hover:border-[hsl(var(--aia-red))]"
      >
        <div className="flex items-start justify-between gap-4">
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photoUrl} alt="" className="h-14 w-14 rounded-full border aia-border-rule object-cover" />
          ) : (
            <Icon
              className="h-5 w-5 text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
              aria-hidden="true"
            />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <span className="aia-mono aia-bg-tag px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[hsl(var(--aia-ink))]">
              {kindLabel(person.kind)}
            </span>
            {person.isDemo ? (
              <span className="aia-mono border border-dashed aia-border-rule px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[hsl(var(--aia-muted))]">
                演示数据
              </span>
            ) : null}
          </div>
        </div>
        <h3 className="aia-serif mt-5 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
          {person.nameZh}
        </h3>
        <p className="aia-mono mt-1 text-xs text-[hsl(var(--aia-muted))]">{person.nameEn}</p>
        <p className="mt-4 text-sm font-semibold text-[hsl(var(--aia-red))]">{person.title}</p>
        <p className="aia-text-muted mt-3 flex-1 text-sm leading-6">{person.bio}</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="研究方向">
          {person.researchAreas.map((area) => (
            <span
              key={area}
              className="aia-mono aia-bg-tag px-2 py-1 text-[0.7rem] font-medium tracking-[0.08em] text-[hsl(var(--aia-ink))]"
            >
              {area}
            </span>
          ))}
        </div>
        <span className="aia-kicker mt-6 inline-flex items-center gap-1.5">
          查看公开档案
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

export function PeopleDirectory({
  people,
  heading = "人员目录",
  description = "仅展示经批准公开的人员资料。",
  emptyMessage = "暂未发布可公开展示的人员档案。",
}: PeopleDirectoryProps) {
  const visiblePeople = people.filter((person) => person.visibility === "public")
  const teachers = visiblePeople.filter((person) => person.kind === "teacher")
  const graduates = visiblePeople.filter((person) => person.kind === "graduate")

  return (
    <section aria-labelledby="people-directory-title" className="border-b aia-border-rule py-16 sm:py-20">
      <div className="container-custom">
        <AiaSectionHeading
          kicker="研究院人员 · Directory"
          title={heading}
          description={description}
          headingId="people-directory-title"
        />

        {visiblePeople.length === 0 ? (
          <p className="aia-text-muted mt-10 border border-dashed aia-border-rule p-6 text-sm leading-6">
            {emptyMessage}
          </p>
        ) : (
          <div className="mt-10 space-y-12">
            {teachers.length > 0 ? (
              <div>
                <h3 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">教师</h3>
                <hr aria-hidden="true" className="aia-hr mt-4" />
                <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="教师公开档案">
                  {teachers.map((person) => <PersonCard key={person.slug} person={person} />)}
                </ul>
              </div>
            ) : null}
            {graduates.length > 0 ? (
              <div>
                <h3 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">研究生</h3>
                <hr aria-hidden="true" className="aia-hr mt-4" />
                <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="研究生公开档案">
                  {graduates.map((person) => <PersonCard key={person.slug} person={person} />)}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
