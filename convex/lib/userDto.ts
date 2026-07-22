export type TongClassUserRole = "member" | "admin" | "super_admin"
export type UserIdentityType = "undergrad" | "graduate" | "teacher" | "other"
export type TongClassOrganization = "pku" | "thu"
export type TongClassCohort = number | "mascot"
export type TongClassLinkType =
  | "homepage"
  | "scholar"
  | "orcid"
  | "github"
  | "x"
  | "xiaohongshu"
  | "linkedin"
  | "custom"

export type TongClassProfileLink = {
  type: TongClassLinkType
  label: string
  url: string
}

/**
 * The user fields currently stored in the Tong Class users table that are
 * eligible for an explicit DTO projection. It intentionally omits document,
 * credential, and session fields.
 */
export type TongClassUserRecord = {
  email: string
  username: string
  englishName: string
  chineseName?: string
  role: TongClassUserRole
  identityType?: UserIdentityType
  organization: TongClassOrganization
  cohort: TongClassCohort
  studentId: string
  personalEmails?: readonly string[]
  personalEmail?: string
  bio?: string
  profileMarkdown?: string
  researchDirections?: readonly string[]
  researchInterests?: readonly string[]
  links?: readonly TongClassProfileLink[]
  avatar?: string
  realPhoto?: string
  isClassMember?: boolean
  isEmailVerified: boolean
  createdAt: number
  updatedAt: number
}

export type PublicTongClassMemberDto = {
  username: string
  englishName: string
  chineseName?: string
  organization: TongClassOrganization
  cohort: TongClassCohort
  bio?: string
  profileMarkdown?: string
  researchDirections?: string[]
  researchInterests?: string[]
  links?: TongClassProfileLink[]
  avatar?: string
  realPhoto?: string
  isClassMember?: boolean
}

/**
 * A signed-in, non-administrative directory projection. The stable document
 * identifier is deliberately kept separate from the public member projection
 * so anonymous directory and search responses never expose a raw account ID.
 */
export type TongClassDirectoryUserDto = PublicTongClassMemberDto & {
  id: string
}

export type CurrentUserDto = {
  email: string
  username: string
  englishName: string
  chineseName?: string
  role: TongClassUserRole
  identityType?: UserIdentityType
  organization: TongClassOrganization
  cohort: TongClassCohort
  studentId: string
  personalEmails?: string[]
  personalEmail?: string
  bio?: string
  profileMarkdown?: string
  researchDirections?: string[]
  researchInterests?: string[]
  links?: TongClassProfileLink[]
  avatar?: string
  realPhoto?: string
  isClassMember?: boolean
  isEmailVerified: boolean
  createdAt: number
  updatedAt: number
}

export type AdminUserDto = CurrentUserDto

function copyStringList(values?: readonly string[]) {
  return values?.map((value) => value)
}

function copyLinks(links?: readonly TongClassProfileLink[]) {
  return links?.map((link) => ({
    type: link.type,
    label: link.label,
    url: link.url,
  }))
}

function copyAssignedIdentityType(user: TongClassUserRecord) {
  return user.identityType === "undergrad" ||
    user.identityType === "graduate" ||
    user.identityType === "teacher" ||
    user.identityType === "other"
    ? { identityType: user.identityType }
    : {}
}

export function toPublicTongClassMemberDto(
  user: TongClassUserRecord,
): PublicTongClassMemberDto {
  return {
    username: user.username,
    englishName: user.englishName,
    chineseName: user.chineseName,
    organization: user.organization,
    cohort: user.cohort,
    bio: user.bio,
    profileMarkdown: user.profileMarkdown,
    researchDirections: copyStringList(user.researchDirections),
    researchInterests: copyStringList(user.researchInterests),
    links: copyLinks(user.links),
    avatar: user.avatar,
    realPhoto: user.realPhoto,
    isClassMember: user.isClassMember,
  }
}

export function toTongClassDirectoryUserDto(
  user: TongClassUserRecord & { _id: unknown },
): TongClassDirectoryUserDto {
  return {
    id: String(user._id),
    ...toPublicTongClassMemberDto(user),
  }
}

export function toCurrentUserDto(user: TongClassUserRecord): CurrentUserDto {
  return {
    email: user.email,
    username: user.username,
    englishName: user.englishName,
    chineseName: user.chineseName,
    role: user.role,
    ...copyAssignedIdentityType(user),
    organization: user.organization,
    cohort: user.cohort,
    studentId: user.studentId,
    personalEmails: copyStringList(user.personalEmails),
    personalEmail: user.personalEmail,
    bio: user.bio,
    profileMarkdown: user.profileMarkdown,
    researchDirections: copyStringList(user.researchDirections),
    researchInterests: copyStringList(user.researchInterests),
    links: copyLinks(user.links),
    avatar: user.avatar,
    realPhoto: user.realPhoto,
    isClassMember: user.isClassMember,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function toAdminUserDto(user: TongClassUserRecord): AdminUserDto {
  return {
    email: user.email,
    username: user.username,
    englishName: user.englishName,
    chineseName: user.chineseName,
    role: user.role,
    ...copyAssignedIdentityType(user),
    organization: user.organization,
    cohort: user.cohort,
    studentId: user.studentId,
    personalEmails: copyStringList(user.personalEmails),
    personalEmail: user.personalEmail,
    bio: user.bio,
    profileMarkdown: user.profileMarkdown,
    researchDirections: copyStringList(user.researchDirections),
    researchInterests: copyStringList(user.researchInterests),
    links: copyLinks(user.links),
    avatar: user.avatar,
    realPhoto: user.realPhoto,
    isClassMember: user.isClassMember,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
