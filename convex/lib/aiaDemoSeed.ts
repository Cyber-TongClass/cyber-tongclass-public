export type AiaDemoPersonSeed = {
  slug: string
  kind: "teacher" | "graduate"
  nameZh: string
  nameEn: string
  titleZh?: string
  titleEn?: string
  bioZh?: string
  bioEn?: string
  researchAreas: string[]
  publicLinks: Array<{
    kind: "homepage" | "scholar" | "orcid" | "github" | "other"
    label: string
    href: string
  }>
  coffeeTalkOpen?: boolean
  visibility: "public"
  displayOrder: number
  isDemo: true
}

export type AiaDemoGroupSeed = {
  slug: string
  nameZh: string
  nameEn: string
  summaryZh?: string
  summaryEn?: string
  descriptionZh?: string
  descriptionEn?: string
  leaderSlug: string
  researchAreas: string[]
  publicLinks: Array<{ label: string; href: string }>
  recruitmentZh?: string
  recruitmentEn?: string
  visibility: "public"
  displayOrder: number
  isDemo: true
}

export type AiaDemoMembershipSeed = {
  naturalKey: string
  personSlug: string
  groupSlug: string
  role: "leader" | "faculty" | "graduate" | "member"
  isPrimary: boolean
  visibility: "public"
  sortOrder: number
}

export type AiaDemoDirectorySeed = {
  people: AiaDemoPersonSeed[]
  groups: AiaDemoGroupSeed[]
  memberships: AiaDemoMembershipSeed[]
}

export type DemoSlugRecord = {
  slug: string
  isDemo: boolean
}

export type DemoUpsertDisposition = "create" | "update"

const demoPeople: readonly AiaDemoPersonSeed[] = [
  {
    slug: "aia-demo-professor-lin",
    kind: "teacher",
    nameZh: "林演示",
    nameEn: "Demo Professor Lin",
    titleZh: "教授（演示）",
    titleEn: "Professor (Demo)",
    bioZh: "用于 AIA 目录与 Coffee Talk 联调的演示教师资料。",
    bioEn: "Demonstration faculty profile for AIA directory and Coffee Talk testing.",
    researchAreas: ["可信人工智能", "机器学习系统"],
    publicLinks: [],
    coffeeTalkOpen: true,
    visibility: "public",
    displayOrder: 10,
    isDemo: true,
  },
  {
    slug: "aia-demo-professor-zhou",
    kind: "teacher",
    nameZh: "周演示",
    nameEn: "Demo Professor Zhou",
    titleZh: "副教授（演示）",
    titleEn: "Associate Professor (Demo)",
    bioZh: "用于 AIA 目录展示的演示教师资料。",
    bioEn: "Demonstration faculty profile for the AIA directory.",
    researchAreas: ["具身智能", "多模态学习"],
    publicLinks: [],
    coffeeTalkOpen: true,
    visibility: "public",
    displayOrder: 20,
    isDemo: true,
  },
  {
    slug: "aia-demo-graduate-chen",
    kind: "graduate",
    nameZh: "陈演示",
    nameEn: "Demo Graduate Chen",
    titleZh: "博士生（演示）",
    titleEn: "PhD Student (Demo)",
    bioZh: "用于 AIA 研究生目录展示的演示资料。",
    bioEn: "Demonstration graduate profile for the AIA directory.",
    researchAreas: ["可信人工智能", "评测与安全"],
    publicLinks: [],
    visibility: "public",
    displayOrder: 30,
    isDemo: true,
  },
]

const demoGroups: readonly AiaDemoGroupSeed[] = [
  {
    slug: "aia-demo-intelligent-systems-lab",
    nameZh: "智能系统实验室（演示）",
    nameEn: "Intelligent Systems Lab (Demo)",
    summaryZh: "用于 AIA 研究组目录与成员关系联调的演示研究组。",
    summaryEn: "A demonstration group for AIA directory and membership integration testing.",
    descriptionZh: "本资料仅用于演示，不对应真实课题组、成员或招生信息。",
    descriptionEn: "This profile is for demonstration only and does not represent a real group, member, or recruitment activity.",
    leaderSlug: "aia-demo-professor-lin",
    researchAreas: ["可信人工智能", "机器学习系统"],
    publicLinks: [],
    recruitmentZh: "演示数据，不开放实际招生。",
    recruitmentEn: "Demonstration data; not an active recruitment notice.",
    visibility: "public",
    displayOrder: 10,
    isDemo: true,
  },
]

function membershipNaturalKey(groupSlug: string, personSlug: string): string {
  return `aia-demo-membership:${groupSlug}:${personSlug}`
}

const demoMemberships: readonly AiaDemoMembershipSeed[] = [
  {
    naturalKey: membershipNaturalKey(
      "aia-demo-intelligent-systems-lab",
      "aia-demo-professor-lin",
    ),
    groupSlug: "aia-demo-intelligent-systems-lab",
    personSlug: "aia-demo-professor-lin",
    role: "leader",
    isPrimary: true,
    visibility: "public",
    sortOrder: 10,
  },
  {
    naturalKey: membershipNaturalKey(
      "aia-demo-intelligent-systems-lab",
      "aia-demo-professor-zhou",
    ),
    groupSlug: "aia-demo-intelligent-systems-lab",
    personSlug: "aia-demo-professor-zhou",
    role: "faculty",
    isPrimary: true,
    visibility: "public",
    sortOrder: 20,
  },
  {
    naturalKey: membershipNaturalKey(
      "aia-demo-intelligent-systems-lab",
      "aia-demo-graduate-chen",
    ),
    groupSlug: "aia-demo-intelligent-systems-lab",
    personSlug: "aia-demo-graduate-chen",
    role: "graduate",
    isPrimary: true,
    visibility: "public",
    sortOrder: 30,
  },
]

function copyPerson(person: AiaDemoPersonSeed): AiaDemoPersonSeed {
  return {
    ...person,
    researchAreas: [...person.researchAreas],
    publicLinks: person.publicLinks.map((link) => ({ ...link })),
  }
}

function copyGroup(group: AiaDemoGroupSeed): AiaDemoGroupSeed {
  return {
    ...group,
    researchAreas: [...group.researchAreas],
    publicLinks: group.publicLinks.map((link) => ({ ...link })),
  }
}

export function getAiaDemoDirectorySeed(): AiaDemoDirectorySeed {
  return {
    people: demoPeople.map(copyPerson),
    groups: demoGroups.map(copyGroup),
    memberships: demoMemberships.map((membership) => ({ ...membership })),
  }
}

/**
 * A slug collision is safe only when the existing record is already marked
 * demo. Real directory records always win over a fixed demo fixture.
 */
export function classifyDemoUpsert(
  existing: DemoSlugRecord | null,
  slug: string,
): DemoUpsertDisposition {
  if (existing === null) return "create"
  if (existing.slug === slug && existing.isDemo) return "update"
  throw new Error("AIA_DEMO_SLUG_CONFLICT")
}
