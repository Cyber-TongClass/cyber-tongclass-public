import type { PublicationPublicAuthorDetail } from "@/types"

export type InstitutePersonKind = "teacher" | "graduate"

export type PublicContentAudience = "undergrad" | "graduate"

export type PublicResearchGroupMembershipRole = "leader" | "faculty" | "graduate" | "member"

export type InstitutePublicLinkKind =
  | "homepage"
  | "scholar"
  | "orcid"
  | "github"
  | "other"

export type InstitutePublicLink = {
  kind: InstitutePublicLinkKind
  label: string
  href: string
}

export type InstituteResearchGroupLink = {
  label: string
  href: string
}

export type PublicInstitutePerson = {
  slug: string
  kind: InstitutePersonKind
  nameZh: string
  nameEn: string
  titleZh?: string
  titleEn?: string
  bioZh?: string
  bioEn?: string
  photoUrl?: string
  researchAreas: string[]
  publicLinks: InstitutePublicLink[]
  publicEmail?: string
  coffeeTalkOpen?: boolean
  isDemo: boolean
  researchGroupMemberships?: PublicInstitutePersonResearchGroupMembership[]
}

/**
 * A deliberately narrow public projection used inside relationship lists.
 * It excludes contact and account fields even when a full public profile may
 * independently publish an explicit contact channel.
 */
export type PublicInstitutePersonReference = {
  slug: string
  kind: InstitutePersonKind
  nameZh: string
  nameEn: string
  titleZh?: string
  titleEn?: string
  isDemo: boolean
}

export type PublicInstituteResearchGroupReference = {
  slug: string
  nameZh: string
  nameEn: string
  isDemo: boolean
}

export type PublicInstitutePersonResearchGroupMembership = {
  role: PublicResearchGroupMembershipRole
  researchGroup: PublicInstituteResearchGroupReference
}

export type PublicResearchGroupMember = {
  role: PublicResearchGroupMembershipRole
  person: PublicInstitutePersonReference
}

/**
 * Roster entry sourced from the private group-assignment table. Only the
 * display name and the leader-set subtitle are ever exposed publicly.
 */
export type PublicResearchGroupRosterEntry = {
  name: string
  subtitle?: string
}

export type PublicResearchGroup = {
  slug: string
  nameZh: string
  nameEn: string
  summaryZh?: string
  summaryEn?: string
  descriptionZh?: string
  descriptionEn?: string
  researchAreas: string[]
  publicLinks: InstituteResearchGroupLink[]
  recruitmentZh?: string
  recruitmentEn?: string
  isDemo: boolean
  leader?: PublicInstitutePerson
  members?: PublicResearchGroupMember[]
  roster?: PublicResearchGroupRosterEntry[]
}

export type PublicInstituteResearch = {
  id: string
  audiences: PublicContentAudience[]
  title: string
  authors: string[]
  authorDetails?: PublicationPublicAuthorDetail[]
  venue: string
  year: number
  abstract: string
  url?: string
  doi?: string
  category: string
  subCategory?: string
  people?: PublicInstitutePersonReference[]
  researchGroups?: PublicInstituteResearchGroupReference[]
}

export type PublicInstituteUpdate = {
  id: string
  audiences: PublicContentAudience[]
  title: string
  content: string
  sourceUrl?: string
  coverImageUrl?: string
  homepageSubtitle?: string
  category: string
  publishedAt: number
  people?: PublicInstitutePersonReference[]
  researchGroups?: PublicInstituteResearchGroupReference[]
}

export type ManagedResearchGroupProfile = {
  nameZh: string
  nameEn: string
  summaryZh: string
  summaryEn: string
  descriptionZh: string
  descriptionEn: string
  researchAreas: string[]
  recruitmentZh: string
  recruitmentEn: string
  publicLinks: InstituteResearchGroupLink[]
  visibility: "public" | "hidden"
}

export type ManagedResearchGroupPerson = {
  id: string
  userId?: string
  username: string
  name: string
  identityType: string
  subtitle?: string
  otherGroupName?: string
}

export type ManagedResearchGroupPublication = {
  id: string
  title: string
  authors: string[]
  venue?: string
  year?: number
  relationSource: "automatic" | "explicit" | "both" | string
  effectiveVisibility: "public" | "hidden"
}

export type ManagedResearchGroupRoster = {
  canManage: boolean
  group: ({
    id: string
    slug: string
    name: string
  } & ManagedResearchGroupProfile) | null
  leader: ManagedResearchGroupPerson | null
  members: ManagedResearchGroupPerson[]
  candidates: ManagedResearchGroupPerson[]
  publications: ManagedResearchGroupPublication[]
}
