import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { verifyPasswordResetProof } from "@/lib/server/verification"

const updatePasswordByUserIdRef = makeFunctionReference<"mutation">("users:updatePasswordByUserId")

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const proof = String(body?.proof || "")
        const newPassword = String(body?.newPassword || "")

        if (!proof || !newPassword) {
            return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 })
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 })
        }

        const payload = verifyPasswordResetProof(proof)
        if (!payload) {
            return NextResponse.json({ ok: false, message: "Reset link is invalid or expired." }, { status: 400 })
        }

        const client = getConvexHttpClient()
        await client.mutation(updatePasswordByUserIdRef, {
            userId: payload.userId,
            newPassword,
        } as any)

        return NextResponse.json({ ok: true, message: "Password updated successfully." })
    } catch (error) {
        console.error("reset-password error", error)
        return NextResponse.json({ ok: false, message: "Failed to reset password." }, { status: 500 })
    }
}
