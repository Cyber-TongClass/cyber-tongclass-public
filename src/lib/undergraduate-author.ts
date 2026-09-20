export type WebsiteAuthorDetail = {
  name?: string
  coFirst?: boolean
  corresponding?: boolean
  profile?: { kind: string; slug: string }
}

type Member = { username?: string; id?: string; _id?: string }

/** Only the undergraduate directory can grant an author a Tong Class link. */
export function undergraduateAuthorHref(
  detail: WebsiteAuthorDetail | undefined,
  legacy: { isTongClass?: boolean; username?: string; userId?: string },
  members: Member[] | undefined,
): string | null {
  if (!members) return null
  if (detail?.profile && detail.profile.kind !== "tong_class_member") return null
  const slug = detail?.profile?.slug || (legacy.isTongClass ? legacy.username : undefined)
  const member = members.find((candidate) => slug
    ? candidate.username === slug
    : legacy.isTongClass && legacy.userId && String(candidate.id || candidate._id) === legacy.userId)
  return member?.username ? `/members/${encodeURIComponent(member.username)}` : null
}
