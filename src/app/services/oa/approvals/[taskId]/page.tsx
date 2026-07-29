import { AiaOAApprovalTaskDetailClient } from "@/components/oa/aia-oa-approval-task-detail-client"

export default function AiaOAApprovalTaskPage({ params }: { params: { taskId: string } }) {
  return <AiaOAApprovalTaskDetailClient taskId={params.taskId} />
}
