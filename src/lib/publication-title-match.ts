import type { Publication } from "@/types"

type PublicationTitleMatch = {
  publication: Publication
  score: number
  exact: boolean
}

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\b(a|an|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function compactTitle(title: string) {
  return normalizeTitle(title).replace(/\s+/g, "")
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = Array.from({ length: b.length + 1 }, () => 0)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      )
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j]
    }
  }

  return previous[b.length]
}

function titleSimilarity(a: string, b: string) {
  const left = compactTitle(a)
  const right = compactTitle(b)
  if (!left || !right) return 0
  if (left === right) return 1

  const minLength = Math.min(left.length, right.length)
  const maxLength = Math.max(left.length, right.length)
  if (minLength >= 18 && (left.includes(right) || right.includes(left))) {
    return minLength / maxLength
  }

  const distance = levenshteinDistance(left, right)
  return 1 - distance / maxLength
}

export function findSimilarPublicationTitle(
  title: string,
  publications: Publication[],
  ignorePublicationId?: string
): PublicationTitleMatch | null {
  const normalized = normalizeTitle(title)
  if (normalized.length < 8) return null

  let bestMatch: PublicationTitleMatch | null = null

  for (const publication of publications) {
    if (ignorePublicationId && String(publication._id) === String(ignorePublicationId)) continue

    const score = titleSimilarity(title, publication.title)
    const exact = compactTitle(title) === compactTitle(publication.title)
    const isMatch = exact || score >= 0.88
    if (!isMatch) continue

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { publication, score, exact }
    }
  }

  return bestMatch
}
