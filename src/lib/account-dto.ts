/** Keep existing account editors compatible with authenticated DTOs.
 * Public DTOs deliberately have no ID; never derive one from a username.
 */
export function withAccountId<T extends { id?: string; _id?: string }>(value: T): T {
  return typeof value.id === "string" && value.id.length > 0
    ? { ...value, _id: value.id }
    : value
}
