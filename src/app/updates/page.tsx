"use client"

import * as React from "react"

import { AudienceTabs } from "@/components/content/audience-tabs"
import { NewsTimeline, type NewsTimelineItem } from "@/components/content/news-timeline"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { usePublicInstituteUpdates } from "@/lib/api"
import { buildAudienceCollections, type AudienceFilter } from "@/lib/content-audience"
import type { PublicInstituteUpdate } from "@/types/institute"
import { withReturnTo } from "@/lib/safe-local-path"
import { Button } from "@/components/ui/button"

export default function UpdatesPage() {
  const [limit, setLimit] = React.useState(100)
  const updates = usePublicInstituteUpdates({ limit }) as PublicInstituteUpdate[] | undefined
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
        detailHref={(item) => withReturnTo(`/tong-class/news/${item.id}`, "/updates")}
        audienceControl={
          <AudienceTabs value={selectedAudience} onChange={setSelectedAudience} counts={collections.counts} />
        }
      />
      {updates && updates.length >= limit && limit < 500 ? (
        <div className="container-custom pb-16 text-center">
          <Button type="button" variant="outline" onClick={() => setLimit((current) => Math.min(current + 100, 500))}>加载更多动态</Button>
        </div>
      ) : null}
    </div>
  )
}
