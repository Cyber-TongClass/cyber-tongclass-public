import { LivePersonProfile } from "@/components/institute/live-person-profile"

export default async function PersonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <LivePersonProfile slug={slug} />
}
