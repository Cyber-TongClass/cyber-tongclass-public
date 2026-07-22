"use client"

import { demoPeople } from "@/components/institute/demo-directory-data"
import { PeopleDirectory } from "@/components/institute/people-directory"
import { toDirectoryPerson } from "@/components/institute/live-directory-view-model"
import { usePublicInstitutePeople } from "@/lib/api"
import type { PublicInstitutePerson } from "@/types/institute"

export function LivePeopleDirectory() {
  const people = usePublicInstitutePeople({ limit: 100 }) as PublicInstitutePerson[] | undefined

  if (people === undefined) {
    return (
      <section className="bg-white py-16 sm:py-20" aria-live="polite">
        <div className="container-custom">
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-600" role="status">
            正在加载公开人员目录…
          </p>
        </div>
      </section>
    )
  }

  if (people.length === 0) {
    return (
      <PeopleDirectory
        people={demoPeople}
        description="当前尚未发布真实公开人员资料；以下为明确标注的演示数据，仅用于展示目录结构。"
      />
    )
  }

  return (
    <PeopleDirectory
      people={people.map(toDirectoryPerson)}
      description="仅展示经研究院审核并公开发布的人员资料。"
    />
  )
}
