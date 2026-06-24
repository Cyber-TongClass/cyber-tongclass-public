import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"

export const runtime = "nodejs"

const listApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplicationsForReviewer")

export async function GET(request: NextRequest) {
  try {
    const reviewerSessionToken = request.cookies.get(REVIEWER_SESSION_COOKIE)?.value || ""
    if (!reviewerSessionToken) {
      return NextResponse.json({ ok: false, message: "请先登录 Reviewer 账号" }, { status: 401 })
    }

    const client = getConvexHttpClient()
    const applications = await client.query(listApplicationsRef, { reviewerSessionToken } as any)
    return NextResponse.json({ ok: true, applications })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "无法读取申请列表",
    }, { status: 401 })
  }
}
