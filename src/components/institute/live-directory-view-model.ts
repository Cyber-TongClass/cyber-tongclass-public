import type {
  PublicInstitutePerson,
  PublicResearchGroup as PublicInstituteResearchGroup,
} from "@/types/institute"
import type {
  PublicDirectoryPerson,
  PublicResearchGroup as DirectoryResearchGroup,
} from "@/components/institute/demo-directory-data"

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
    groupSlugs: [],
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
    // The public DTO currently publishes only the explicit leader relation.
    // Do not derive or expose any additional membership from account data.
    memberSlugs: [],
    recruitmentNote: group.recruitmentZh || group.recruitmentEn || "暂未发布更多公开说明。",
    sortOrder: 0,
    isDemo: group.isDemo,
    visibility: "public",
  }
}
