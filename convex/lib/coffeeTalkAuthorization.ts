import type { CoffeeTalkActorKind } from "./coffeeTalk"

export type CoffeeTalkRole = "member" | "admin" | "super_admin"

export type CoffeeTalkActorResolutionInput = {
  actorUserId: string
  actorRole: CoffeeTalkRole
  coordinatorAllowed?: boolean
  applicantUserId: string
  /** Derived exclusively from the assigned institute person's accountUserId. */
  assignedTeacherUserId?: string
}

/**
 * Chooses an actor capability from server-derived account bindings. A teacher
 * label from the client is never an authority source; only the explicit
 * institute-person/account binding grants the teacher capability.
 */
export function resolveCoffeeTalkActorKind(
  input: CoffeeTalkActorResolutionInput,
): CoffeeTalkActorKind | null {
  if (
    input.actorRole === "super_admin"
    || (input.actorRole === "admin" && input.coordinatorAllowed === true)
  ) {
    return "coordinator"
  }
  if (input.actorUserId === input.applicantUserId) {
    return "applicant"
  }
  if (
    input.assignedTeacherUserId !== undefined
    && input.actorUserId === input.assignedTeacherUserId
  ) {
    return "teacher"
  }
  return null
}
