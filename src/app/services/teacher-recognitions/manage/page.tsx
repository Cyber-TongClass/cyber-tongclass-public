import type { Metadata } from "next"
import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { TeacherRecognitionManagement } from "@/components/teacher-recognition/teacher-recognition-management"
export const metadata: Metadata = { title: "教师奖励统计", robots: { index: false, follow: false } }
export default function Page() { return <main><AiaPageHero kicker="Recognition · Management" title="教师奖励统计" lede="按年度、教师、类别与状态汇总教师荣誉和专业服务。" /><div className="container-custom max-w-6xl py-10"><TeacherRecognitionManagement /></div></main> }
