import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import {
  getReviewerAccessCredentials,
  reviewerAccessErrorMessage,
  reviewerAccessErrorStatus,
  toAcademicExchangeAccessArgs,
} from "../_lib/access"

export const runtime = "nodejs"

const listApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplicationsForReviewer")

export async function GET(request: NextRequest) {
  try {
    const credentials = getReviewerAccessCredentials(request)
    const client = getConvexHttpClient()
    const applications = await client.query(
      listApplicationsRef,
      toAcademicExchangeAccessArgs(credentials) as any,
    )
    return NextResponse.json({ ok: true, applications }, {
      headers: { "cache-control": "no-store" },
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: reviewerAccessErrorMessage(error, "当前账号没有 Reviewer 访问权限"),
    }, {
      status: reviewerAccessErrorStatus(error, 401),
    })
  }
}
