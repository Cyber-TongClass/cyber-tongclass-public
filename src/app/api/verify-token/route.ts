import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { normalizeEmail, sha256Hex } from "@/lib/server/verification"
import { getEmailVerificationServiceToken } from "@/lib/server/email-service-token"

type Purpose = "email_verification" | "password_reset"
const PURPOSE_SET = new Set<Purpose>(["email_verification", "password_reset"])
const consumeVerificationRef = makeFunctionReference<"mutation">("emailVerifications:consume")
const markEmailVerifiedRef = makeFunctionReference<"mutation">("users:markEmailVerified")

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const purpose = String(body?.purpose || "") as Purpose
        const token = body?.token ? String(body.token) : ""
        const code = body?.code ? String(body.code).trim() : ""
        const email = body?.email ? normalizeEmail(String(body.email)) : ""

        if (!PURPOSE_SET.has(purpose) || (!token && !code)) {
            return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 })
        }
        if (purpose === "password_reset") {
            return NextResponse.json(
                { ok: false, message: "请通过密码重置页面直接提交新密码。" },
                { status: 400 },
            )
        }

        const client = getConvexHttpClient()
        const serviceToken = getEmailVerificationServiceToken()

        const consume = await client.mutation(consumeVerificationRef, {
            serviceToken,
            purpose,
            tokenHash: token ? sha256Hex(token) : undefined,
            codeHash: code ? sha256Hex(code) : undefined,
            sentTo: email || undefined,
        } as any)

        if (!consume.ok) {
            const reason = (consume as any).reason || "invalid"
            return NextResponse.json({ ok: false, reason, message: `Token consume failed: ${reason}` }, { status: 400 })
        }

        if (purpose === "email_verification") {
            if (consume.verificationId) {
                await client.mutation(markEmailVerifiedRef, {
                    serviceToken,
                    verificationId: consume.verificationId,
                } as any)
            }

            return NextResponse.json({
                ok: true,
                message: "Email verified successfully.",
            })
        }

        return NextResponse.json({ ok: false, message: "Unsupported verification purpose." }, { status: 400 })
    } catch (error) {
        console.error("verify-token error", error)
        return NextResponse.json({ ok: false, message: "Verification failed." }, { status: 500 })
    }
}
