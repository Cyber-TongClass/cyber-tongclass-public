import Link from "next/link"
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { tongAiResearchCoursePdfs } from "@/lib/resources/tong-ai-research-course"

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
          {tongAiResearchCoursePdfs.length > 0 ? (
            <div className="space-y-3">
              {tongAiResearchCoursePdfs.map((pdf) => (
                <a
                  key={pdf.href}
                  href={pdf.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{pdf.title}</h2>
                    {pdf.description && <p className="mt-1 text-sm text-slate-600">{pdf.description}</p>}
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-primary transition-colors" aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-white px-6 py-16 text-center shadow-sm">
              <FileText className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-xl font-extrabold text-slate-900">课程资料即将上线</h2>
              <p className="mt-3 text-slate-600">课件上传后会在这里展示，敬请期待。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
