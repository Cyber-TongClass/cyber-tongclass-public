import type { Metadata } from "next"

import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { TeacherRecognitionWorkspace } from "@/components/teacher-recognition/teacher-recognition-workspace"

export const metadata: Metadata = { title: "教师奖励申报", description: "教师荣誉、奖励与专业服务的申报和审核。", robots: { index: false, follow: false } }

export default function Page() { return <main className="min-h-screen"><AiaPageHero kicker="教师服务 · Recognition" title="教师奖励申报" lede="随时登记荣誉、奖励、学术职务与专业服务；证明材料仅对本人和审核人开放。" /><div className="container-custom max-w-6xl py-10 sm:py-12"><TeacherRecognitionWorkspace /></div></main> }
