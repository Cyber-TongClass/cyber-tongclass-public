export type InstitutePersonKind = "teacher" | "graduate"

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
}

export type PublicInstituteResearch = {
  title: string
  authors: string[]
  venue: string
  year: number
  abstract: string
  url?: string
  doi?: string
  category: string
  subCategory?: string
  people?: PublicInstitutePerson[]
  researchGroups?: PublicInstituteResearchGroupReference[]
}

export type PublicInstituteUpdate = {
  title: string
  content: string
  sourceUrl?: string
  coverImageUrl?: string
  homepageSubtitle?: string
  category: string
  publishedAt: number
  people?: PublicInstitutePerson[]
  researchGroups?: PublicInstituteResearchGroupReference[]
}
