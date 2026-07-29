import type { Metadata } from "next"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { LiveResearchGroupDirectory } from "@/components/institute/live-research-group-directory"

export const metadata: Metadata = {
  title: "研究团队",
  description: "浏览北京大学人工智能研究院经批准公开的研究组与协作单元。",
  alternates: { canonical: "/groups" },
}

export default function GroupsPage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="团队 · Research Groups"
        title="研究团队"
        lede="浏览研究院经批准公开的研究组与协作单元。真实公开目录优先展示；尚未发布时会以明确标注的演示数据说明页面结构。"
      />

      <LiveResearchGroupDirectory />
    </div>
  )
}
