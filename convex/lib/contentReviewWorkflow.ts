export type ContentReviewDecision = "approved" | "rejected"
export type ContentReviewTaskStatus = ContentReviewDecision | "pending" | "skipped"

type ReviewTask = {
  id: string
  status: ContentReviewTaskStatus
}

type ReviewerCandidate = {
  id: string
  disabled: boolean
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    )
  }
  return value
}

/** A compact deterministic fingerprint; it detects accidental key reuse. */
export function contentSubmissionFingerprint(value: unknown): string {
  const input = JSON.stringify(canonicalize(value))
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `v1:${(hash >>> 0).toString(16).padStart(8, "0")}:${input.length}`
}

export type ContentReviewStage = "source_review" | "publication_approval"

export function contentReviewTaskNaturalKey(
  submissionId: unknown,
  reviewerId: unknown,
  stage: ContentReviewStage = "publication_approval",
): string {
  return `content-review:${String(submissionId)}:${stage}:reviewer:${String(reviewerId)}`
}

/** Preserves manager query order while removing disabled and duplicate accounts. */
export function uniqueEligibleReviewerIds(
  candidates: readonly ReviewerCandidate[],
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const candidate of candidates) {
    const id = String(candidate.id)
    if (!id || candidate.disabled || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

/**
 * Computes one atomic panel transition. Any eligible reviewer can finish the
 * review; the first decision wins and every other pending task is retained as
 * a skipped audit record.
 */
export function decideContentReviewOutcome(
  tasks: readonly ReviewTask[],
  actedTaskId: unknown,
  decision: ContentReviewDecision,
): {
  outcome: "pending" | ContentReviewDecision
  taskUpdates: Array<{ id: string; status: ContentReviewTaskStatus }>
} {
  const taskId = String(actedTaskId)
  const actedTask = tasks.find((task) => String(task.id) === taskId)
  if (!actedTask) throw new Error("审核任务不存在")
  if (actedTask.status !== "pending") throw new Error("该审核任务已处理")

  return {
    outcome: decision,
    taskUpdates: tasks
      .filter((task) => task.status === "pending")
      .map((task) => ({
        id: String(task.id),
        status: String(task.id) === taskId ? decision : "skipped",
      })),
  }
}
