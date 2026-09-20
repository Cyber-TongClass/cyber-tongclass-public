import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "动态资源下载接口已停用，当前仅提供静态课程资料" },
    { status: 404, headers: { "cache-control": "no-store" } },
  )
}
