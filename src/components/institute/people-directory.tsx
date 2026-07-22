import Link from "next/link"
import { ArrowRight, GraduationCap, UserRound } from "lucide-react"
import type { PublicDirectoryPerson } from "@/components/institute/demo-directory-data"

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
        className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{kindLabel(person.kind)}</span>
            {person.isDemo ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">演示数据</span> : null}
          </div>
        </div>
        <h3 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">{person.nameZh}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{person.nameEn}</p>
        <p className="mt-4 text-sm font-semibold text-primary">{person.title}</p>
        <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{person.bio}</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="研究方向">
          {person.researchAreas.map((area) => (
            <span key={area} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-primary">
              {area}
            </span>
          ))}
        </div>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          查看公开档案
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
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
    <section aria-labelledby="people-directory-title" className="bg-white py-16 sm:py-20">
      <div className="container-custom">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">People</p>
          <h2 id="people-directory-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
        </div>

        {visiblePeople.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">{emptyMessage}</p>
        ) : (
          <div className="mt-10 space-y-12">
            {teachers.length > 0 ? (
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900">教师</h3>
                <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="教师公开档案">
                  {teachers.map((person) => <PersonCard key={person.slug} person={person} />)}
                </ul>
              </div>
            ) : null}
            {graduates.length > 0 ? (
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900">研究生</h3>
                <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="研究生公开档案">
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
