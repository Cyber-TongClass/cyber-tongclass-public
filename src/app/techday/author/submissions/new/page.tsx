"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDaySubmissionForm } from "@/components/techday/techday-submission-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCreateTechDaySubmission, useTechDayActorArgs } from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function NewTechDaySubmissionPage() {
  const router = useRouter()
  const actorArgs = useTechDayActorArgs()
  const create = useCreateTechDaySubmission()

  return (
    <TechDayShell title="上传作品">
      <TechDayAccessGuard role="author" allowInternalAuthorBootstrap>
        <Button asChild variant="ghost"><Link href="/techday/author/profile"><ArrowLeft className="mr-2 h-4 w-4" />返回我的投稿</Link></Button>
        <Card>
          <CardHeader><CardTitle>作品信息</CardTitle></CardHeader>
          <CardContent>
            <TechDaySubmissionForm
              submitLabel="提交审核"
              onSubmit={async (value) => {
                const submissionId = await create({
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
                router.push(`/techday/author/submissions/${submissionId}/edit?poster=required`)
              }}
            />
          </CardContent>
        </Card>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
