import { makeFunctionReference } from "convex/server"
import { NextResponse } from "next/server"

import {
  normalizeSpreadsheetSource,
  OA_SPREADSHEET_LIMITS,
} from "@/lib/oa-spreadsheet-import"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { analyzeXlsxHeaders } from "@/lib/server/oa-xlsx-reader"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const currentUserBySessionRef = makeFunctionReference<"query">("auth:currentUserBySession")
const responseHeaders = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" }

class OASpreadsheetRouteError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message)
  }
}

function bearerSessionToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.replace(/^Bearer\s+/i, "").trim()
}

function sourceFileName(request: Request) {
  const encoded = request.headers.get("x-oa-file-name") || ""
  if (!encoded || encoded.length > 1_024) throw new OASpreadsheetRouteError("INVALID_SPREADSHEET", "Excel 文件名无效", 422)
  try {
    return decodeURIComponent(encoded)
  } catch {
    throw new OASpreadsheetRouteError("INVALID_SPREADSHEET", "Excel 文件名无效", 422)
  }
}

async function readBoundedSource(request: Request) {
  const maximum = OA_SPREADSHEET_LIMITS.maxSourceBytes
  const declared = Number(request.headers.get("content-length") || 0)
  if (Number.isFinite(declared) && declared > maximum) {
    throw new OASpreadsheetRouteError("SOURCE_TOO_LARGE", "Excel 文件不能超过 10 MiB", 413)
  }
  if (!request.body) throw new OASpreadsheetRouteError("INVALID_SPREADSHEET", "Excel 文件不能为空", 422)

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maximum) {
      await reader.cancel()
      throw new OASpreadsheetRouteError("SOURCE_TOO_LARGE", "Excel 文件不能超过 10 MiB", 413)
    }
    chunks.push(value)
  }
  if (!size) throw new OASpreadsheetRouteError("INVALID_SPREADSHEET", "Excel 文件不能为空", 422)
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size)
}

function errorResponse(error: unknown) {
  if (error instanceof OASpreadsheetRouteError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: responseHeaders })
  }
  const message = error instanceof Error ? error.message : ""
  if (/Excel|XLSX|ZIP|工作表|表头|关系|宏|文件/.test(message)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_SPREADSHEET", message: "Excel 文件无效或无法识别表头" },
      { status: 422, headers: responseHeaders },
    )
  }
  return NextResponse.json(
    { ok: false, code: "SPREADSHEET_ERROR", message: "Excel 表头分析失败" },
    { status: 500, headers: responseHeaders },
  )
}

export async function POST(request: Request) {
  try {
    const sessionToken = bearerSessionToken(request)
    if (!sessionToken) throw new OASpreadsheetRouteError("AUTH_REQUIRED", "请先登录", 401)

    const currentUser = await getConvexHttpClient().query(currentUserBySessionRef, { sessionToken } as never) as {
      role?: string
      identityType?: string
    } | null
    if (!currentUser) throw new OASpreadsheetRouteError("AUTH_REQUIRED", "登录已过期，请重新登录", 401)
    if (currentUser.identityType !== "teacher" && currentUser.role !== "super_admin") {
      throw new OASpreadsheetRouteError("FORBIDDEN", "仅教师或超级管理员可以导入 Excel 表单", 403)
    }

    const fileName = sourceFileName(request)
    const mimeType = request.headers.get("content-type")?.split(";", 1)[0]?.trim() || ""
    const bytes = await readBoundedSource(request)
    normalizeSpreadsheetSource(mimeType, fileName, bytes)
    const analysis = analyzeXlsxHeaders(bytes)

    return NextResponse.json({ ok: true, fileName, sheets: analysis.sheets }, { headers: responseHeaders })
  } catch (error) {
    return errorResponse(error)
  }
}
