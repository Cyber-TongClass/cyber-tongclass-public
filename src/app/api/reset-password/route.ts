import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"

import { getConvexHttpClient } from "@/lib/server/convex-http"
import { sha256Hex } from "@/lib/server/verification"
import { getEmailVerificationServiceToken } from "@/lib/server/email-service-token"

const resetPasswordRef = makeFunctionReference<"mutation">("users:resetPasswordWithToken")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = String(body?.token || "")
    const newPassword = String(body?.newPassword || "")

    if (!token || newPassword.length < 8) {
      return NextResponse.json({ ok: false, message: "重置链接无效或新密码不符合要求。" }, { status: 400 })
    }

    const client = getConvexHttpClient()
    const serviceToken = getEmailVerificationServiceToken()
    await client.mutation(resetPasswordRef, {
      serviceToken,
      tokenHash: sha256Hex(token),
      newPassword,
    } as any)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("reset-password error", error)
    return NextResponse.json({ ok: false, message: "密码重置失败，请重新申请链接。" }, { status: 400 })
  }
}
