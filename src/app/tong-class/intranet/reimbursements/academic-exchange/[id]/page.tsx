import { redirect } from "next/navigation"

export default async function LegacyAcademicExchangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/services/oa/reimbursements/academic-exchange/${id}`)
}
