import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { normalizeEmail, verifyEmailVerificationProof } from "@/lib/server/verification"

const getUserById = makeFunctionReference<"query">("users:getById")
const markEmailVerified = makeFunctionReference<"mutation">("users:markEmailVerified")

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const userId = String(body?.userId || "")
        const email = normalizeEmail(String(body?.email || ""))
        const proof = String(body?.proof || "")

        if (!userId || !email || !proof) {
            return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 })
        }

        const payload = verifyEmailVerificationProof(proof)
        if (!payload || normalizeEmail(payload.email) !== email) {
            return NextResponse.json({ ok: false, message: "Verification proof is invalid or expired." }, { status: 400 })
        }

        const client = getConvexHttpClient() as any
        const user = await client.query(getUserById, { id: userId } as any)
        if (!user || normalizeEmail(user.email) !== email) {
            return NextResponse.json({ ok: false, message: "User/email mismatch." }, { status: 400 })
        }

        await client.mutation(markEmailVerified, { userId: user._id } as any)
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error("complete-email-verification error", error)
        return NextResponse.json({ ok: false, message: "Failed to complete email verification." }, { status: 500 })
    }
}
