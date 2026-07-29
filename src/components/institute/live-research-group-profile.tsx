"use client"

import {
  toDirectoryResearchOutput,
  toDirectoryUpdate,
  toDirectoryPerson,
  toDirectoryResearchGroup,
  toDirectoryResearchGroupMember,
} from "@/components/institute/live-directory-view-model"
import { ResearchGroupProfile } from "@/components/institute/research-group-profile"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"
import { usePublicInstituteResearch, usePublicInstituteUpdates, usePublicResearchGroup } from "@/lib/api"
import type { PublicInstituteResearch, PublicInstituteUpdate, PublicResearchGroup } from "@/types/institute"

type LiveResearchGroupProfileProps = {
  slug: string
}

function PublicResearchGroupNotFound() {
  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container-custom max-w-5xl border aia-border-rule p-7 sm:p-9">
        <h1 className="aia-serif text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">未找到公开团队资料</h1>
        <p className="aia-text-muted mt-3 text-sm leading-6">该团队可能尚未公开、已调整，或链接地址有误。</p>
        <SafeReturnLink fallback="/groups" className="aia-link aia-focus mt-6 inline-flex min-h-11 items-center text-sm font-semibold">
          返回研究团队目录
        </SafeReturnLink>
      </div>
    </div>
  )
}

export function LiveResearchGroupProfile({ slug }: LiveResearchGroupProfileProps) {
  const group = usePublicResearchGroup(slug) as PublicResearchGroup | null | undefined
  const research = usePublicInstituteResearch({ groupSlug: slug, limit: 100 }) as PublicInstituteResearch[] | undefined
  const updates = usePublicInstituteUpdates({ groupSlug: slug, limit: 100 }) as PublicInstituteUpdate[] | undefined

  if (group === undefined || research === undefined || updates === undefined) {
    return (
      <div className="min-h-screen py-12 sm:py-16" aria-live="polite">
        <div className="container-custom max-w-5xl">
          <p className="aia-text-muted border border-dashed aia-border-rule p-6 text-sm leading-6" role="status">
            正在加载公开团队资料…
          </p>
        </div>
      </div>
    )
  }

  if (group === null) {
    return <PublicResearchGroupNotFound />
  }

  return (
    <ResearchGroupProfile
      group={toDirectoryResearchGroup(group)}
      leader={group.leader ? toDirectoryPerson(group.leader) : undefined}
      memberRoles={(group.members ?? []).map(toDirectoryResearchGroupMember)}
      outputs={research.map((item) => toDirectoryResearchOutput(item, `/groups/${slug}`))}
      updates={updates.map((item) => toDirectoryUpdate(item, `/groups/${slug}`))}
    />
  )
}
