import type { Metadata } from "next"
import { TeacherRecognitionReviewDetail } from "@/components/teacher-recognition/teacher-recognition-review"
export const metadata: Metadata = { title: "教师奖励审核详情", robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ taskId: string }> }) { const { taskId } = await params; return <main className="aia-scope container-custom max-w-6xl py-10 sm:py-14"><TeacherRecognitionReviewDetail taskId={taskId} /></main> }
