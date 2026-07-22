import type {
  InstitutePersonKind,
  InstitutePublicLink,
  InstitutePublicLinkKind,
  InstituteResearchGroupLink,
  PublicInstitutePerson,
  PublicInstituteResearch,
  PublicInstituteResearchGroupReference,
  PublicInstituteUpdate,
  PublicResearchGroup,
} from "../../src/types/institute"

export type InstitutePersonRecord = {
  slug: string
  kind: InstitutePersonKind
  nameZh: string
  nameEn: string
  titleZh?: string
  titleEn?: string
  bioZh?: string
  bioEn?: string
  photoUrl?: string
  researchAreas: readonly string[]
  publicLinks: readonly {
    kind: InstitutePublicLinkKind
    label: string
    href: string
  }[]
  publicEmail?: string
  coffeeTalkOpen?: boolean
  isDemo: boolean
}

export type ResearchGroupRecord = {
  slug: string
  nameZh: string
  nameEn: string
  summaryZh?: string
  summaryEn?: string
  descriptionZh?: string
  descriptionEn?: string
  researchAreas: readonly string[]
  publicLinks: readonly {
    label: string
    href: string
  }[]
  recruitmentZh?: string
  recruitmentEn?: string
  isDemo: boolean
}

export type InstitutePublicationRecord = {
  title: string
  authors: readonly string[]
  venue: string
  year: number
  abstract: string
  url?: string
  doi?: string
  category: string
  subCategory?: string
}

export type InstituteNewsRecord = {
  title: string
  content: string
  sourceUrl?: string
  coverImageUrl?: string
  homepageSubtitle?: string
  category: string
  publishedAt: number
}

export type InstituteContentRelationSources = {
  people?: readonly InstitutePersonRecord[]
  researchGroups?: readonly ResearchGroupRecord[]
}

export type InstituteGroupMembershipRecord = {
  personId: string
  role: "leader" | "faculty" | "graduate" | "member"
  endedAt?: number
}

function copyStringList(values: readonly string[]): string[] {
  return values.map((value) => value)
}

function copyInstitutePublicLinks(
  links: readonly {
    kind: InstitutePublicLinkKind
    label: string
    href: string
  }[],
): InstitutePublicLink[] {
  return links.map((link) => ({
    kind: link.kind,
    label: link.label,
    href: link.href,
  }))
}

function copyResearchGroupLinks(
  links: readonly {
    label: string
    href: string
  }[],
): InstituteResearchGroupLink[] {
  return links.map((link) => ({
    label: link.label,
    href: link.href,
  }))
}

export function toPublicInstitutePerson(person: InstitutePersonRecord): PublicInstitutePerson {
  const dto: PublicInstitutePerson = {
    slug: person.slug,
    kind: person.kind,
    nameZh: person.nameZh,
    nameEn: person.nameEn,
    researchAreas: copyStringList(person.researchAreas),
    publicLinks: copyInstitutePublicLinks(person.publicLinks),
    isDemo: person.isDemo,
  }

  if (person.titleZh !== undefined) dto.titleZh = person.titleZh
  if (person.titleEn !== undefined) dto.titleEn = person.titleEn
  if (person.bioZh !== undefined) dto.bioZh = person.bioZh
  if (person.bioEn !== undefined) dto.bioEn = person.bioEn
  if (person.photoUrl !== undefined) dto.photoUrl = person.photoUrl
  if (person.publicEmail !== undefined) dto.publicEmail = person.publicEmail
  if (person.coffeeTalkOpen !== undefined) dto.coffeeTalkOpen = person.coffeeTalkOpen

  return dto
}

export function toPublicResearchGroupReference(
  group: ResearchGroupRecord,
): PublicInstituteResearchGroupReference {
  return {
    slug: group.slug,
    nameZh: group.nameZh,
    nameEn: group.nameEn,
    isDemo: group.isDemo,
  }
}

export function toPublicResearchGroup(
  group: ResearchGroupRecord,
  leader?: InstitutePersonRecord,
): PublicResearchGroup {
  const dto: PublicResearchGroup = {
    slug: group.slug,
    nameZh: group.nameZh,
    nameEn: group.nameEn,
    researchAreas: copyStringList(group.researchAreas),
    publicLinks: copyResearchGroupLinks(group.publicLinks),
    isDemo: group.isDemo,
  }

  if (group.summaryZh !== undefined) dto.summaryZh = group.summaryZh
  if (group.summaryEn !== undefined) dto.summaryEn = group.summaryEn
  if (group.descriptionZh !== undefined) dto.descriptionZh = group.descriptionZh
  if (group.descriptionEn !== undefined) dto.descriptionEn = group.descriptionEn
  if (group.recruitmentZh !== undefined) dto.recruitmentZh = group.recruitmentZh
  if (group.recruitmentEn !== undefined) dto.recruitmentEn = group.recruitmentEn
  if (leader !== undefined) dto.leader = toPublicInstitutePerson(leader)

  return dto
}

function addPublicRelations(
  dto: PublicInstituteResearch | PublicInstituteUpdate,
  relations?: InstituteContentRelationSources,
): void {
  if (relations === undefined) return

  dto.people = (relations.people ?? []).map((person) => toPublicInstitutePerson(person))
  dto.researchGroups = (relations.researchGroups ?? [])
    .map((group) => toPublicResearchGroupReference(group))
}

export function toPublicInstituteResearch(
  publication: InstitutePublicationRecord,
  relations?: InstituteContentRelationSources,
): PublicInstituteResearch {
  const dto: PublicInstituteResearch = {
    title: publication.title,
    authors: copyStringList(publication.authors),
    venue: publication.venue,
    year: publication.year,
    abstract: publication.abstract,
    category: publication.category,
  }

  if (publication.url !== undefined) dto.url = publication.url
  if (publication.doi !== undefined) dto.doi = publication.doi
  if (publication.subCategory !== undefined) dto.subCategory = publication.subCategory
  addPublicRelations(dto, relations)

  return dto
}

export function toPublicInstituteUpdate(
  news: InstituteNewsRecord,
  relations?: InstituteContentRelationSources,
): PublicInstituteUpdate {
  const dto: PublicInstituteUpdate = {
    title: news.title,
    content: news.content,
    category: news.category,
    publishedAt: news.publishedAt,
  }

  if (news.sourceUrl !== undefined) dto.sourceUrl = news.sourceUrl
  if (news.coverImageUrl !== undefined) dto.coverImageUrl = news.coverImageUrl
  if (news.homepageSubtitle !== undefined) dto.homepageSubtitle = news.homepageSubtitle
  addPublicRelations(dto, relations)

  return dto
}

export function validateGroupMemberships(
  leaderPersonId: string,
  memberships: readonly InstituteGroupMembershipRecord[],
): void {
  const activeLeaderMemberships = memberships.filter((membership) => (
    membership.personId === leaderPersonId
    && membership.role === "leader"
    && membership.endedAt === undefined
  ))

  if (activeLeaderMemberships.length !== 1) {
    throw new Error("INSTITUTE_LEADER_MEMBERSHIP_REQUIRED")
  }
}
