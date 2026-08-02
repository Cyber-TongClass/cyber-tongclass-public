import { AiaOAApprovalTaskDetailClient } from "@/components/oa/aia-oa-approval-task-detail-client"

export default async function AiaOAApprovalTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  return <AiaOAApprovalTaskDetailClient taskId={taskId} />
}
