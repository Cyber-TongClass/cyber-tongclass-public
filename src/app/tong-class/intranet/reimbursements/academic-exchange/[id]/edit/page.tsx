import { redirect } from "next/navigation"

export default async function LegacyEditAcademicExchangePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/services/oa/reimbursements/academic-exchange/${id}/edit`)
}
