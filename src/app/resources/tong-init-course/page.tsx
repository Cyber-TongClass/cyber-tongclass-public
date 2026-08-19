import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TongInitCourseResourceList } from "@/components/resources/tong-init-course-resource-list"

export default function TongAiResearchCoursePage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 relative">
          <div
            className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[4rem] md:text-[7rem] lg:text-[9rem] font-extrabold uppercase tracking-[0.12em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none"
            aria-hidden="true"
          >
            ToNG
          </div>
          <Button asChild variant="ghost" className="relative mb-7 -ml-3 text-white/75 hover:bg-white/10 hover:text-white">
            <Link href="/resources">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回学习资源
            </Link>
          </Button>
          <h1 className="relative text-4xl md:text-6xl font-extrabold text-white tracking-tight">
            ToNG 通班人工智能科研先导课
          </h1>
          <p className="relative mt-5 text-lg text-white/70 max-w-2xl">
            你是否对人工智能充满好奇与热忱，却苦于没有基础，不知道该从何处开始上手？你是否想要学习并从事人工智能科研与开发工作，却面对纷繁复杂的工具和入门教程感到眼花缭乱？别担心！ToNG（Tutorials on Necessary Groundwork）通班人工智能科研先导课来帮你！
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <TongInitCourseResourceList />
        </div>
      </section>
    </div>
  )
}
