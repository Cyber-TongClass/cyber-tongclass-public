import { ResearchGroupDirectory } from "@/components/institute/research-group-directory"
import { demoResearchGroups } from "@/components/institute/demo-directory-data"

export default function GroupsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Research groups</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">研究团队</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            浏览研究院经批准公开的研究组与协作单元。首期目录使用明确标注的演示条目，不代表真实组织、人员或招募安排。
          </p>
        </div>
      </section>

      <ResearchGroupDirectory
        groups={demoResearchGroups}
        description="首期页面使用虚构的演示团队资料；真实公开资料将在审核和发布流程完成后接入。"
      />
    </div>
  )
}
