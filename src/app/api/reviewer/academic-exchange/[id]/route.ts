import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import {
  getReviewerAccessCredentials,
  reviewerAccessErrorMessage,
  reviewerAccessErrorStatus,
  toAcademicExchangeAccessArgs,
} from "../../_lib/access"

export const runtime = "nodejs"

const getApplicationRef = makeFunctionReference<"query">("academicExchange:getApplicationForReviewer")
const reviewApplicationRef = makeFunctionReference<"mutation">("academicExchange:reviewApplicationForReviewer")

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const credentials = getReviewerAccessCredentials(request)
    const params = await context.params
    const client = getConvexHttpClient()
    const application = await client.query(getApplicationRef, {
      ...toAcademicExchangeAccessArgs(credentials),
      id: params.id as any,
    } as any)

    if (!application) {
      return NextResponse.json({ ok: false, message: "未找到申请记录" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, application }, {
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const credentials = getReviewerAccessCredentials(request)
    const params = await context.params
    const payload = await request.json()
    const action = payload?.action
    if (!["start_review", "request_changes", "approve", "reject"].includes(action)) {
      return NextResponse.json({ ok: false, message: "审核动作无效" }, { status: 400 })
    }
    const client = getConvexHttpClient()
    const application = await client.mutation(reviewApplicationRef, {
      ...toAcademicExchangeAccessArgs(credentials),
      id: params.id as any,
      action,
      note: typeof payload?.note === "string" ? payload.note : undefined,
    } as any)
    return NextResponse.json({ ok: true, application }, { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: reviewerAccessErrorMessage(error, "审核操作失败"),
    }, {
      status: reviewerAccessErrorStatus(error, 400),
    })
  }
}
