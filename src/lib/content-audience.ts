export type ContentAudience = "undergrad" | "graduate"

export type AudienceFilter = "all" | ContentAudience

export interface AudienceCounts {
  all: number
  undergrad: number
  graduate: number
}

export interface AudienceCollections<T> {
  all: T[]
  undergrad: T[]
  graduate: T[]
  counts: AudienceCounts
}

export function buildAudienceCollections<
  T extends { id: string; audiences: ContentAudience[] },
>(items: T[]): AudienceCollections<T> {
  const uniqueItems = new Map<string, T>()
  for (const item of items) {
    if (!uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item)
    }
  }

  const all = [...uniqueItems.values()]
  const undergrad = all.filter((item) => item.audiences.includes("undergrad"))
  const graduate = all.filter((item) => item.audiences.includes("graduate"))

  return {
    all,
    undergrad,
    graduate,
    counts: {
      all: all.length,
      undergrad: undergrad.length,
      graduate: graduate.length,
    },
  }
}
