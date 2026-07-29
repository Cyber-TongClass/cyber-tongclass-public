"use client"

import { useState } from "react"
import { toDirectoryResearchGroup } from "@/components/institute/live-directory-view-model"
import { ResearchGroupDirectory } from "@/components/institute/research-group-directory"
import { Button } from "@/components/ui/button"
import { usePublicResearchGroups } from "@/lib/api"
import type { PublicResearchGroup } from "@/types/institute"

export function LiveResearchGroupDirectory() {
  const [limit, setLimit] = useState(100)
  const groups = usePublicResearchGroups({ limit }) as PublicResearchGroup[] | undefined

  if (groups === undefined) {
    return (
      <section className="py-16 sm:py-20" aria-live="polite">
        <div className="container-custom">
          <p className="aia-text-muted border border-dashed aia-border-rule p-6 text-sm leading-6" role="status">
            正在加载公开研究团队目录…
          </p>
        </div>
      </section>
    )
  }

  if (groups.length === 0) {
    return (
      <ResearchGroupDirectory
        groups={[]}
        description="当前尚未发布公开研究团队资料。"
      />
    )
  }

  return (
    <>
      <ResearchGroupDirectory
        groups={groups.map(toDirectoryResearchGroup)}
        description="仅展示经研究院审核并公开发布的研究团队资料。"
      />
      {groups.length >= limit && limit < 500 ? (
        <div className="container-custom -mt-10 pb-16 text-center">
          <Button type="button" variant="outline" onClick={() => setLimit((current) => Math.min(current + 100, 500))}>加载更多团队</Button>
        </div>
      ) : null}
    </>
  )
}
