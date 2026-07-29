import { LiveResearchGroupProfile } from "@/components/institute/live-research-group-profile"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { alternates: { canonical: `/groups/${encodeURIComponent(slug)}` } }
}

export default async function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <LiveResearchGroupProfile slug={slug} />
}
