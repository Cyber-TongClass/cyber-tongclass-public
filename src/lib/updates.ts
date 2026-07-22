export const AUDIENCE_OPTIONS = [
  { value: "undergraduate", label: "本科生" },
  { value: "graduate", label: "研究生" },
  { value: "teacher", label: "老师" },
] as const

export type Audience = (typeof AUDIENCE_OPTIONS)[number]["value"]

export const DEFAULT_AUDIENCES: Audience[] = AUDIENCE_OPTIONS.map((option) => option.value)

type Taggable = {
  audiences?: Audience[]
  tags?: string[]
}

export type NewsUpdateSource = Taggable & {
  _id: string
  title: string
  content: string
  category: string
  publishedAt: number
  sourceUrl?: string
  coverImageUrl?: string
}

export type EventUpdateSource = Taggable & {
  _id: string
  title: string
  date: string
  time?: string
  endDate?: string
  endTime?: string
  location?: string
  description?: string
  url?: string
  color: string
}

export type UpdateFeedItem = {
  id: string
  type: "news" | "event"
  title: string
  summary: string
  timestamp: number
  href: string
  dateLabel: string
  audiences: Audience[]
  tags: string[]
  category?: string
  location?: string
  time?: string
  imageUrl?: string
}

export type UpdateFilters = {
  audiences: Audience[]
  tags: string[]
}

export function normalizeTags(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function mergeUpdates(news: NewsUpdateSource[], events: EventUpdateSource[]) {
  const newsItems: UpdateFeedItem[] = news.map((item) => ({
    id: item._id,
    type: "news",
    title: item.title,
    summary: item.content,
    timestamp: item.publishedAt,
    href: item.sourceUrl || `/news/${item._id}`,
    dateLabel: new Date(item.publishedAt).toLocaleDateString("zh-CN"),
    audiences: item.audiences || [],
    tags: normalizeTags(item.tags || []),
    category: item.category,
    imageUrl: item.coverImageUrl,
  }))

  const eventItems: UpdateFeedItem[] = events.map((item) => ({
    id: item._id,
    type: "event",
    title: item.title,
    summary: item.description || "",
    timestamp: new Date(`${item.date}T12:00:00`).getTime(),
    href: item.url || `/events/${item._id}`,
    dateLabel: new Date(`${item.date}T12:00:00`).toLocaleDateString("zh-CN"),
    audiences: item.audiences || [],
    tags: normalizeTags(item.tags || []),
    location: item.location,
    time: item.time,
  }))

  return [...newsItems, ...eventItems].sort((left, right) => (
    right.timestamp - left.timestamp || left.id.localeCompare(right.id)
  ))
}

export function matchesUpdateFilters(item: Pick<UpdateFeedItem, "audiences" | "tags">, filters: UpdateFilters) {
  const matchesAudience = !filters.audiences.length || item.audiences.some((value) => filters.audiences.includes(value))
  const matchesTag = !filters.tags.length || item.tags.some((value) => filters.tags.includes(value))
  return matchesAudience && matchesTag
}

export function filterUpdates<T extends Pick<UpdateFeedItem, "audiences" | "tags">>(items: T[], filters: UpdateFilters) {
  return items.filter((item) => matchesUpdateFilters(item, filters))
}

export function getAvailableTags(items: Array<Pick<UpdateFeedItem, "tags">>) {
  return normalizeTags(items.flatMap((item) => item.tags)).sort((left, right) => left.localeCompare(right, "zh-CN"))
}

export function getAudienceLabel(audience: Audience) {
  return AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label || audience
}
