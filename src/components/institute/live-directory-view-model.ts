import type {
  PublicInstitutePerson,
  PublicInstitutePersonReference,
  PublicResearchGroup as PublicInstituteResearchGroup,
  PublicResearchGroupMember,
  PublicResearchGroupMembershipRole,
} from "@/types/institute"
import type {
  PublicDirectoryPerson,
  PublicResearchGroup as DirectoryResearchGroup,
} from "@/components/institute/demo-directory-data"

export type DirectoryResearchGroupMember = {
  person: PublicDirectoryPerson
  roleLabel: string
}

const membershipRoleLabels: Record<PublicResearchGroupMembershipRole, string> = {
  leader: "负责人",
  faculty: "教师成员",
  graduate: "研究生",
  member: "成员",
}

export function toResearchGroupMembershipRoleLabel(
  role: PublicResearchGroupMembershipRole,
): string {
  return membershipRoleLabels[role]
}

export function toDirectoryPersonReference(
  person: PublicInstitutePersonReference,
): PublicDirectoryPerson {
  return {
    slug: person.slug,
    nameZh: person.nameZh,
    nameEn: person.nameEn,
    kind: person.kind,
    title: person.titleZh || person.titleEn || (person.kind === "teacher" ? "研究院教师" : "研究生"),
    bio: "仅展示经研究院审核公开的团队成员资料。",
    researchAreas: [],
    groupSlugs: [],
    coffeeTalkOpen: false,
    isDemo: person.isDemo,
    visibility: "public",
  }
}

export function toDirectoryResearchGroupMember(
  member: PublicResearchGroupMember,
): DirectoryResearchGroupMember {
  return {
    person: toDirectoryPersonReference(member.person),
    roleLabel: toResearchGroupMembershipRoleLabel(member.role),
  }
}

/**
 * The public Convex DTO intentionally has a smaller surface than the original
 * demo presentation shape. These adapters fill only display defaults; they do
 * not infer memberships, account links, or contact details.
 */
export function toDirectoryPerson(person: PublicInstitutePerson): PublicDirectoryPerson {
  return {
    slug: person.slug,
    nameZh: person.nameZh,
    nameEn: person.nameEn,
    kind: person.kind,
    title: person.titleZh || person.titleEn || (person.kind === "teacher" ? "研究院教师" : "研究生"),
    bio: person.bioZh || person.bioEn || "暂无公开简介。",
    researchAreas: person.researchAreas,
    groupSlugs: (person.researchGroupMemberships ?? [])
      .map((membership) => membership.researchGroup.slug),
    coffeeTalkOpen: person.coffeeTalkOpen === true,
    isDemo: person.isDemo,
    visibility: "public",
  }
}

export function toDirectoryResearchGroup(
  group: PublicInstituteResearchGroup,
): DirectoryResearchGroup {
  const summary = group.summaryZh || group.summaryEn || "暂无公开简介。"

  return {
    slug: group.slug,
    nameZh: group.nameZh,
    nameEn: group.nameEn,
    summary,
    description: group.descriptionZh || group.descriptionEn || summary,
    researchAreas: group.researchAreas,
    leaderSlug: group.leader?.slug || "",
    // Memberships originate from explicit, public relationship rows. No
    // account fields or name-based matching reaches this presentation layer.
    memberSlugs: (group.members ?? []).map((member) => member.person.slug),
    recruitmentNote: group.recruitmentZh || group.recruitmentEn || "暂未发布更多公开说明。",
    sortOrder: 0,
    isDemo: group.isDemo,
    visibility: "public",
  }
}
