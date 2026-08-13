import type { Metadata } from "next"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { TeacherRecognitionReviewQueue } from "@/components/teacher-recognition/teacher-recognition-review"
export const metadata: Metadata = { title: "教师奖励审核", robots: { index: false, follow: false } }
export default function Page() { return <main><AiaPageHero kicker="Recognition · Review" title="教师奖励审核" lede="查看分配给当前账户的申报，核验必要证明材料并给出处理意见。" /><div className="container-custom max-w-5xl py-10"><TeacherRecognitionReviewQueue /></div></main> }
