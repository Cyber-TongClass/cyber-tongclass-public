"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TechDayShell } from "@/components/techday/techday-shell"
import { TechDayAccessGuard } from "@/components/techday/techday-access-guard"
import { TechDayFileUpload } from "@/components/techday/techday-file-controls"
import { TechDaySubmissionForm } from "@/components/techday/techday-submission-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
          <Button asChild variant="ghost" className="w-fit"><Link href="/techday/author/profile"><ArrowLeft className="mr-2 h-4 w-4" />返回我的投稿</Link></Button>
          {submission && !submission.hasPoster ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              作品信息已保存，但投稿材料尚不完整。请在本页下方上传 Poster PDF；未上传前管理员不能通过审核。
            </p>
          ) : null}
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
