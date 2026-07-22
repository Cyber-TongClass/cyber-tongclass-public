export const coffeeTalkStatuses = [
  "submitted",
  "under_review",
  "needs_information",
  "accepted",
  "declined",
  "withdrawn",
  "cancelled",
  "completed",
] as const

export type CoffeeTalkStatus = (typeof coffeeTalkStatuses)[number]

export const coffeeTalkActorKinds = [
  "applicant",
  "teacher",
  "coordinator",
  "system",
] as const

export type CoffeeTalkActorKind = (typeof coffeeTalkActorKinds)[number]

export const coffeeTalkActions = [
  "start_review",
  "request_information",
  "supplement",
  "accept",
  "decline",
  "withdraw",
  "cancel",
  "complete",
  "reassign",
  "correct",
] as const

export type CoffeeTalkAction = (typeof coffeeTalkActions)[number]

export const COFFEE_TALK_TRANSITION_FORBIDDEN = "COFFEE_TALK_TRANSITION_FORBIDDEN"
export const COFFEE_TALK_FINGERPRINT_INPUT_INVALID = "COFFEE_TALK_FINGERPRINT_INPUT_INVALID"
export const COFFEE_TALK_FINGERPRINT_UNAVAILABLE = "COFFEE_TALK_FINGERPRINT_UNAVAILABLE"

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value)
}

export function isCoffeeTalkStatus(value: unknown): value is CoffeeTalkStatus {
  return isOneOf(coffeeTalkStatuses, value)
}

export function isCoffeeTalkActorKind(value: unknown): value is CoffeeTalkActorKind {
  return isOneOf(coffeeTalkActorKinds, value)
}

export function isCoffeeTalkAction(value: unknown): value is CoffeeTalkAction {
  return isOneOf(coffeeTalkActions, value)
}

const terminalStatuses = new Set<CoffeeTalkStatus>([
  "declined",
  "withdrawn",
  "cancelled",
  "completed",
])

function forbiddenTransition(): never {
  throw new Error(COFFEE_TALK_TRANSITION_FORBIDDEN)
}

/** Returns whether an application can still receive a state-changing action. */
export function isCoffeeTalkOpen(status: CoffeeTalkStatus): boolean {
  return !terminalStatuses.has(status)
}

function permittedTransition(
  status: CoffeeTalkStatus,
  actorKind: CoffeeTalkActorKind,
  action: CoffeeTalkAction,
): CoffeeTalkStatus | undefined {
  if (!isCoffeeTalkOpen(status)) {
    return undefined
  }

  if (actorKind === "applicant") {
    if (status === "needs_information" && action === "supplement") {
      return "submitted"
    }
    if (action === "withdraw") {
      return "withdrawn"
    }
    return undefined
  }

  if (actorKind === "teacher") {
    if (status === "submitted" && action === "start_review") {
      return "under_review"
    }
    if (status === "under_review" && action === "request_information") {
      return "needs_information"
    }
    if (status === "under_review" && action === "accept") {
      return "accepted"
    }
    if (status === "under_review" && action === "decline") {
      return "declined"
    }
    if (status === "accepted" && action === "complete") {
      return "completed"
    }
    return undefined
  }

  if (actorKind === "coordinator") {
    if (action === "cancel") {
      return "cancelled"
    }
    if (action === "reassign" || action === "correct") {
      return status
    }
  }

  return undefined
}

/**
 * Applies the only allowed status transition for a Coffee Talk action.
 * Caller authentication and record-level authorization remain the responsibility
 * of the persistence layer.
 */
export function transitionCoffeeTalk(
  status: CoffeeTalkStatus,
  actorKind: CoffeeTalkActorKind,
  action: CoffeeTalkAction,
): CoffeeTalkStatus {
  return permittedTransition(status, actorKind, action) ?? forbiddenTransition()
}

/** Lists actions in the declared action order, without exposing a bypass action. */
export function allowedCoffeeTalkActions(
  status: CoffeeTalkStatus,
  actorKind: CoffeeTalkActorKind,
): CoffeeTalkAction[] {
  return coffeeTalkActions.filter((action) =>
    permittedTransition(status, actorKind, action) !== undefined,
  )
}

function fingerprintInputError(): never {
  throw new Error(COFFEE_TALK_FINGERPRINT_INPUT_INVALID)
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Produces a JSON-compatible canonical payload by sorting every object level
 * and trimming every string value. Object `undefined` values are omitted and
 * array `undefined` values are represented as `null`, matching JSON semantics.
 */
function canonicalizeCoffeeTalkValue(
  value: unknown,
  ancestors: Set<object>,
): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value)
  }
  if (typeof value === "string") {
    return JSON.stringify(value.trim())
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return fingerprintInputError()
    }
    return JSON.stringify(value)
  }
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    return fingerprintInputError()
  }
  if (typeof value !== "object" || !isPlainObject(value) && !Array.isArray(value)) {
    return fingerprintInputError()
  }
  if (ancestors.has(value)) {
    return fingerprintInputError()
  }

  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      const items = value.map((item) => canonicalizeCoffeeTalkValue(item, ancestors) ?? "null")
      return `[${items.join(",")}]`
    }

    const entries: string[] = []
    for (const key of Object.keys(value).sort()) {
      const canonicalValue = canonicalizeCoffeeTalkValue(value[key], ancestors)
      if (canonicalValue !== undefined) {
        entries.push(`${JSON.stringify(key)}:${canonicalValue}`)
      }
    }
    return `{${entries.join(",")}}`
  } finally {
    ancestors.delete(value)
  }
}

