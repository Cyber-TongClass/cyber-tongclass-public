import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"

export const runtime = "nodejs"

const getApplicationRef = makeFunctionReference<"query">("academicExchange:getApplicationForReviewer")

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const reviewerSessionToken = request.cookies.get(REVIEWER_SESSION_COOKIE)?.value || ""
    if (!reviewerSessionToken) {
      return NextResponse.json({ ok: false, message: "请先登录 Reviewer 账号" }, { status: 401 })
    }

    const params = await context.params
    const client = getConvexHttpClient()
    const application = await client.query(getApplicationRef, {
      reviewerSessionToken,
      id: params.id as any,
    } as any)

    if (!application) {
      return NextResponse.json({ ok: false, message: "未找到申请记录" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, application })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "无法读取申请详情",
    }, { status: 401 })
  }
}
