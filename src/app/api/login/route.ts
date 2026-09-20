import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { isUndergraduate, UNDERGRADUATE_ONLY_MESSAGE } from "@/lib/undergraduate-access"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (typeof body?.studentId !== "string" || !body.studentId.trim() ||
      typeof body?.password !== "string" || !body.password) {
    return NextResponse.json({ message: "请输入账号和密码" }, { status: 400 })
  }
  try {
    const client = getConvexHttpClient()
    const result = await client.mutation(makeFunctionReference<"mutation">("users:simpleLogin"), {
      studentId: body.studentId.trim(), password: body.password,
    })
    const user = result?.sessionToken
      ? await client.query(makeFunctionReference<"query">("auth:currentUserBySession"), { sessionToken: result.sessionToken })
      : null
    if (!isUndergraduate(user)) {
      // Never deliver an AIA-only account's session to the website's browser.
      return NextResponse.json({ message: UNDERGRADUATE_ONLY_MESSAGE }, { status: 403 })
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ message: "账号或密码错误，或登录服务暂不可用" }, { status: 401 })
  }
}
