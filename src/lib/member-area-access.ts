type MemberAreaUser = {
  role?: string | null
  identityType?: string | null
  isClassMember?: boolean
}

export function canAccessMemberArea(
  user: MemberAreaUser | null | undefined,
  allowedIdentityTypes: readonly string[] = [],
) {
  if (!user) return false
  const identityType = user.identityType
  return user.isClassMember === true
    || user.role === "admin"
    || user.role === "super_admin"
    || (typeof identityType === "string" && allowedIdentityTypes.includes(identityType))
}
