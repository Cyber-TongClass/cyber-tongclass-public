/** Tong Class accepts only explicitly assigned undergraduate identities. */
export const UNDERGRADUATE_ONLY_MESSAGE = "通班官网仅对本科生开放"

export function isUndergraduate(value: unknown): boolean {
  return !!value && typeof value === "object" &&
    (value as { identityType?: unknown }).identityType === "undergrad"
}

export function restrictToUndergraduate<T>(value: T): T | null {
  if (value === undefined) return value
  return isUndergraduate(value) ? value : null
}

/** Login responses omit identityType; verify the authoritative session first. */
export async function verifyUndergraduateLogin<T extends { sessionToken?: string }>(
  result: T,
  readSession: (token: string) => Promise<unknown>,
): Promise<T> {
  if (!result?.sessionToken || !isUndergraduate(await readSession(result.sessionToken))) {
    throw new Error(UNDERGRADUATE_ONLY_MESSAGE)
  }
  return result
}
