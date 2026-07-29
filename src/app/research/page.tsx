"use client"

import * as React from "react"

import { AudienceTabs } from "@/components/content/audience-tabs"
import { PublicationArchive } from "@/components/content/publication-archive"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { usePublicInstituteResearch } from "@/lib/api"
import { buildAudienceCollections, type AudienceFilter } from "@/lib/content-audience"
import type { PublicInstituteResearch } from "@/types/institute"
import { withReturnTo } from "@/lib/safe-local-path"
import { Button } from "@/components/ui/button"

export default function ResearchPage() {
  const [selectedAudience, setSelectedAudience] = React.useState<AudienceFilter>("all")
  const [limit, setLimit] = React.useState(100)
  const research = usePublicInstituteResearch({ limit }) as PublicInstituteResearch[] | undefined
  const collections = React.useMemo(() => buildAudienceCollections(research ?? []), [research])
  const visibleResearch = research === undefined ? undefined : collections[selectedAudience]

  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="研究 · Research"
        title="研究"
        lede="展示经发布流程确认的研究成果，帮助访问者从公开信息开始了解研究院工作。"
      />

      <PublicationArchive
        items={visibleResearch}
        detailHref={(item) => withReturnTo(`/tong-class/publications/${item.id}`, "/research")}
        audienceControl={
          <AudienceTabs value={selectedAudience} onChange={setSelectedAudience} counts={collections.counts} />
        }
      />
      {research && research.length >= limit && limit < 500 ? (
        <div className="container-custom pb-16 text-center">
          <Button type="button" variant="outline" onClick={() => setLimit((current) => Math.min(current + 100, 500))}>加载更多研究成果</Button>
        </div>
      ) : null}
    </div>
  )
}
