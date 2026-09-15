import type { Publication, PublicationAuthorInput, PublicPublicationAuthor } from "@/types"

const AUTHOR_META_PATTERN = /^(.*?)\s*\[tc-author:([^\]]+)\]\s*$/

export type PublicationAuthor = {
  memberUserId?: string
  skipAutoMatch?: boolean
  name: string
  isTongClass?: boolean
  userId?: string
  username?: string
  institutePersonSlug?: string
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
    ...(author.institutePersonSlug ? { institutePersonSlug: author.institutePersonSlug } : {}),
    ...(author.memberUserId ? { memberUserId: author.memberUserId } : {}),
    ...(author.skipAutoMatch ? { skipAutoMatch: true } : {}),
    ...(author.coFirst ? { coFirst: true } : {}),
    ...(author.corresponding ? { corresponding: true } : {}),
  }

  if (Object.keys(meta).length === 0) {
    return name
  }

  return `${name} [tc-author:${encodeMeta(meta)}]`
}

export function toPublicationAuthorInput(author: PublicationAuthor): PublicationAuthorInput {
  return {
    snapshot: encodePublicationAuthor(author), name: author.name.trim(),
    coFirst: author.coFirst === true, corresponding: author.corresponding === true,
    ...(author.memberUserId ? { memberUserId: author.memberUserId } : {}),
    ...(author.skipAutoMatch ? { skipAutoMatch: true } : {}),
    ...(author.isTongClass && author.userId ? { tongClassUserId: author.userId } : {}),
    ...(author.isTongClass && author.username ? { tongClassUsername: author.username } : {}),
    ...(author.institutePersonSlug ? { institutePersonSlug: author.institutePersonSlug } : {}),
  }
}

export function toPublicPublicationAuthor(author: PublicationAuthor): PublicPublicationAuthor {
  return {
    name: author.name, coFirst: author.coFirst === true, corresponding: author.corresponding === true,
    ...(author.institutePersonSlug
      ? { profile: { kind: "institute_person" as const, slug: author.institutePersonSlug } }
      : author.isTongClass && author.username
        ? { profile: { kind: "tong_class_member" as const, slug: author.username } }
        : {}),
  }
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
