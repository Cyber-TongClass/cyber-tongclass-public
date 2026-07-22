export type AuthorizationEffect = "allow" | "deny"

export type AuthorizationCandidate = Readonly<{
  effect: AuthorizationEffect
  specificity: number
}>

export type AuthorizationDecision =
  | { allowed: false; reason: "NO_MATCH" | "DENY" }
  | { allowed: true; reason: "ALLOW" }

/**
 * Resolves a set of matching authorization candidates without accessing
 * application state. More-specific candidates take precedence; a deny wins
 * any tie at the highest specificity.
 */
export function decideAuthorization(
  candidates: readonly AuthorizationCandidate[],
): AuthorizationDecision {
  if (candidates.length === 0) {
    return { allowed: false, reason: "NO_MATCH" }
  }

  let highestSpecificity: number | undefined
  let highestEffect: AuthorizationEffect | undefined

  for (const candidate of candidates) {
    if (highestSpecificity === undefined || candidate.specificity > highestSpecificity) {
      highestSpecificity = candidate.specificity
      highestEffect = candidate.effect
      continue
    }

    if (candidate.specificity === highestSpecificity && candidate.effect === "deny") {
      highestEffect = "deny"
    }
  }

  return highestEffect === "deny"
    ? { allowed: false, reason: "DENY" }
    : { allowed: true, reason: "ALLOW" }
}
