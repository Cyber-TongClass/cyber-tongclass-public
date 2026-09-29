/** Directory visibility is separate from permission to log in. */
export function isDirectoryAccount(value: any): boolean {
  return value?.identityType === "undergrad" || value?.cohort === "mascot"
}

export function mergeDirectoryMembers(students: any[] | undefined, mascots: any[] | undefined, skip = 0, limit = 50): any[] | undefined {
  if (students === undefined || mascots === undefined) return undefined
  const unique = new Map<string, any>()
  for (const user of [...students, ...mascots.filter(user => user.cohort === "mascot")]) {
    unique.set(String(user.id || user._id || user.username), user)
  }
  return [...unique.values()].slice(skip, skip + limit)
}
