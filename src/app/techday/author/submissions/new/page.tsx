"use client"

import { useRouter } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDaySubmissionForm } from "@/components/techday/techday-submission-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCreateTechDaySubmission, useTechDayActorArgs } from "@/lib/api"

export default function NewTechDaySubmissionPage() {
  const router = useRouter()
  const actorArgs = useTechDayActorArgs()
  const create = useCreateTechDaySubmission()

  return (
    <TechDayShell title="上传作品">
      <TechDayAccessGuard role="author" allowInternalAuthorBootstrap>
        <Card>
          <CardHeader><CardTitle>作品信息</CardTitle></CardHeader>
          <CardContent>
            <TechDaySubmissionForm
              submitLabel="提交审核"
              onSubmit={async (value) => {
                await create({
                  ...actorArgs,
                  title: value.title,
                  abstract: value.abstract,
                  contact: value.contact,
                  venue: value.venue,
                  authors: value.authors,
                  track: value.track,
                  publicationStatus: value.publicationStatus,
                  archiveConsent: value.archiveConsent,
                  directionId: value.directionId as any,
                  paperUrl: value.paperUrl || undefined,
                  year: Number(value.year) || undefined,
                })
                router.push("/techday/author/profile")
              }}
            />
          </CardContent>
        </Card>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
