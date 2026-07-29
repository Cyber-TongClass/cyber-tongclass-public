import type { Metadata } from "next"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { InstituteDirectoryPreview } from "@/components/institute/institute-directory-preview"

export const metadata: Metadata = {
  title: "研究院概览",
  description: "北京大学人工智能研究院综合服务系统的公开入口，连接研究院信息、人员目录、研究团队、研究成果与公开动态。",
  alternates: { canonical: "/institute" },
}

export default function InstitutePage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="研究院 · Institute"
        title="研究院概览"
        lede="北京大学人工智能研究院综合服务系统的公开入口，连接研究院信息与后续目录功能。"
      />

      <InstituteDirectoryPreview />

      <section aria-labelledby="institute-scope-title" className="border-t aia-border-rule">
        <div className="container-custom py-14 sm:py-16">
          <AiaSectionHeading
            kicker="服务范围 · Scope"
            title="服务范围"
            description="当前页面提供研究院公共入口与服务说明；可公开的人员、团队、研究和更新内容将在确认后逐步汇集。"
            headingId="institute-scope-title"
          />
        </div>
      </section>
    </div>
  )
}
