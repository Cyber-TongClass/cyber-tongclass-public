"use client"

import { demoResearchGroups } from "@/components/institute/demo-directory-data"
import { toDirectoryResearchGroup } from "@/components/institute/live-directory-view-model"
import { ResearchGroupDirectory } from "@/components/institute/research-group-directory"
import { usePublicResearchGroups } from "@/lib/api"
import type { PublicResearchGroup } from "@/types/institute"

export function LiveResearchGroupDirectory() {
  const groups = usePublicResearchGroups({ limit: 100 }) as PublicResearchGroup[] | undefined

  if (groups === undefined) {
    return (
      <section className="bg-white py-16 sm:py-20" aria-live="polite">
        <div className="container-custom">
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-600" role="status">
            正在加载公开研究团队目录…
          </p>
        </div>
      </section>
    )
  }

  if (groups.length === 0) {
    return (
      <ResearchGroupDirectory
        groups={demoResearchGroups}
        description="当前尚未发布真实公开团队资料；以下为明确标注的演示数据，仅用于展示目录结构。"
      />
    )
  }

  return (
    <ResearchGroupDirectory
      groups={groups.map(toDirectoryResearchGroup)}
      description="仅展示经研究院审核并公开发布的研究团队资料。"
    />
  )
}