/**
 * Exposes the stable, non-secret input to the fingerprint hash. It is useful
 * when callers need to compare canonical request data before hashing it.
 */
export function canonicalCoffeeTalkRequestPayload(input: unknown): string {
  const payload = canonicalizeCoffeeTalkValue(input, new Set<object>())
  if (payload === undefined) {
    return fingerprintInputError()
  }
  return payload
}

function getWebCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error(COFFEE_TALK_FINGERPRINT_UNAVAILABLE)
  }
  return globalThis.crypto
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Hashes canonical request content with Web Crypto, which is available in the
 * supported runtime and does not require a Node-only crypto import.
 */
export async function requestFingerprint(input: unknown): Promise<string> {
  const payload = canonicalCoffeeTalkRequestPayload(input)
  const digest = await getWebCrypto().subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  )
  return bytesToHex(new Uint8Array(digest))
}

export type CoffeeTalkNotificationContent = Readonly<{
  title: string
  body: string
}>

export const coffeeTalkNotificationTitle = "Coffee Talk 申请状态更新"
export const coffeeTalkNotificationBody = "请查看 Coffee Talk 申请的最新状态。"

/** Returns generic display text that cannot disclose application content. */
export function coffeeTalkNotificationContent(): CoffeeTalkNotificationContent {
  return {
    title: coffeeTalkNotificationTitle,
    body: coffeeTalkNotificationBody,
  }
}

export type CoffeeTalkAvailabilityWindow = Readonly<{
  startAt: number
  endAt: number
}>

export type CoffeeTalkContactSnapshot = Readonly<{
  displayName?: string
  email?: string
}>

export type CoffeeTalkTeacherRedactionInput = Readonly<{
  status: CoffeeTalkStatus
  topic?: string
  purpose?: string
  researchBackground?: string
  expectedOutcome?: string
  preferredFormat?: "in_person" | "online" | "either"
  availabilityWindows?: readonly CoffeeTalkAvailabilityWindow[]
  referenceUrls?: readonly string[]
  contactSnapshot?: CoffeeTalkContactSnapshot
  createdAt?: number
  submittedAt?: number
  updatedAt?: number
  statusChangedAt?: number
  version?: number
}>

export type CoffeeTalkTeacherApplicationDto = {
  status: CoffeeTalkStatus
  topic?: string
  purpose?: string
  researchBackground?: string
  expectedOutcome?: string
  preferredFormat?: "in_person" | "online" | "either"
  availabilityWindows?: CoffeeTalkAvailabilityWindow[]
  referenceUrls?: string[]
  createdAt?: number
  submittedAt?: number
  updatedAt?: number
  statusChangedAt?: number
  version?: number
  contact: {
    displayName?: string
    email?: string
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function copyAvailabilityWindows(
  windows: readonly CoffeeTalkAvailabilityWindow[] | undefined,
): CoffeeTalkAvailabilityWindow[] | undefined {
  return windows?.map((window) => ({
    startAt: window.startAt,
    endAt: window.endAt,
  }))
}

function copyReferenceUrls(urls: readonly string[] | undefined): string[] | undefined {
  return urls?.filter((url): url is string => typeof url === "string")
}

/** Only accepted and completed applications reveal applicant email to a teacher. */
export function canTeacherViewCoffeeTalkContact(status: CoffeeTalkStatus): boolean {
  return status === "accepted" || status === "completed"
}

/**
 * Creates an explicit teacher DTO instead of returning a raw application
 * document. Internal IDs, receipts, fingerprints, and unapproved contact data
 * are deliberately omitted.
 */
export function redactCoffeeTalkForTeacher(
  application: CoffeeTalkTeacherRedactionInput,
): CoffeeTalkTeacherApplicationDto {
  const contactSnapshot = application.contactSnapshot
  const contact: CoffeeTalkTeacherApplicationDto["contact"] = {}
  const displayName = optionalString(contactSnapshot?.displayName)
  const email = optionalString(contactSnapshot?.email)

  if (displayName !== undefined) {
    contact.displayName = displayName
  }
  if (canTeacherViewCoffeeTalkContact(application.status) && email !== undefined) {
    contact.email = email
  }

  const topic = optionalString(application.topic)
  const purpose = optionalString(application.purpose)
  const researchBackground = optionalString(application.researchBackground)
  const expectedOutcome = optionalString(application.expectedOutcome)
  const preferredFormat = application.preferredFormat
  const availabilityWindows = copyAvailabilityWindows(application.availabilityWindows)
  const referenceUrls = copyReferenceUrls(application.referenceUrls)
  const createdAt = optionalNumber(application.createdAt)
  const submittedAt = optionalNumber(application.submittedAt)
  const updatedAt = optionalNumber(application.updatedAt)
  const statusChangedAt = optionalNumber(application.statusChangedAt)
  const version = optionalNumber(application.version)

  return {
    status: application.status,
    ...(topic !== undefined ? { topic } : {}),
    ...(purpose !== undefined ? { purpose } : {}),
    ...(researchBackground !== undefined ? { researchBackground } : {}),
    ...(expectedOutcome !== undefined ? { expectedOutcome } : {}),
    ...(preferredFormat !== undefined ? { preferredFormat } : {}),
    ...(availabilityWindows !== undefined ? { availabilityWindows } : {}),
    ...(referenceUrls !== undefined ? { referenceUrls } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
    ...(submittedAt !== undefined ? { submittedAt } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    ...(statusChangedAt !== undefined ? { statusChangedAt } : {}),
    ...(version !== undefined ? { version } : {}),
    contact,
  }
}
