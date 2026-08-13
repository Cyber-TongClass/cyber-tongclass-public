import type {
  Publication,
  PublicationAuthorWriteInput,
  PublicationPublicAuthorDetail,
} from "@/types"

const AUTHOR_META_PATTERN = /^(.*?)\s*\[tc-author:([^\]]+)\]\s*$/

export type PublicationAuthor = {
  name: string
  isTongClass?: boolean
  userId?: string
  username?: string
  institutePersonSlug?: string
  coFirst?: boolean
  corresponding?: boolean
}

type EncodedAuthorMeta = Omit<PublicationAuthor, "name">

export function normalizePublicationAuthorSearchValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function encodeMeta(meta: EncodedAuthorMeta) {
  return encodeURIComponent(JSON.stringify(meta))
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function isSafePersonSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

function normalizeMeta(value: unknown): EncodedAuthorMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const meta = value as Record<string, unknown>
  const userId = normalizeOptionalString(meta.userId)
  const username = normalizeOptionalString(meta.username)
  const institutePersonSlug = normalizeOptionalString(meta.institutePersonSlug)

  return {
    ...(meta.isTongClass === true && userId ? { isTongClass: true } : {}),
    ...(userId ? { userId } : {}),
    ...(username ? { username } : {}),
    ...(institutePersonSlug && isSafePersonSlug(institutePersonSlug)
      ? { institutePersonSlug }
      : {}),
    ...(meta.coFirst === true ? { coFirst: true } : {}),
    ...(meta.corresponding === true ? { corresponding: true } : {}),
  }
}

function decodeMeta(value: string): EncodedAuthorMeta | null {
  try {
    const decoded = decodeURIComponent(value)
    return normalizeMeta(JSON.parse(decoded))
  } catch {
    return null
  }
}

export function normalizePublicationAuthorWriteInput(
  author: PublicationAuthorWriteInput,
): PublicationAuthorWriteInput {
  const userId = normalizeOptionalString(author.userId)
  const username = normalizeOptionalString(author.username)
  const institutePersonSlug = normalizeOptionalString(author.institutePersonSlug)

  return {
    name: author.name.trim(),
    ...(userId ? { userId } : {}),
    ...(username ? { username } : {}),
    ...(institutePersonSlug && isSafePersonSlug(institutePersonSlug)
      ? { institutePersonSlug }
      : {}),
    ...(author.coFirst === true ? { coFirst: true } : {}),
    ...(author.corresponding === true ? { corresponding: true } : {}),
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

export function encodePublicationAuthor(author: PublicationAuthorWriteInput) {
  const normalized = normalizePublicationAuthorWriteInput(author)
  const { name } = normalized
  if (!name) return ""

  const meta: EncodedAuthorMeta = {
    ...(normalized.userId ? { isTongClass: true, userId: normalized.userId } : {}),
    ...(normalized.username ? { username: normalized.username } : {}),
    ...(normalized.institutePersonSlug
      ? { institutePersonSlug: normalized.institutePersonSlug }
      : {}),
    ...(normalized.coFirst ? { coFirst: true } : {}),
    ...(normalized.corresponding ? { corresponding: true } : {}),
  }

  if (Object.keys(meta).length === 0) {
    return name
  }

  return `${name} [tc-author:${encodeMeta(meta)}]`
}

export function toPublicPublicationAuthorDetail(
  value: string | PublicationAuthor,
): PublicationPublicAuthorDetail {
  const author = typeof value === "string" ? parsePublicationAuthor(value) : value
  const personSlug = normalizeOptionalString(author.institutePersonSlug)

  return {
    name: author.name.trim(),
    ...(author.coFirst === true ? { coFirst: true } : {}),
    ...(author.corresponding === true ? { corresponding: true } : {}),
    ...(personSlug && isSafePersonSlug(personSlug) ? { personSlug } : {}),
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
