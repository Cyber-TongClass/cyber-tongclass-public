import type { Metadata } from "next"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { LivePeopleDirectory } from "@/components/institute/live-people-directory"
import { LivePeopleGroups } from "@/components/institute/live-people-groups"

export const metadata: Metadata = {
  title: "人员目录",
  description: "浏览北京大学人工智能研究院经批准公开的人员资料、课题组与通班成员目录。",
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

      <section aria-labelledby="tong-class-people-entry-title" className="border-b aia-border-rule">
        <div className="container-custom py-16 sm:py-20">
          <AiaSectionHeading
            kicker="通班 · Tong Class"
            title="通班人员"
            description="来自通班的公开成员名录，在此优先呈现。"
            href="/tong-class/members"
            hrefLabel="通班成员目录"
            headingId="tong-class-people-entry-title"
          />
        </div>
      </section>

      <LivePeopleGroups />
      <LivePeopleDirectory />
    </div>
  )
}
