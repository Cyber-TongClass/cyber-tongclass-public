import type { Publication } from "@/types"

const AUTHOR_META_PATTERN = /^(.*?)\s*\[tc-author:([^\]]+)\]\s*$/

export type PublicationAuthor = {
  name: string
  isTongClass?: boolean
  userId?: string
  username?: string
  coFirst?: boolean
  corresponding?: boolean
}

type EncodedAuthorMeta = Omit<PublicationAuthor, "name">

function encodeMeta(meta: EncodedAuthorMeta) {
  return encodeURIComponent(JSON.stringify(meta))
}

function decodeMeta(value: string): EncodedAuthorMeta | null {
  try {
    const decoded = decodeURIComponent(value)
    const parsed = JSON.parse(decoded) as EncodedAuthorMeta
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

export function parsePublicationAuthor(value: string): PublicationAuthor {
  const match = value.match(AUTHOR_META_PATTERN)
  if (!match) {
    return { name: value.trim() }
  }

  const meta = decodeMeta(match[2])
  return {
    name: match[1].trim(),
    ...(meta || {}),
  }
}

export function encodePublicationAuthor(author: PublicationAuthor) {
  const name = author.name.trim()
  if (!name) return ""

  const meta: EncodedAuthorMeta = {
    ...(author.isTongClass && author.userId ? { isTongClass: true, userId: author.userId } : {}),
    ...(author.username ? { username: author.username } : {}),
    ...(author.coFirst ? { coFirst: true } : {}),
    ...(author.corresponding ? { corresponding: true } : {}),
  }

  if (Object.keys(meta).length === 0) {
    return name
  }

  return `${name} [tc-author:${encodeMeta(meta)}]`
}

export function parsePublicationAuthors(values: string[]) {
  return values.map(parsePublicationAuthor)
}

export function getPublicationAuthorName(value: string) {
  return parsePublicationAuthor(value).name
}

export function formatPublicationAuthorsForText(values: string[]) {
  return parsePublicationAuthors(values)
    .map((author) => `${author.name}${author.coFirst ? "*" : ""}${author.corresponding ? "✉" : ""}`)
    .join(", ")
}

export function publicationBelongsToUser(publication: Publication, userId?: string | null) {
  if (!userId) return false
  if (String(publication.userId) === String(userId)) return true

  return parsePublicationAuthors(publication.authors).some(
    (author) => author.isTongClass && author.userId && String(author.userId) === String(userId)
  )
}

export function canEditPublication(publication: Publication, userId?: string | null) {
  if (!userId) return false
  if (String(publication.userId) === String(userId)) return true

  return parsePublicationAuthors(publication.authors).some(
    (author) =>
      author.isTongClass &&
      author.coFirst &&
      author.userId &&
      String(author.userId) === String(userId)
  )
}
