import { LiveResearchGroupProfile } from "@/components/institute/live-research-group-profile"

export default async function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <LiveResearchGroupProfile slug={slug} />
}
