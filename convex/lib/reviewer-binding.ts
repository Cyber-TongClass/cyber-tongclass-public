/**
 * Pure policy for a teacher-derived Academic Reviewer capability.
 *
 * Callers must populate these fields from already-authenticated server-side
 * account records. This contract deliberately has no display-name or email
 * inputs: identity is established only by exact stored identifiers.
 *
 * Persistence is intentionally deferred until reviewerAccounts gains the
 * corresponding explicit link fields and indexes.
 */

export const teacherReviewerBindingMethods = ["super_admin", "dual_session"] as const

export type TeacherReviewerBindingMethod = typeof teacherReviewerBindingMethods[number]

export const bindingMethodAllowed = (method: string): method is TeacherReviewerBindingMethod => (
  method === "super_admin" || method === "dual_session"
)

export type ExplicitTeacherReviewerBinding = Readonly<{
  mainUserId: string
  reviewerAccountId: string
  teacherDerivedEnabled: boolean
  linkMethod: string
}>

export type TeacherReviewerCapabilityRequest = Readonly<{
  mainUserId: string | null | undefined
  mainIdentityType: string | null | undefined
  mainAccountActive: boolean
  reviewerAccountId: string | null | undefined
  reviewerAccountEnabled: boolean
  explicitBinding: ExplicitTeacherReviewerBinding | null | undefined
}>

export type TeacherReviewerCapabilityDecision =
  | Readonly<{
    allowed: true
    reviewerAccountId: string
    source: "teacher_derived"
  }>
  | Readonly<{
    allowed: false
    reason:
      | "NO_MAIN_USER"
      | "MAIN_IDENTITY_NOT_TEACHER"
      | "MAIN_ACCOUNT_DISABLED"
      | "NO_REVIEWER_ACCOUNT"
      | "REVIEWER_ACCOUNT_DISABLED"
      | "NO_EXPLICIT_BINDING"
      | "BINDING_METHOD_INVALID"
      | "BINDING_DISABLED"
      | "MAIN_USER_MISMATCH"
      | "REVIEWER_ACCOUNT_MISMATCH"
  }>

/**
 * Resolves a teacher-derived capability without ever inferring an identity.
 * Independent Reviewer login is intentionally outside this resolver.
 */
export function resolveTeacherReviewerCapability(
  request: TeacherReviewerCapabilityRequest,
): TeacherReviewerCapabilityDecision {
  if (!request.mainUserId) {
    return { allowed: false, reason: "NO_MAIN_USER" }
  }

  if (request.mainIdentityType !== "teacher") {
    return { allowed: false, reason: "MAIN_IDENTITY_NOT_TEACHER" }
  }

  if (!request.mainAccountActive) {
    return { allowed: false, reason: "MAIN_ACCOUNT_DISABLED" }
  }

  if (!request.reviewerAccountId) {
    return { allowed: false, reason: "NO_REVIEWER_ACCOUNT" }
  }

  if (!request.reviewerAccountEnabled) {
    return { allowed: false, reason: "REVIEWER_ACCOUNT_DISABLED" }
  }

  const binding = request.explicitBinding
  if (!binding) {
    return { allowed: false, reason: "NO_EXPLICIT_BINDING" }
  }

  if (!bindingMethodAllowed(binding.linkMethod)) {
    return { allowed: false, reason: "BINDING_METHOD_INVALID" }
  }

  if (!binding.teacherDerivedEnabled) {
    return { allowed: false, reason: "BINDING_DISABLED" }
  }

  if (binding.mainUserId !== request.mainUserId) {
    return { allowed: false, reason: "MAIN_USER_MISMATCH" }
  }

  if (binding.reviewerAccountId !== request.reviewerAccountId) {
    return { allowed: false, reason: "REVIEWER_ACCOUNT_MISMATCH" }
  }

  return {
    allowed: true,
    reviewerAccountId: request.reviewerAccountId,
    source: "teacher_derived",
  }
}
