import { AiaOAFormSubmissionClient } from "@/components/oa/aia-oa-form-submission-client"
import { AiaOAServiceBackLink } from "@/components/oa/aia-oa-shared"

export default function AiaOAFormPage() {
  return (
    <div className="container-custom max-w-4xl py-10 sm:py-12">
      <AiaOAServiceBackLink />
      <div className="mt-8"><AiaOAFormSubmissionClient /></div>
    </div>
  )
}
