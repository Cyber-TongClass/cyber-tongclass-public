"use client"

import { useState } from "react"
import { PeopleDirectory } from "@/components/institute/people-directory"
import { Button } from "@/components/ui/button"
import { toDirectoryPerson } from "@/components/institute/live-directory-view-model"
import { usePublicInstitutePeople } from "@/lib/api"
import type { PublicInstitutePerson } from "@/types/institute"

export function LivePeopleDirectory() {
  const [limit, setLimit] = useState(100)
  const people = usePublicInstitutePeople({ limit }) as PublicInstitutePerson[] | undefined

  if (people === undefined) {
    return (
      <section className="py-16 sm:py-20" aria-live="polite">
        <div className="container-custom">
          <p className="aia-text-muted border border-dashed aia-border-rule p-6 text-sm leading-6" role="status">
            正在加载公开人员目录…
          </p>
        </div>
      </section>
    )
  }

  if (people.length === 0) {
    return (
      <PeopleDirectory
        people={[]}
        description="当前尚未发布公开人员资料。"
      />
    )
  }

  return (
    <>
      <PeopleDirectory
        people={people.map(toDirectoryPerson)}
        description="仅展示经研究院审核并公开发布的人员资料。"
      />
      {people.length >= limit && limit < 500 ? (
        <div className="container-custom -mt-10 pb-16 text-center">
          <Button type="button" variant="outline" onClick={() => setLimit((current) => Math.min(current + 100, 500))}>加载更多人员</Button>
        </div>
      ) : null}
    </>
  )
}
