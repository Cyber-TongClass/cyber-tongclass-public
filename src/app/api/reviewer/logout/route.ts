import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"

export const runtime = "nodejs"

const signOutRef = makeFunctionReference<"mutation">("reviewerAuth:signOut")

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(REVIEWER_SESSION_COOKIE)?.value || ""

  if (sessionToken) {
    try {
      const client = getConvexHttpClient()
      await client.mutation(signOutRef, { sessionToken } as any)
    } catch {
      // The cookie should still be cleared if the backend call fails.
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(REVIEWER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}
