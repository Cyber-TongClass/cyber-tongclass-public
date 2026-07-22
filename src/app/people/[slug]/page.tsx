import { notFound } from "next/navigation"
import { PersonProfile } from "@/components/institute/person-profile"
import {
  demoDirectoryUpdates,
  demoPeople,
  demoResearchGroups,
  demoResearchOutputs,
  getDemoPerson,
} from "@/components/institute/demo-directory-data"

export function generateStaticParams() {
  return demoPeople
    .filter((person) => person.visibility === "public")
    .map((person) => ({ slug: person.slug }))
}

export default async function PersonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = getDemoPerson(slug)

  if (!person || person.visibility !== "public") {
    notFound()
  }

  return (
    <PersonProfile
      person={person}
      groups={demoResearchGroups}
      outputs={demoResearchOutputs}
      updates={demoDirectoryUpdates}
    />
  )
}
