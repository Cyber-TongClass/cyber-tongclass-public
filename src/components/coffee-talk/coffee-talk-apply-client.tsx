"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import {
  CoffeeTalkApplicationForm,
  type CoffeeTalkApplicationDraft,
  type CoffeeTalkTeacherOption,
} from "@/components/coffee-talk/coffee-talk-application-form"
import {
  type CoffeeTalkApplicationInput,
  useCurrentUser,
  usePublicInstitutePeople,
  useSubmitCoffeeTalkApplication,
  useTongClassSessionToken,
} from "@/lib/api"
import { deriveCoffeeTalkApplicantProfile } from "@/lib/coffee-talk-applicant-profile"
import { safeLocalPath } from "@/lib/safe-local-path"
import type { PublicInstitutePerson } from "@/types/institute"

function toTeacherOptions(people: readonly PublicInstitutePerson[]): CoffeeTalkTeacherOption[] {
  return people
    .filter((person) => person.kind === "teacher" && person.coffeeTalkOpen === true && person.isDemo !== true)
    .map((person) => ({
      id: person.slug,
      name: person.nameZh || person.nameEn,
      title: person.titleZh || person.titleEn,
      isDemo: person.isDemo,
    }))
}

/** Client adapter: presentation components receive data and callbacks only. */
export function CoffeeTalkApplyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionToken = useTongClassSessionToken()
  const currentUser = useCurrentUser()
  const people = usePublicInstitutePeople({ kind: "teacher", limit: 100 })
  const submitApplication = useSubmitCoffeeTalkApplication()
  const teachers = toTeacherOptions((people ?? []) as PublicInstitutePerson[])
  const requestedTeacher = searchParams.get("teacher")
  const initialTeacherSlug = teachers.some((teacher) => teacher.id === requestedTeacher)
    ? requestedTeacher || undefined
    : undefined
  const returnTo = safeLocalPath(searchParams.get("returnTo"), "/services/coffee-talk/my")

  async function handleSubmit(draft: CoffeeTalkApplicationDraft) {
    await submitApplication({
      teacherSlug: draft.teacherPreference,
      topic: draft.topic,
      purpose: draft.purpose,
      researchBackground: draft.researchBackground,
      expectedOutcome: draft.expectedOutcome,
      preferredFormat: draft.preferredFormat,
      availability: draft.availability,
      consentToShareProfile: draft.consentToShareProfile,
      idempotencyKey: draft.idempotencyKey,
      ...(draft.notes.trim() ? { notes: draft.notes } : {}),
    })
    router.push(returnTo)
  }

  if (!sessionToken) {
    return (
      <div className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6">
        请先登录后再提交 Coffee Talk 申请。
        <Link className="aia-link ml-2" href="/login?next=%2Fservices%2Fcoffee-talk%2Fapply">
          前往登录
        </Link>
      </div>
    )
  }

  if (currentUser === undefined) {
    return <p className="aia-text-muted py-6 text-sm" role="status">正在加载个人资料…</p>
  }

  if (
    !currentUser
    || currentUser.isEmailVerified !== true
    || (currentUser.identityType !== "undergrad" && currentUser.identityType !== "graduate")
  ) {
    return (
      <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6" role="alert">
        Coffee Talk 申请仅面向已验证邮箱的本科生和研究生账户。
      </p>
    )
  }

  const applicantProfile = currentUser ? deriveCoffeeTalkApplicantProfile(currentUser) : null
  if (!applicantProfile) {
    return <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6" role="alert">个人资料不完整，暂时无法提交 Coffee Talk 申请。</p>
  }

  if (people === undefined) {
    return <p className="aia-text-muted py-6 text-sm" role="status">正在加载可选教师…</p>
  }

  if (teachers.length === 0) {
    return (
      <p className="border border-dashed aia-border-rule px-4 py-3 text-sm leading-6" role="status">
        当前没有开放 Coffee Talk 的教师。请稍后再试。
      </p>
    )
  }

  return <CoffeeTalkApplicationForm applicantProfile={applicantProfile} teachers={teachers} initialTeacherSlug={initialTeacherSlug} backendAvailable onSubmit={handleSubmit} />
}
