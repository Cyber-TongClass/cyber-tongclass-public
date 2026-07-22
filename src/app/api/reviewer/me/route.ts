import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"
import {
  getReviewerAccessCredentials,
  reviewerAccessErrorMessage,
  reviewerAccessErrorStatus,
  toAcademicExchangeAccessArgs,
} from "../_lib/access"

export const runtime = "nodejs"

const currentRef = makeFunctionReference<"query">("reviewerAuth:current")
const listApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplicationsForReviewer")
const noStoreHeaders = { "cache-control": "no-store" }

function expireReviewerCookie(response: NextResponse) {
  response.cookies.set(REVIEWER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}

/**
 * Resolves the active display mode without turning a main-site teacher into a
 * Reviewer session. The teacher-derived response intentionally contains no
 * bound Reviewer account identity; the backend binding is rechecked by every
 * academic-exchange request.
 */
export async function GET(request: NextRequest) {
  try {
    const credentials = getReviewerAccessCredentials(request)
    const client = getConvexHttpClient()

    if (credentials.source === "independent") {
      const reviewer = await client.query(currentRef, {
        sessionToken: credentials.reviewerSessionToken,
      } as any)

      if (!reviewer) {
        return expireReviewerCookie(NextResponse.json({
          ok: false,
          reviewer: null,
          message: "Reviewer 登录已过期，请重新登录",
        }, { status: 401, headers: noStoreHeaders }))
      }

      return NextResponse.json({
        ok: true,
        accessMode: "independent",
        reviewer,
      }, { headers: noStoreHeaders })
    }

    // There is no server-side Reviewer cookie in this mode. This query is an
    // authorization probe only; its data is deliberately discarded.
    await client.query(listApplicationsRef, toAcademicExchangeAccessArgs(credentials) as any)
    return NextResponse.json({
      ok: true,
      accessMode: "teacher_derived",
      reviewer: null,
    }, { headers: noStoreHeaders })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      reviewer: null,
      message: reviewerAccessErrorMessage(error, "当前账号没有 Reviewer 授权"),
    }, {
      status: reviewerAccessErrorStatus(error, 401),
      headers: noStoreHeaders,
    })
  }
}
