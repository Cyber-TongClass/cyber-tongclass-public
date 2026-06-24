import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE, reviewerSessionCookieOptions } from "@/lib/server/reviewer-session"

export const runtime = "nodejs"

const signInRef = makeFunctionReference<"mutation">("reviewerAuth:signIn")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const username = body?.username ? String(body.username) : ""
    const password = body?.password ? String(body.password) : ""

    if (!username.trim() || !password) {
      return NextResponse.json({ ok: false, message: "请输入用户名和密码" }, { status: 400 })
    }

    const client = getConvexHttpClient()
    const result = await client.mutation(signInRef, { username, password } as any)

    const response = NextResponse.json({ ok: true, reviewer: result.reviewer })
    response.cookies.set(REVIEWER_SESSION_COOKIE, result.sessionToken, reviewerSessionCookieOptions)
    return response
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Reviewer 登录失败",
    }, { status: 401 })
  }
}
