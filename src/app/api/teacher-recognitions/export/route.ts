import { NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"

import { buildTeacherRecognitionExportRows } from "@/lib/teacher-recognition"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { buildSimpleXlsx } from "@/lib/server/simple-xlsx"
import { buildSimpleZip } from "@/lib/server/simple-zip"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const managementRef = makeFunctionReference<"query">("teacherRecognitions:listForManagement")

export async function POST(request: Request) {
  try {
    const sessionToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    if (!sessionToken) return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 })
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const filters = {
      ...(Number.isInteger(body.year) ? { year: body.year } : {}),
      ...(typeof body.teacherQuery === "string" && body.teacherQuery.trim() ? { teacherQuery: body.teacherQuery.trim() } : {}),
      ...(typeof body.categoryId === "string" && body.categoryId ? { categoryId: body.categoryId as never } : {}),
      ...(typeof body.status === "string" && ["pending", "needs_changes", "approved", "rejected"].includes(body.status) ? { status: body.status } : {}),
    }
    const data = await getConvexHttpClient().query(managementRef, { sessionToken, ...filters } as never) as { rows: any[] }
    const table = buildTeacherRecognitionExportRows(data.rows)
    const bytes = buildSimpleZip(buildSimpleXlsx(table as Array<Array<string | number>>, {
      sheetName: "教师奖励",
      title: "教师奖励与专业服务统计",
      creator: "北京大学人工智能研究院",
    }))
    const fileName = encodeURIComponent(`教师奖励统计-${new Date().toISOString().slice(0, 10)}.xlsx`)
    return new NextResponse(bytes, { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    } })
  } catch {
    return NextResponse.json({ ok: false, message: "教师奖励统计导出失败" }, { status: 500, headers: { "cache-control": "no-store" } })
  }
}
