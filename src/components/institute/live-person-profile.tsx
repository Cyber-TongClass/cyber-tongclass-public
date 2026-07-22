"use client"

import Link from "next/link"

import {
  demoDirectoryUpdates,
  demoPeople,
  demoResearchGroups,
  demoResearchOutputs,
  getDemoPerson,
} from "@/components/institute/demo-directory-data"
import { toDirectoryPerson, toDirectoryResearchGroup } from "@/components/institute/live-directory-view-model"
import { PersonProfile } from "@/components/institute/person-profile"
import { usePublicInstitutePerson, usePublicResearchGroups } from "@/lib/api"
import type { PublicInstitutePerson, PublicResearchGroup } from "@/types/institute"

type LivePersonProfileProps = {
  slug: string
}

function PublicPersonNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="container-custom max-w-5xl rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">未找到公开人员资料</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">该资料可能尚未公开、已调整，或链接地址有误。</p>
        <Link href="/people" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
          返回人员目录
        </Link>
      </div>
    </div>
  )
}

export function LivePersonProfile({ slug }: LivePersonProfileProps) {
  const person = usePublicInstitutePerson(slug) as PublicInstitutePerson | null | undefined
  const groups = usePublicResearchGroups({ limit: 100 }) as PublicResearchGroup[] | undefined

  if (person === undefined || groups === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 sm:py-14" aria-live="polite">
        <div className="container-custom max-w-5xl">
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm" role="status">
            正在加载公开人员资料…
          </p>
        </div>
      </div>
    )
  }

  if (person === null) {
    const demoPerson = getDemoPerson(slug)
    if (!demoPerson) return <PublicPersonNotFound />

    return (
      <PersonProfile
        person={demoPerson}
        groups={demoResearchGroups}
        outputs={demoResearchOutputs}
        updates={demoDirectoryUpdates}
      />
    )
  }

  const directoryPerson = toDirectoryPerson(person)
  const relatedGroups = groups
    .filter((group) => group.leader?.slug === person.slug)
    .map(toDirectoryResearchGroup)

  return <PersonProfile person={directoryPerson} groups={relatedGroups} />
}
