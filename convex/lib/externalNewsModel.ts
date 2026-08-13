export const EXTERNAL_NEWS_HOSTS = new Set(["www.ai.pku.edu.cn"])

export type ExternalNewsSourceKey =
  | "news"
  | "notices"
  | "research_progress"
  | "academic_lectures"

export type ExternalNewsFailureCode =
  | "invalid_url"
  | "blocked_host"
  | "redirect_blocked"
  | "timeout"
  | "response_too_large"
  | "invalid_content_type"
  | "http_error"
  | "list_parse_failed"
  | "detail_parse_failed"
  | "empty_reviewer_set"
  | "ingest_failed"

export type ExternalNewsReviewDecision = "accept" | "request_changes" | "reject"

export type ExternalNewsReviewTaskStatus =
  | "pending"
  | "accepted"
  | "changes_requested"
  | "rejected"
  | "skipped"

const TRACKING_PARAMETER = /^(?:utm_.+|spm|from|source|fbclid|gclid)$/i

export function canonicalizeExternalNewsUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("外网新闻来源 URL 无效")
  }
  if (url.protocol !== "https:") throw new Error("外网新闻来源必须使用 HTTPS")
  if (!EXTERNAL_NEWS_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("外网新闻来源域名不在白名单")
  }

  url.hostname = url.hostname.toLowerCase()
  url.hash = ""
  url.pathname = url.pathname.replace(/\/{2,}/g, "/")
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETER.test(key)) url.searchParams.delete(key)
  }
  url.searchParams.sort()
  return url.toString().replace(/\?$/, "")
}

export function externalNewsIdentity(sourceKey: ExternalNewsSourceKey, canonicalUrl: string): string {
  return `${sourceKey}:${canonicalizeExternalNewsUrl(canonicalUrl)}`
}

export async function sourceSnapshotHash(input: {
  title: string
  markdown: string
  sourcePublishedAt?: number
}): Promise<string> {
  const normalized = JSON.stringify({
    title: input.title.trim().replace(/\s+/g, " "),
    markdown: input.markdown.replace(/\r\n?/g, "\n").trim(),
    sourcePublishedAt: input.sourcePublishedAt ?? null,
  })
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export function decideExternalReview(
  tasks: readonly { id: string; status: ExternalNewsReviewTaskStatus }[],
  actedTaskId: string,
  decision: ExternalNewsReviewDecision,
) {
  const actor = tasks.find((task) => task.id === actedTaskId)
  if (!actor || (actor.status !== "pending" && actor.status !== "changes_requested")) {
    throw new Error("该审阅任务已处理")
  }

  const actedStatus =
    decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "changes_requested"

  return {
    sourceReviewStatus:
      decision === "accept" ? "accepted" as const
        : decision === "reject" ? "rejected" as const
          : "needs_changes" as const,
    nextStage:
      decision === "accept" ? "publication_approval" as const
        : decision === "reject" ? "complete" as const
          : "source_review" as const,
    taskUpdates: tasks
      .filter((task) => task.id === actedTaskId || task.status === "pending")
      .map((task) => ({
        id: task.id,
        status: task.id === actedTaskId ? actedStatus : "skipped" as const,
      })),
  }
}

export function intersectActiveReviewers(
  resolvedIds: readonly string[],
  grants: readonly { id: string; canReview: boolean; disabled: boolean }[],
): string[] {
  const eligible = new Set(
    grants
      .filter((grant) => grant.canReview && !grant.disabled)
      .map((grant) => String(grant.id)),
  )
  return [...new Set(resolvedIds.map(String))].filter((id) => eligible.has(id))
}
