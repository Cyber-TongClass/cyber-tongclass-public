import { PeopleDirectory } from "@/components/institute/people-directory"
import { demoPeople } from "@/components/institute/demo-directory-data"

export default function PeoplePage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[hsl(211,54%,24%)] py-16 text-white sm:py-20">
        <div className="container-custom max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">People</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">人员</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-sky-50/90 sm:text-lg">
            浏览研究院经批准公开的人员资料。首期目录以明确标注的演示条目展示页面结构，不包含个人联系信息或账号资料。
          </p>
        </div>
      </section>

      <PeopleDirectory
        people={demoPeople}
        description="首期页面使用虚构的演示档案；真实公开资料将在审核和发布流程完成后接入。"
      />
    </div>
  )
}
