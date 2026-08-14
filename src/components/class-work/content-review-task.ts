export type ContentReviewTaskCandidate = {
  _id: string
  isMine?: boolean
  status?: "pending" | "approved" | "rejected" | "skipped"
}

export function resolveMyContentReviewTask<T extends ContentReviewTaskCandidate>(
  tasks: T[] | undefined,
  myTaskId: string | undefined,
) {
  const pendingOwnedTask = tasks?.find((task) => (
    task.isMine === true && (task.status ?? "pending") === "pending"
  ))
  if (pendingOwnedTask) return pendingOwnedTask
  return myTaskId ? tasks?.find((task) => task._id === myTaskId) : undefined
}
