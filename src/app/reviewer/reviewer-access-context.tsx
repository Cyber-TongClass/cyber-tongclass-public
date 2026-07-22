"use client"

import { createContext, useContext } from "react"
import { REVIEWER_MAIN_SESSION_HEADER, type ReviewerAccessMode } from "./reviewer-access-constants"

export type ReviewerAccess = Readonly<{
  mode: ReviewerAccessMode
  mainSessionToken?: string
}>

const ReviewerAccessContext = createContext<ReviewerAccess | null>(null)

export function ReviewerAccessProvider({
  value,
  children,
}: {
  value: ReviewerAccess
  children: React.ReactNode
}) {
  return (
    <ReviewerAccessContext.Provider value={value}>
      {children}
    </ReviewerAccessContext.Provider>
  )
}

export function useReviewerAccess() {
  const access = useContext(ReviewerAccessContext)
  if (!access) {
    throw new Error("Reviewer access context is unavailable")
  }
  return access
}

/** Adds a bearer header only for the already-verified teacher-derived path. */
export function reviewerAccessHeaders(access: ReviewerAccess, headers?: HeadersInit) {
  const next = new Headers(headers)
  if (access.mode === "teacher_derived") {
    if (!access.mainSessionToken) {
      throw new Error("教师 Reviewer 授权会话不可用")
    }
    next.set(REVIEWER_MAIN_SESSION_HEADER, access.mainSessionToken)
  }
  return next
}
