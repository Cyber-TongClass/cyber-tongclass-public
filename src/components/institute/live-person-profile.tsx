"use client"

import {
  toDirectoryResearchOutput,
  toDirectoryUpdate,
  toDirectoryPerson,
  toDirectoryResearchGroup,
} from "@/components/institute/live-directory-view-model"
import { PersonProfile } from "@/components/institute/person-profile"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"
import { usePublicInstitutePerson, usePublicInstituteResearch, usePublicInstituteUpdates, usePublicResearchGroups } from "@/lib/api"
import type { PublicInstitutePerson, PublicInstituteResearch, PublicInstituteUpdate, PublicResearchGroup } from "@/types/institute"

type LivePersonProfileProps = {
  slug: string
}

function PublicPersonNotFound() {
  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container-custom max-w-5xl border aia-border-rule p-7 sm:p-9">
        <h1 className="aia-serif text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">未找到公开人员资料</h1>
        <p className="aia-text-muted mt-3 text-sm leading-6">该资料可能尚未公开、已调整，或链接地址有误。</p>
        <SafeReturnLink fallback="/people" className="aia-link aia-focus mt-6 inline-flex min-h-11 items-center text-sm font-semibold">
          返回人员目录
        </SafeReturnLink>
      </div>
    </div>
  )
}

export function LivePersonProfile({ slug }: LivePersonProfileProps) {
  const person = usePublicInstitutePerson(slug) as PublicInstitutePerson | null | undefined
  const groups = usePublicResearchGroups({ limit: 100 }) as PublicResearchGroup[] | undefined
  const research = usePublicInstituteResearch({ personSlug: slug, limit: 100 }) as PublicInstituteResearch[] | undefined
  const updates = usePublicInstituteUpdates({ personSlug: slug, limit: 100 }) as PublicInstituteUpdate[] | undefined

  if (person === undefined || groups === undefined || research === undefined || updates === undefined) {
    return (
      <div className="min-h-screen py-12 sm:py-16" aria-live="polite">
        <div className="container-custom max-w-5xl">
          <p className="aia-text-muted border border-dashed aia-border-rule p-6 text-sm leading-6" role="status">
            正在加载公开人员资料…
          </p>
        </div>
      </div>
    )
  }

  if (person === null) {
    return <PublicPersonNotFound />
  }

  const directoryPerson = toDirectoryPerson(person)
  const relatedGroupSlugs = new Set(
    (person.researchGroupMemberships ?? []).map((membership) => membership.researchGroup.slug),
  )
  const relatedPublicGroups = groups
    .filter((group) => relatedGroupSlugs.has(group.slug))
  const relatedGroups = relatedPublicGroups
    .map(toDirectoryResearchGroup)
  return (
    <PersonProfile
      person={directoryPerson}
      groups={relatedGroups}
      outputs={research.map((item) => toDirectoryResearchOutput(item, `/people/${slug}`))}
      updates={updates.map((item) => toDirectoryUpdate(item, `/people/${slug}`))}
    />
  )
}
