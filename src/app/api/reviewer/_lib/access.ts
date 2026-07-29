import { NextRequest } from "next/server"
import { REVIEWER_MAIN_SESSION_HEADER } from "@/app/reviewer/reviewer-access-constants"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"

export type ReviewerAccessCredentialSource = "independent" | "teacher_derived"

export type ReviewerAccessCredentials = Readonly<{
  source: ReviewerAccessCredentialSource
  reviewerSessionToken?: string
  mainSessionToken?: string
}>

export class ReviewerAccessRequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 = 401,
  ) {
    super(message)
    this.name = "ReviewerAccessRequestError"
  }
}

/**
 * Selects one credential for the reviewer surface. Cookies are HttpOnly and
 * main-session tokens are accepted only through the explicit same-origin
 * request header; neither value is logged or echoed back to the client.
 */
export function getReviewerAccessCredentials(request: NextRequest): ReviewerAccessCredentials {
  const reviewerSessionToken = request.cookies.get(REVIEWER_SESSION_COOKIE)?.value || ""
  const mainSessionToken = request.headers.get(REVIEWER_MAIN_SESSION_HEADER)?.trim() || ""

  if (reviewerSessionToken && mainSessionToken) {
    throw new ReviewerAccessRequestError("不能同时使用 Reviewer 登录和主站教师授权", 400)
  }

  if (reviewerSessionToken) {
    return { source: "independent", reviewerSessionToken }
  }

  if (mainSessionToken) {
    return { source: "teacher_derived", mainSessionToken }
  }

  throw new ReviewerAccessRequestError("请先登录 Reviewer 账号或使用已授权的教师主站账号", 401)
}

export function toAcademicExchangeAccessArgs(credentials: ReviewerAccessCredentials) {
  return credentials.source === "independent"
    ? { reviewerSessionToken: credentials.reviewerSessionToken }
    : { mainSessionToken: credentials.mainSessionToken }
}

export function reviewerAccessErrorStatus(error: unknown, fallbackStatus: 400 | 401 | 500 = 401) {
  return error instanceof ReviewerAccessRequestError ? error.status : fallbackStatus
}

export function reviewerAccessErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof ReviewerAccessRequestError ? error.message : fallbackMessage
}
