import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"

export const runtime = "nodejs"

const currentRef = makeFunctionReference<"query">("reviewerAuth:current")

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(REVIEWER_SESSION_COOKIE)?.value || ""
  if (!sessionToken) {
    return NextResponse.json({ ok: false, reviewer: null }, { status: 401 })
  }

  const client = getConvexHttpClient()
  const reviewer = await client.query(currentRef, { sessionToken } as any)
  if (!reviewer) {
    return NextResponse.json({ ok: false, reviewer: null }, { status: 401 })
  }

  return NextResponse.json({ ok: true, reviewer })
}
