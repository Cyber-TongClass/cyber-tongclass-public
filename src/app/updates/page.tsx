"use client"

import * as React from "react"

import { AudienceTabs } from "@/components/content/audience-tabs"
import { NewsTimeline, type NewsTimelineItem } from "@/components/content/news-timeline"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { usePublicInstituteUpdates } from "@/lib/api"
import { buildAudienceCollections, type AudienceFilter } from "@/lib/content-audience"
import type { PublicInstituteUpdate } from "@/types/institute"

export default function UpdatesPage() {
  const updates = usePublicInstituteUpdates({ limit: 100 }) as PublicInstituteUpdate[] | undefined
  const [selectedAudience, setSelectedAudience] = React.useState<AudienceFilter>("all")
  const collections = React.useMemo(() => buildAudienceCollections(updates ?? []), [updates])
  const selectedItems: NewsTimelineItem[] | undefined =
    updates === undefined ? undefined : collections[selectedAudience]

  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="动态 · Updates"
        title="更新与公告"
        lede="研究院的动态、公告和后续服务更新将在此集中呈现。"
      />

      <NewsTimeline
        items={selectedItems}
        detailHref={(item) => `/tong-class/news/${item.id}`}
        audienceControl={
          <AudienceTabs value={selectedAudience} onChange={setSelectedAudience} counts={collections.counts} />
        }
      />
    </div>
  )
}
