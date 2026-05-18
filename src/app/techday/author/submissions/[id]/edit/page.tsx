"use client"

import { useParams, useRouter } from "next/navigation"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDayFileUpload } from "@/components/techday/techday-file-controls"
import { TechDaySubmissionForm } from "@/components/techday/techday-submission-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFinalizeTechDayPoster, useTechDayActorArgs, useTechDaySubmissionById, useUpdateTechDaySubmission } from "@/lib/api"

export default function EditTechDaySubmissionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const actorArgs = useTechDayActorArgs()
  const submission = useTechDaySubmissionById(params.id, actorArgs)
  const update = useUpdateTechDaySubmission()
  const finalizePoster = useFinalizeTechDayPoster()

  return (
    <TechDayShell title="编辑作品">
      <TechDayAccessGuard role="author">
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>作品信息</CardTitle></CardHeader>
            <CardContent>
              {submission ? (
                <TechDaySubmissionForm
                  submitLabel="保存并重新提交审核"
                  initialValue={{
                    title: submission.title,
                    abstract: submission.abstract,
                    contact: submission.contact,
                    venue: submission.venue,
                    authors: submission.authors || "",
                    track: submission.track,
                    publicationStatus: submission.publicationStatus,
                    archiveConsent: submission.archiveConsent,
                    directionId: submission.directionId,
                    paperUrl: submission.paperUrl || "",
                    year: String(submission.year || new Date().getFullYear()),
                  }}
                  onSubmit={async (value) => {
                    await update({
                      ...actorArgs,
                      id: params.id as any,
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
              ) : <p className="text-sm text-slate-600">Loading...</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Poster PDF</CardTitle></CardHeader>
            <CardContent>
              <TechDayFileUpload
                actorArgs={actorArgs}
                accept="application/pdf"
                onUploaded={(file) => finalizePoster({ ...actorArgs, submissionId: params.id as any, ...file } as any)}
              />
            </CardContent>
          </Card>
        </div>
      </TechDayAccessGuard>
    </TechDayShell>
  )
}
