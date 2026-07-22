"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

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
import type { PublicInstitutePerson } from "@/types/institute"

function toTeacherOptions(people: readonly PublicInstitutePerson[]): CoffeeTalkTeacherOption[] {
  return people
    .filter((person) => person.kind === "teacher" && person.coffeeTalkOpen === true)
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
  const sessionToken = useTongClassSessionToken()
  const currentUser = useCurrentUser()
  const people = usePublicInstitutePeople({ kind: "teacher", limit: 100 })
  const submitApplication = useSubmitCoffeeTalkApplication()
  const teachers = toTeacherOptions((people ?? []) as PublicInstitutePerson[])

  async function handleSubmit(draft: CoffeeTalkApplicationDraft) {
    await submitApplication({
      teacherSlug: draft.teacherPreference,
      topic: draft.topic,
      availability: draft.availability,
      ...(draft.notes.trim() ? { notes: draft.notes } : {}),
    })
    router.push("/services/coffee-talk/my")
  }

  if (!sessionToken) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        请先登录后再提交 Coffee Talk 申请。
        <Link className="ml-2 font-medium text-primary underline-offset-4 hover:underline" href="/login?next=%2Fservices%2Fcoffee-talk%2Fapply">
          前往登录
        </Link>
      </div>
    )
  }

  if (currentUser === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载个人资料…</p>
  }

  const applicantProfile = currentUser ? deriveCoffeeTalkApplicantProfile(currentUser) : null
  if (!applicantProfile) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950" role="alert">个人资料不完整，暂时无法提交 Coffee Talk 申请。</p>
  }

  if (people === undefined) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600" role="status">正在加载可选教师…</p>
  }

  if (teachers.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950" role="status">
        当前没有开放 Coffee Talk 的教师。请稍后再试。
      </p>
    )
  }

  return <CoffeeTalkApplicationForm applicantProfile={applicantProfile} teachers={teachers} backendAvailable onSubmit={handleSubmit} />
}
