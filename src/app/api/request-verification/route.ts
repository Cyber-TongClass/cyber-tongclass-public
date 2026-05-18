import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { sendVerificationEmail } from "@/lib/server/mailer"
import { generateVerificationCode, generateVerificationToken, normalizeEmail, sha256Hex } from "@/lib/server/verification"
import { verifyTurnstileToken } from "@/lib/server/turnstile"

type Purpose = "email_verification" | "password_reset"

const PURPOSE_SET = new Set<Purpose>(["email_verification", "password_reset"])

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const getClientIp = (request: NextRequest) => {
    const header = request.headers.get("x-forwarded-for")
    if (!header) return "unknown"
    return header.split(",")[0]?.trim() || "unknown"
}

const getSiteUrl = () => {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000"
    )
}

const COOLDOWN_MS = 60_000
const WINDOW_MS = 60 * 60_000
const MAX_EMAIL_PER_WINDOW = 5
const MAX_IP_PER_WINDOW = 20
const getRecentStatsRef = makeFunctionReference<"query">("emailVerifications:getRecentStats")
const getUserByEmailRef = makeFunctionReference<"query">("users:getByEmail")
const createEmailVerificationRef = makeFunctionReference<"mutation">("emailVerifications:create")
const touchVerificationRequestRef = makeFunctionReference<"mutation">("users:touchVerificationRequest")

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const email = normalizeEmail(String(body?.email || ""))
        const purpose = String(body?.purpose || "") as Purpose
        const turnstileToken = body?.turnstileToken ? String(body.turnstileToken) : ""

        if (!email || !isValidEmail(email) || !PURPOSE_SET.has(purpose)) {
            return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 })
        }

        const ip = getClientIp(request)
        const userAgent = request.headers.get("user-agent") || ""
        const client = getConvexHttpClient()

        const stats = await client.query(getRecentStatsRef, {
            email,
            ip,
            withinMs: WINDOW_MS,
        } as any)

        const hitEmailLimit = stats.emailRecentCount >= MAX_EMAIL_PER_WINDOW
        const hitIpLimit = stats.ipRecentCount >= MAX_IP_PER_WINDOW
        const inCooldown = !!stats.latestByEmail && stats.now - stats.latestByEmail < COOLDOWN_MS
        const cooldownRemainingMs = inCooldown ? COOLDOWN_MS - (stats.now - (stats.latestByEmail || 0)) : 0
        const requiresTurnstile = hitEmailLimit || hitIpLimit || inCooldown

        if (inCooldown) {
            return NextResponse.json({
                ok: false,
                requiresTurnstile: false,
                cooldownRemainingMs,
                message: `Resend after ${Math.ceil(cooldownRemainingMs / 1000)}s.`,
            })
        }

        if (requiresTurnstile) {
            if (!turnstileToken) {
                return NextResponse.json({
                    ok: false,
                    requiresTurnstile: true,
                    message: "Additional verification is required before sending another code.",
                })
            }

            const turnstile = await verifyTurnstileToken(turnstileToken, ip)
            if (!turnstile.success) {
                return NextResponse.json({
                    ok: false,
                    requiresTurnstile: true,
                    message: "Turnstile verification failed. Please try again.",
                })
            }
        }

        const maybeUser = await client.query(getUserByEmailRef, { email } as any)
        if (purpose === "email_verification" && maybeUser?.isEmailVerified) {
            return NextResponse.json({ ok: true, message: "Email is already verified." })
        }

        const token = generateVerificationToken()
        const code = generateVerificationCode()
        const tokenHash = sha256Hex(token)
        const codeHash = sha256Hex(code)

        const expiryMinutes = purpose === "password_reset"
            ? Number(process.env.EMAIL_TOKEN_EXPIRY_MIN || 15)
            : Number(process.env.EMAIL_VERIFY_EXPIRY_MIN || 30)

        await client.mutation(createEmailVerificationRef, {
            tokenHash,
            codeHash,
            purpose,
            userId: maybeUser?._id,
            sentTo: email,
            ip,
            userAgent,
            expiresAt: Date.now() + expiryMinutes * 60_000,
        } as any)

        if (maybeUser?._id) {
            await client.mutation(touchVerificationRequestRef, { userId: maybeUser._id } as any)
        }

        const siteUrl = getSiteUrl()
        const path = purpose === "password_reset"
            ? "/reset-password"
            : "/verify-email"
        const link = `${siteUrl}${path}?token=${encodeURIComponent(token)}&purpose=${purpose}`

        await sendVerificationEmail({
            to: email,
            purpose,
            link,
            code,
            expiryMinutes,
        })

        return NextResponse.json({
            ok: true,
            requiresTurnstile: false,
            message: "If the email exists, a verification message has been sent.",
        })
    } catch (error) {
        console.error("request-verification error", error)
        return NextResponse.json(
            { ok: false, message: "Failed to send verification email." },
            { status: 500 }
        )
    }
}
