import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"

export const runtime = "nodejs"

const currentUserBySessionRef = makeFunctionReference<"query">("auth:currentUserBySession")

const materialTypes = new Map<string, string>([
  ["25级培养方案.pdf", "application/pdf"],
  ["23级培养方案.pdf", "application/pdf"],
  ["通班学术交流项目支持方案.pdf", "application/pdf"],
  ["通班学术交流项目支持方案202309修订版.pdf", "application/pdf"],
  ["通班学生出国出境报销注意事项.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["通班学术交流项目支持申请表.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["通班学术交流项目支持申请表-（空表）.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["各国住宿伙食公杂开支标准.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["各国住宿伙食公杂费开支标准.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["关于通班奖学金科研成果的评审建议.pdf", "application/pdf"],
  ["overseas-reimbursement-entry-exit-sample-main.png", "image/png"],
  ["overseas-reimbursement-entry-exit-sample-detail.png", "image/png"],
])

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : ""
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const sessionToken = bearerToken(request)
  if (!sessionToken) {
    return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 })
  }

  const { name } = await context.params
  const contentType = materialTypes.get(name)
  if (!contentType || name !== path.basename(name)) {
    return NextResponse.json({ ok: false, message: "资料不存在" }, { status: 404 })
  }

  try {
    const user = await getConvexHttpClient().query(currentUserBySessionRef, { sessionToken } as any) as {
      role?: string
      isClassMember?: boolean
    } | null
    const allowed = user?.isClassMember === true || user?.role === "admin" || user?.role === "super_admin"
    if (!allowed) {
      return NextResponse.json({ ok: false, message: "无权下载该资料" }, { status: 403 })
    }

    const filePath = path.join(process.cwd(), "private", "intranet-materials", name)
    const bytes = await readFile(filePath)
    const encodedName = encodeURIComponent(name)

    return new NextResponse(bytes, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename*=UTF-8''${encodedName}`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    })
  } catch (error) {
    console.error("intranet material download failed", error)
    return NextResponse.json({ ok: false, message: "资料下载失败" }, { status: 500 })
  }
}
