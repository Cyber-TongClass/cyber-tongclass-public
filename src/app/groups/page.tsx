import { LiveResearchGroupDirectory } from "@/components/institute/live-research-group-directory"

export default function GroupsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Research groups</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">研究团队</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            浏览研究院经批准公开的研究组与协作单元。真实公开目录优先展示；尚未发布时会以明确标注的演示数据说明页面结构。
          </p>
        </div>
      </section>

      <LiveResearchGroupDirectory />
    </div>
  )
}
