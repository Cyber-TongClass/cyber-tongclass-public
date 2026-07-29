import { LivePersonProfile } from "@/components/institute/live-person-profile"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { alternates: { canonical: `/people/${encodeURIComponent(slug)}` } }
}

export default async function PersonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <LivePersonProfile slug={slug} />
}
