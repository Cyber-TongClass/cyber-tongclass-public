import type { Metadata } from "next"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { LivePeopleDirectory } from "@/components/institute/live-people-directory"
import { TongClassPeopleBand } from "@/components/institute/tong-class-people-band"

export const metadata: Metadata = {
  title: "人员目录",
  description: "浏览北京大学人工智能研究院经批准公开的人员资料与通班成员目录。",
  alternates: { canonical: "/people" },
}

export default function PeoplePage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="人员 · People"
        title="人员"
        lede="浏览研究院经批准公开的人员资料。真实公开目录优先展示；尚未发布时会以明确标注的演示数据说明页面结构。"
      />

      <TongClassPeopleBand
        kicker="通班 · Tong Class"
        title="通班人员"
        description="来自通班的公开成员名录，在此优先呈现。"
        headingHref="/tong-class/members"
        headingHrefLabel="通班成员目录"
        limit={8}
      />

      <LivePeopleDirectory />
    </div>
  )
}
