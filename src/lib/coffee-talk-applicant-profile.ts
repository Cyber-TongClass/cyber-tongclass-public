import type { User } from "@/types"

export type CoffeeTalkApplicantProfileView = {
  applicantName: string
  email: string
  affiliation: "北大通班" | "清华通班"
  identity: "本科生" | "研究生" | "教师" | "其他"
}

const identityLabels = {
  undergrad: "本科生",
  graduate: "研究生",
  teacher: "教师",
  other: "其他",
} as const

/** Returns the immutable Coffee Talk display profile for a signed-in account. */
export function deriveCoffeeTalkApplicantProfile(
  user: Pick<User, "chineseName" | "englishName" | "email" | "organization" | "identityType">,
): CoffeeTalkApplicantProfileView | null {
  const applicantName = user.chineseName?.trim() || user.englishName.trim()
  const email = user.email.trim()
  const identity = user.identityType ? identityLabels[user.identityType] : undefined

  if (!applicantName || !email || !identity || (user.organization !== "pku" && user.organization !== "thu")) return null

  return {
    applicantName,
    email,
    affiliation: user.organization === "pku" ? "北大通班" : "清华通班",
    identity,
  }
}
