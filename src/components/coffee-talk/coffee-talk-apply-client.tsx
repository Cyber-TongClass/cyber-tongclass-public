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
  usePublicInstitutePeople,
  useSubmitCoffeeTalkApplication,
  useTongClassSessionToken,
} from "@/lib/api"
import type { PublicInstitutePerson } from "@/types/institute"

function isCoffeeTalkIdentity(value: string): value is CoffeeTalkApplicationInput["identity"] {
  return value === "undergraduate" || value === "graduate" || value === "other"
}

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
  const people = usePublicInstitutePeople({ kind: "teacher", limit: 100 })
  const submitApplication = useSubmitCoffeeTalkApplication()
  const teachers = toTeacherOptions((people ?? []) as PublicInstitutePerson[])

  async function handleSubmit(draft: CoffeeTalkApplicationDraft) {
    if (!isCoffeeTalkIdentity(draft.identity)) {
      throw new Error("请选择身份")
    }
    await submitApplication({
      applicantName: draft.applicantName,
      affiliation: draft.affiliation,
      identity: draft.identity,
      email: draft.email,
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

  return <CoffeeTalkApplicationForm teachers={teachers} backendAvailable onSubmit={handleSubmit} />
}
