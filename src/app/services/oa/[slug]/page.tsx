import { AiaOAFormSubmissionClient } from "@/components/oa/aia-oa-form-submission-client"
import { AiaOAServiceBackLink } from "@/components/oa/aia-oa-shared"

export default function AiaOAFormPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="container-custom max-w-4xl">
        <AiaOAServiceBackLink />
        <div className="mt-6"><AiaOAFormSubmissionClient /></div>
      </div>
    </main>
  )
}
