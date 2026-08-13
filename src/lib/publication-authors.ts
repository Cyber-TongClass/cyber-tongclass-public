import type {
  Publication,
  PublicationAuthorInput,
  PublicPublicationAuthor,
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

function normalizeSafeSlug(value: unknown) {
  const normalized = normalizeOptionalString(value)?.toLowerCase()
  return normalized && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)
    ? normalized
    : undefined
}

function normalizeMeta(value: unknown): EncodedAuthorMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const meta = value as Record<string, unknown>
  const userId = normalizeOptionalString(meta.userId)
  const username = normalizeOptionalString(meta.username)
  const institutePersonSlug = normalizeSafeSlug(meta.institutePersonSlug)

  return {
    ...(typeof meta.isTongClass === "boolean" ? { isTongClass: meta.isTongClass } : {}),
    ...(userId ? { userId } : {}),
    ...(username ? { username } : {}),
    ...(institutePersonSlug ? { institutePersonSlug } : {}),
    ...(typeof meta.coFirst === "boolean" ? { coFirst: meta.coFirst } : {}),
    ...(typeof meta.corresponding === "boolean"
      ? { corresponding: meta.corresponding }
      : {}),
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

function normalizePublicationAuthor(author: PublicationAuthor): PublicationAuthor {
  const userId = normalizeOptionalString(author.userId)
  const username = normalizeOptionalString(author.username)
  const institutePersonSlug = normalizeSafeSlug(author.institutePersonSlug)
  const hasTongIdentity = author.isTongClass === true && Boolean(userId)

  return {
    name: author.name.trim(),
    ...(hasTongIdentity ? { isTongClass: true, userId } : {}),
    ...(username ? { username } : {}),
    ...(institutePersonSlug ? { institutePersonSlug } : {}),
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

export function encodePublicationAuthor(author: PublicationAuthor) {
  const normalized = normalizePublicationAuthor(author)
  const { name } = normalized
  if (!name) return ""

  const meta: EncodedAuthorMeta = {
    ...(normalized.isTongClass && normalized.userId
      ? { isTongClass: true, userId: normalized.userId }
      : {}),
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

export function toPublicationAuthorInput(author: PublicationAuthor): PublicationAuthorInput {
  const normalized = normalizePublicationAuthor(author)
  const hasTongIdentity = normalized.isTongClass === true && Boolean(normalized.userId)

  return {
    snapshot: encodePublicationAuthor(normalized),
    name: normalized.name,
    coFirst: normalized.coFirst === true,
    corresponding: normalized.corresponding === true,
    ...(hasTongIdentity && normalized.userId
      ? { tongClassUserId: normalized.userId }
      : {}),
    ...(hasTongIdentity && normalized.username
      ? { tongClassUsername: normalized.username }
      : {}),
    ...(normalized.institutePersonSlug
      ? { institutePersonSlug: normalized.institutePersonSlug }
      : {}),
  }
}

export function toPublicPublicationAuthor(author: PublicationAuthor): PublicPublicationAuthor {
  const normalized = normalizePublicationAuthor(author)
  const tongClassSlug = normalizeSafeSlug(normalized.username)
  const profile = normalized.institutePersonSlug
    ? { kind: "institute_person" as const, slug: normalized.institutePersonSlug }
    : normalized.isTongClass && normalized.userId && tongClassSlug
      ? { kind: "tong_class_member" as const, slug: tongClassSlug }
      : undefined

  return {
    name: normalized.name,
    coFirst: normalized.coFirst === true,
    corresponding: normalized.corresponding === true,
    ...(profile ? { profile } : {}),
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
