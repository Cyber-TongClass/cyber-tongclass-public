import { CoffeeTalkDetailClient } from "@/components/coffee-talk/coffee-talk-detail-client"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"

export default function CoffeeTalkApplicantDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="container-custom max-w-4xl py-10 sm:py-12">
      <SafeReturnLink fallback="/services/coffee-talk/my" className="aia-link text-sm">← 返回申请列表</SafeReturnLink>
      <div className="mt-8">
        <CoffeeTalkDetailClient applicationId={params.id} mode="applicant" />
      </div>
    </main>
  )
}
