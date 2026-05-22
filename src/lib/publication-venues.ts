import type { Publication } from "@/types"

const PREPRINT_VENUE = "arXiv Preprint"

function normalizeVenue(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function venueSearchKey(value: string) {
  return normalizeVenue(value).toLowerCase()
}

export function isPreprintVenue(value: string) {
  return venueSearchKey(value) === venueSearchKey(PREPRINT_VENUE)
}

export function getPublicationVenueOptions(publications: Publication[]) {
  const seen = new Map<string, string>()

  for (const publication of publications) {
    const venue = normalizeVenue(publication.venue)
    if (!venue || isPreprintVenue(venue)) continue

    const key = venueSearchKey(venue)
    if (!seen.has(key)) {
      seen.set(key, venue)
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
}

export function getMatchingPublicationVenues(query: string, venues: string[], limit = 6) {
  const normalizedQuery = venueSearchKey(query)
  if (!normalizedQuery) return []

  return venues
    .map((venue) => {
      const key = venueSearchKey(venue)
      const score = key === normalizedQuery ? 0 : key.startsWith(normalizedQuery) ? 1 : key.includes(normalizedQuery) ? 2 : 3
      return { venue, score }
    })
    .filter((item) => item.score < 3)
    .sort((a, b) => a.score - b.score || a.venue.localeCompare(b.venue))
    .slice(0, limit)
    .map((item) => item.venue)
}
