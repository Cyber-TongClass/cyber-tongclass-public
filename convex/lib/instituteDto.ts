import type {
  InstitutePersonKind,
  InstitutePublicLink,
  InstitutePublicLinkKind,
  InstituteResearchGroupLink,
  PublicContentAudience,
  PublicInstitutePerson,
  PublicInstitutePersonReference,
  PublicInstitutePersonResearchGroupMembership,
  PublicInstituteResearch,
  PublicInstituteResearchGroupReference,
  PublicInstituteUpdate,
  PublicResearchGroupMember,
  PublicResearchGroupMembershipRole,
  PublicResearchGroup,
} from "../../src/types/institute"
import type { PublicPublicationAuthor } from "../../src/types"
const PUBLICATION_AUTHOR_META_PATTERN = /^(.*?)\s*\[tc-author:([^\]]+)\]\s*$/

function publicationAuthorDisplayName(value: string): string {
  const match = value.match(PUBLICATION_AUTHOR_META_PATTERN)
  return (match?.[1] ?? value).trim()
}

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
  /**
   * Deliberately private. Its presence gates the public Coffee Talk affordance
   * without ever serialising the account identifier to a public DTO.
   */
  accountUserId?: string
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
  authorDetails?: readonly PublicPublicationAuthor[]
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
  researchGroupId?: string
  role: PublicResearchGroupMembershipRole
  isPrimary?: boolean
  endedAt?: number
}

export type InstitutePublicPersonResearchGroupMembershipSource = {
  role: PublicResearchGroupMembershipRole
  researchGroup: ResearchGroupRecord
}

export type InstitutePublicResearchGroupMemberSource = {
  role: PublicResearchGroupMembershipRole
  person: InstitutePersonRecord
}

export type InstitutePublicResearchGroupRosterEntry = {
  name: string
  subtitle?: string
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

export function toPublicInstitutePersonReference(
  person: InstitutePersonRecord,
): PublicInstitutePersonReference {
  const dto: PublicInstitutePersonReference = {
    slug: person.slug,
    kind: person.kind,
    nameZh: person.nameZh,
    nameEn: person.nameEn,
    isDemo: person.isDemo,
  }

  if (person.titleZh !== undefined) dto.titleZh = person.titleZh
  if (person.titleEn !== undefined) dto.titleEn = person.titleEn

  return dto
}

function toPublicPersonResearchGroupMembership(
  source: InstitutePublicPersonResearchGroupMembershipSource,
): PublicInstitutePersonResearchGroupMembership {
  return {
    role: source.role,
    researchGroup: toPublicResearchGroupReference(source.researchGroup),
  }
}

function toPublicResearchGroupMember(
  source: InstitutePublicResearchGroupMemberSource,
): PublicResearchGroupMember {
  return {
    role: source.role,
    person: toPublicInstitutePersonReference(source.person),
  }
}

export function toPublicInstitutePerson(
  person: InstitutePersonRecord,
  researchGroupMemberships?: readonly InstitutePublicPersonResearchGroupMembershipSource[],
): PublicInstitutePerson {
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
  // A public Coffee Talk CTA is only meaningful when there is an explicitly
  // bound institute account that can receive and manage the application. This
  // keeps unbound directory/demo entries from becoming an unattended PII sink.
  if (
    person.kind === "teacher"
    && person.coffeeTalkOpen === true
    && person.accountUserId !== undefined
  ) {
    dto.coffeeTalkOpen = true
  }
  if (researchGroupMemberships !== undefined) {
    dto.researchGroupMemberships = researchGroupMemberships
      .map((membership) => toPublicPersonResearchGroupMembership(membership))
  }

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
  members?: readonly InstitutePublicResearchGroupMemberSource[],
  roster?: readonly InstitutePublicResearchGroupRosterEntry[],
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
  if (members !== undefined) dto.members = members.map((member) => toPublicResearchGroupMember(member))
  if (roster !== undefined && roster.length > 0) {
    dto.roster = roster.map((entry) => {
      const copy: { name: string; subtitle?: string } = { name: entry.name }
      if (entry.subtitle !== undefined) copy.subtitle = entry.subtitle
      return copy
    })
  }

  return dto
}

function addPublicRelations(
  dto: PublicInstituteResearch | PublicInstituteUpdate,
  relations?: InstituteContentRelationSources,
): void {
  if (relations === undefined) return

  dto.people = (relations.people ?? []).map((person) => toPublicInstitutePersonReference(person))
  dto.researchGroups = (relations.researchGroups ?? [])
    .map((group) => toPublicResearchGroupReference(group))
}

type EncodedPublicationAuthorMeta = {
  isTongClass?: boolean
  username?: string
  coFirst?: boolean
  corresponding?: boolean
}

function normalizePublicAuthorSlug(value: unknown) {
  if (typeof value !== "string") return undefined
  const slug = value.trim().toLowerCase()
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : undefined
}

function parsePublicAuthorMeta(value: string): { name: string; meta: EncodedPublicationAuthorMeta } {
  const match = value.match(PUBLICATION_AUTHOR_META_PATTERN)
  if (!match) return { name: value.trim(), meta: {} }
  try {
    const decoded = JSON.parse(decodeURIComponent(match[2])) as Record<string, unknown>
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
      return { name: match[1].trim(), meta: {} }
    }
    return {
      name: match[1].trim(),
      meta: {
        ...(decoded.isTongClass === true ? { isTongClass: true } : {}),
        ...(typeof decoded.username === "string" ? { username: decoded.username } : {}),
        ...(decoded.coFirst === true ? { coFirst: true } : {}),
        ...(decoded.corresponding === true ? { corresponding: true } : {}),
      },
    }
  } catch {
    return { name: match[1].trim(), meta: {} }
  }
}

export function toPublicPublicationAuthor(
  snapshot: string,
  options?: { institutePersonSlug?: string; corresponding?: boolean },
): PublicPublicationAuthor {
  const parsed = parsePublicAuthorMeta(snapshot)
  const instituteSlug = normalizePublicAuthorSlug(options?.institutePersonSlug)
  const tongSlug = parsed.meta.isTongClass
    ? normalizePublicAuthorSlug(parsed.meta.username)
    : undefined
  const profile = instituteSlug
    ? { kind: "institute_person" as const, slug: instituteSlug }
    : tongSlug
      ? { kind: "tong_class_member" as const, slug: tongSlug }
      : undefined
  return {
    name: parsed.name,
    coFirst: parsed.meta.coFirst === true,
    corresponding: parsed.meta.corresponding === true || options?.corresponding === true,
    ...(profile ? { profile } : {}),
  }
}

export function toPublicInstituteResearch(
  publication: InstitutePublicationRecord,
  content: { id: string; audiences: readonly PublicContentAudience[] },
  relations?: InstituteContentRelationSources,
): PublicInstituteResearch {
  const dto: PublicInstituteResearch = {
    id: content.id,
    audiences: [...content.audiences],
    title: publication.title,
    authors: publication.authors.map((author) => publicationAuthorDisplayName(author)),
    authorDetails: publication.authorDetails
      ? publication.authorDetails.map((author) => ({ ...author, ...(author.profile ? { profile: { ...author.profile } } : {}) }))
      : publication.authors.map((author) => toPublicPublicationAuthor(author)),
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
  content: { id: string; audiences: readonly PublicContentAudience[] },
  relations?: InstituteContentRelationSources,
): PublicInstituteUpdate {
  const dto: PublicInstituteUpdate = {
    id: content.id,
    audiences: [...content.audiences],
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
