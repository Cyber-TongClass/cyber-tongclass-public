export type CoffeeTalkApplicantIdentity = "undergraduate" | "graduate" | "teacher" | "other"

export type CoffeeTalkApplicantProfile = {
  applicantName: string
  affiliation: "北大通班" | "清华通班"
  identity: CoffeeTalkApplicantIdentity
  identityLabel: "本科生" | "研究生" | "教师" | "其他"
  email: string
}

type CoffeeTalkApplicantAccount = {
  chineseName?: string
  englishName: string
  email: string
  organization: "pku" | "thu"
  identityType?: "undergrad" | "graduate" | "teacher" | "other"
}

const identityByType = {
  undergrad: { identity: "undergraduate", identityLabel: "本科生" },
  graduate: { identity: "graduate", identityLabel: "研究生" },
  teacher: { identity: "teacher", identityLabel: "教师" },
  other: { identity: "other", identityLabel: "其他" },
} as const satisfies Record<NonNullable<CoffeeTalkApplicantAccount["identityType"]>, {
  identity: CoffeeTalkApplicantIdentity
  identityLabel: CoffeeTalkApplicantProfile["identityLabel"]
}>

/** Builds the display-only Coffee Talk identity from an authenticated account. */
export function deriveCoffeeTalkApplicantProfile(user: CoffeeTalkApplicantAccount): CoffeeTalkApplicantProfile {
  const applicantName = user.chineseName?.trim() || user.englishName.trim()
  const email = user.email.trim()
  const identity = user.identityType ? identityByType[user.identityType] : undefined

  if (!applicantName || !email || !identity || (user.organization !== "pku" && user.organization !== "thu")) {
    throw new Error("COFFEE_TALK_APPLICANT_PROFILE_INCOMPLETE")
  }

  return {
    applicantName,
    email,
    affiliation: user.organization === "pku" ? "北大通班" : "清华通班",
    ...identity,
  }
}
