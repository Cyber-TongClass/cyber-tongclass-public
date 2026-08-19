import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const getDownloadTargetRef = makeFunctionReference<"action">("tongInitCourseResources:getDownloadTarget")

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const target = await getConvexHttpClient().action(getDownloadTargetRef, { id: id as any })
    if (!target?.url) {
      return NextResponse.json({ ok: false, message: "资源不存在或未发布" }, { status: 404 })
    }
    const destination = target.url.startsWith("/")
      ? new URL(target.url, request.nextUrl.origin)
      : new URL(target.url)
    return NextResponse.redirect(destination, {
      status: 307,
      headers: { "cache-control": "private, no-store" },
    })
  } catch (error) {
    console.error("tong init course download error", error)
    return NextResponse.json({ ok: false, message: "暂时无法生成下载地址" }, { status: 503 })
  }
}
