import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"

import { deleteR2Object, getR2ObjectKeyFromStorageId } from "@/../convex/lib/r2"
import { getConvexHttpClient } from "@/lib/server/convex-http"

export const runtime = "nodejs"

const validateCleanupUploadRef = makeFunctionReference<"query">("academicExchange:validateCleanupUpload")

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    const { storageId } = await request.json()
    if (!sessionToken || typeof storageId !== "string" || !storageId) {
      return NextResponse.json({ ok: false, message: "清理请求无效" }, { status: 400 })
    }
    const client = getConvexHttpClient()
    const allowed = await client.query(validateCleanupUploadRef, { sessionToken, storageId } as any)
    if (!allowed) return NextResponse.json({ ok: false, message: "无权清理该文件" }, { status: 403 })

    if (!getR2ObjectKeyFromStorageId(storageId)) {
      return NextResponse.json({ ok: false, message: "旧存储文件无法安全自动清理" }, { status: 400 })
    }
    await deleteR2Object(storageId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, message: "文件清理未完成" }, { status: 500 })
  }
}
