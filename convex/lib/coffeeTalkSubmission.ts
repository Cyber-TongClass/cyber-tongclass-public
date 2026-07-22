export const coffeeTalkApplicantIdentities = [
  "undergraduate",
  "graduate",
  "other",
] as const

export type CoffeeTalkApplicantIdentity = (typeof coffeeTalkApplicantIdentities)[number]

export type CoffeeTalkSubmissionInput = {
  applicantName: string
  affiliation: string
  identity: string
  email: string
  teacherSlug: string
  topic: string
  availability: string
  notes?: string
}

export type NormalizedCoffeeTalkSubmission = {
  applicantName: string
  affiliation: string
  identity: CoffeeTalkApplicantIdentity
  email: string
  teacherSlug: string
  topic: string
  availability: string
  notes?: string
}

export const COFFEE_TALK_REQUIRED_FIELD = "COFFEE_TALK_REQUIRED_FIELD"
export const COFFEE_TALK_EMAIL_INVALID = "COFFEE_TALK_EMAIL_INVALID"
export const COFFEE_TALK_IDENTITY_INVALID = "COFFEE_TALK_IDENTITY_INVALID"
export const COFFEE_TALK_TEACHER_INVALID = "COFFEE_TALK_TEACHER_INVALID"
export const COFFEE_TALK_FIELD_TOO_LONG = "COFFEE_TALK_FIELD_TOO_LONG"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeRequired(value: string, maximumLength: number): string {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(COFFEE_TALK_REQUIRED_FIELD)
  }
  if (normalized.length > maximumLength) {
    throw new Error(COFFEE_TALK_FIELD_TOO_LONG)
  }
  return normalized
}

function normalizeOptional(value: string | undefined, maximumLength: number): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  if (normalized.length > maximumLength) {
    throw new Error(COFFEE_TALK_FIELD_TOO_LONG)
  }
  return normalized
}

function normalizeIdentity(value: string): CoffeeTalkApplicantIdentity {
  if ((coffeeTalkApplicantIdentities as readonly string[]).includes(value)) {
    return value as CoffeeTalkApplicantIdentity
  }
  throw new Error(COFFEE_TALK_IDENTITY_INVALID)
}

function normalizeEmail(value: string): string {
  const normalized = normalizeRequired(value, 320).toLowerCase()
  if (!emailPattern.test(normalized)) {
    throw new Error(COFFEE_TALK_EMAIL_INVALID)
  }
  return normalized
}

function normalizeTeacherSlug(value: string): string {
  const normalized = normalizeRequired(value, 120).toLowerCase()
  if (!slugPattern.test(normalized)) {
    throw new Error(COFFEE_TALK_TEACHER_INVALID)
  }
  return normalized
}

/**
 * Canonicalizes the first-release Coffee Talk form before it is fingerprinted
 * or stored. It intentionally accepts textual availability only: there is no
 * calendar, booking, attachment, chat, or WeChat integration in this release.
 */
export function normalizeCoffeeTalkSubmission(
  input: CoffeeTalkSubmissionInput,
): NormalizedCoffeeTalkSubmission {
  const normalized: NormalizedCoffeeTalkSubmission = {
    applicantName: normalizeRequired(input.applicantName, 160),
    affiliation: normalizeRequired(input.affiliation, 240),
    identity: normalizeIdentity(input.identity),
    email: normalizeEmail(input.email),
    teacherSlug: normalizeTeacherSlug(input.teacherSlug),
    topic: normalizeRequired(input.topic, 240),
    availability: normalizeRequired(input.availability, 2_000),
  }

  const notes = normalizeOptional(input.notes, 4_000)
  if (notes !== undefined) normalized.notes = notes
  return normalized
}
