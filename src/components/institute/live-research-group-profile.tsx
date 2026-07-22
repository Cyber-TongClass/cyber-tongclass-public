"use client"

import Link from "next/link"

import {
  demoDirectoryUpdates,
  demoPeople,
  demoResearchOutputs,
  getDemoPerson,
  getDemoResearchGroup,
} from "@/components/institute/demo-directory-data"
import {
  toDirectoryPerson,
  toDirectoryResearchGroup,
  toDirectoryResearchGroupMember,
} from "@/components/institute/live-directory-view-model"
import { ResearchGroupProfile } from "@/components/institute/research-group-profile"
import { usePublicResearchGroup } from "@/lib/api"
import type { PublicResearchGroup } from "@/types/institute"

type LiveResearchGroupProfileProps = {
  slug: string
}

function PublicResearchGroupNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="container-custom max-w-5xl rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">未找到公开团队资料</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">该团队可能尚未公开、已调整，或链接地址有误。</p>
        <Link href="/groups" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
          返回研究团队目录
        </Link>
      </div>
    </div>
  )
}

export function LiveResearchGroupProfile({ slug }: LiveResearchGroupProfileProps) {
  const group = usePublicResearchGroup(slug) as PublicResearchGroup | null | undefined

  if (group === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 sm:py-14" aria-live="polite">
        <div className="container-custom max-w-5xl">
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm" role="status">
            正在加载公开团队资料…
          </p>
        </div>
      </div>
    )
  }

  if (group === null) {
    const demoGroup = getDemoResearchGroup(slug)
    if (!demoGroup) return <PublicResearchGroupNotFound />

    return (
      <ResearchGroupProfile
        group={demoGroup}
        leader={getDemoPerson(demoGroup.leaderSlug)}
        members={demoPeople}
        outputs={demoResearchOutputs}
        updates={demoDirectoryUpdates}
      />
    )
  }

  return (
    <ResearchGroupProfile
      group={toDirectoryResearchGroup(group)}
      leader={group.leader ? toDirectoryPerson(group.leader) : undefined}
      memberRoles={(group.members ?? []).map(toDirectoryResearchGroupMember)}
    />
  )
}
