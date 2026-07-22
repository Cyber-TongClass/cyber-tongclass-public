import { notFound } from "next/navigation"
import { ResearchGroupProfile } from "@/components/institute/research-group-profile"
import {
  demoDirectoryUpdates,
  demoPeople,
  demoResearchGroups,
  demoResearchOutputs,
  getDemoPerson,
  getDemoResearchGroup,
} from "@/components/institute/demo-directory-data"

export function generateStaticParams() {
  return demoResearchGroups
    .filter((group) => group.visibility === "public")
    .map((group) => ({ slug: group.slug }))
}

export default async function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const group = getDemoResearchGroup(slug)

  if (!group || group.visibility !== "public") {
    notFound()
  }

  return (
    <ResearchGroupProfile
      group={group}
      leader={getDemoPerson(group.leaderSlug)}
      members={demoPeople}
      outputs={demoResearchOutputs}
      updates={demoDirectoryUpdates}
    />
  )
}
