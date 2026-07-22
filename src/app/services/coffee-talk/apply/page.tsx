import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import {
  CoffeeTalkApplicationForm,
  type CoffeeTalkTeacherOption,
} from "@/components/coffee-talk/coffee-talk-application-form"

const demoTeachers: readonly CoffeeTalkTeacherOption[] = [
  { id: "demo-teacher-li", name: "李明", title: "教授", isDemo: true },
  { id: "demo-teacher-zhang", name: "张岚", title: "副教授", isDemo: true },
]

export default function CoffeeTalkApplyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="container-custom max-w-3xl">
        <Link
          href="/services/coffee-talk"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回 Coffee Talk
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="coffee-talk-apply-heading">
          <p className="text-sm font-semibold text-primary">Coffee Talk</p>
          <h1 id="coffee-talk-apply-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">填写申请意向</h1>
          <p className="mt-3 leading-7 text-slate-600">请完整填写基本信息与希望交流的主题。教师选项均标注为演示数据。</p>
          <div className="mt-7">
            <CoffeeTalkApplicationForm teachers={demoTeachers} backendAvailable={false} />
          </div>
        </section>
      </div>
    </main>
  )
}
