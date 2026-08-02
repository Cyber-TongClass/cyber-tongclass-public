export type PublicRosterProfile = {
  username: string
  chineseName?: string
  englishName: string
}

export type PublicRosterEntry = {
  name: string
  subtitle?: string
  profileHref?: string
}

function normalizeRosterIdentity(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? ""
}

/**
 * Links an account-level roster entry only when its displayed identity
 * resolves to exactly one already-public Tong Class profile.
 */
export function attachPublicRosterProfileHrefs(
  roster: readonly PublicRosterEntry[],
  profiles: readonly PublicRosterProfile[],
): PublicRosterEntry[] {
  const profilesByIdentity = new Map<string, Map<string, PublicRosterProfile>>()

  for (const profile of profiles) {
    for (const identity of [profile.username, profile.chineseName, profile.englishName]) {
      const normalized = normalizeRosterIdentity(identity)
      if (!normalized) continue
      const matches = profilesByIdentity.get(normalized) ?? new Map<string, PublicRosterProfile>()
      matches.set(profile.username, profile)
      profilesByIdentity.set(normalized, matches)
    }
  }

  return roster.map((entry) => {
    const matches = profilesByIdentity.get(normalizeRosterIdentity(entry.name))
    if (!matches || matches.size !== 1) return { ...entry }
    const profile = [...matches.values()][0]
    return {
      ...entry,
      profileHref: `/tong-class/members/${encodeURIComponent(profile.username)}`,
    }
  })
}
