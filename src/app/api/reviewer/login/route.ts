import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE, reviewerSessionCookieOptions } from "@/lib/server/reviewer-session"
import { consumeRateLimit, getClientIp } from "@/lib/server/rate-limit"

export const runtime = "nodejs"

const signInRef = makeFunctionReference<"mutation">("reviewerAuth:signIn")

// Brute-force guard: separate buckets per IP and per username so a single
// attacker IP cannot exhaust attempts for legitimate users with common
// usernames, and a single targeted account cannot lock out other IPs.
const IP_WINDOW_MS = 10 * 60_000
const IP_MAX_ATTEMPTS = 30
const USERNAME_WINDOW_MS = 15 * 60_000
const USERNAME_MAX_ATTEMPTS = 10
const FAILURE_COOLDOWN_MS = 60_000

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const ipLimit = consumeRateLimit("reviewer-login:ip", ip, {
      windowMs: IP_WINDOW_MS,
      max: IP_MAX_ATTEMPTS,
    })
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { ok: false, message: "尝试次数过多，请稍后再试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.retryAfterSeconds),
          },
        }
      )
    }

    const body = await request.json().catch(() => ({}))
    const username = body?.username ? String(body.username) : ""
    const password = body?.password ? String(body.password) : ""

    if (!username.trim() || !password) {
      return NextResponse.json(
        { ok: false, message: "请输入用户名和密码" },
        { status: 400 }
      )
    }

    const usernameLimit = consumeRateLimit(
      "reviewer-login:username",
      username.trim().toLowerCase(),
      {
        windowMs: USERNAME_WINDOW_MS,
        max: USERNAME_MAX_ATTEMPTS,
      }
    )
    if (!usernameLimit.allowed) {
      return NextResponse.json(
        { ok: false, message: "尝试次数过多，请稍后再试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(usernameLimit.retryAfterSeconds),
          },
        }
      )
    }

    const client = getConvexHttpClient()
    let result: any
    try {
      result = await client.mutation(signInRef, { username, password } as any)
    } catch (error) {
      // Apply per-username failure cooldown to slow down credential stuffing.
      consumeRateLimit("reviewer-login:cooldown", username.trim().toLowerCase(), {
        windowMs: FAILURE_COOLDOWN_MS,
        max: 1,
      })
      // Generic error message — do not leak whether the username exists.
      return NextResponse.json(
        { ok: false, message: "用户名或密码错误" },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ ok: true, reviewer: result.reviewer })
    response.cookies.set(REVIEWER_SESSION_COOKIE, result.sessionToken, reviewerSessionCookieOptions)
    return response
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Reviewer 登录失败",
      },
      { status: 500 }
    )
  }
}