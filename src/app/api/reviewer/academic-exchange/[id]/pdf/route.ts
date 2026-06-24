import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"
import { buildAcademicExchangePdf, sanitizeAcademicExchangePdfFileName } from "@/lib/server/academic-exchange-pdf"

export const runtime = "nodejs"

const getApplicationRef = makeFunctionReference<"query">("academicExchange:getApplicationForReviewer")
const logDownloadRef = makeFunctionReference<"mutation">("academicExchange:logReviewerApplicationDownload")

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const reviewerSessionToken = request.cookies.get(REVIEWER_SESSION_COOKIE)?.value || ""
    if (!reviewerSessionToken) {
      return NextResponse.json({ ok: false, message: "请先登录 Reviewer 账号" }, { status: 401 })
    }

    const params = await context.params
    const client = getConvexHttpClient()
    const application = await client.query(getApplicationRef, {
      reviewerSessionToken,
      id: params.id as any,
    } as any)

    if (!application) {
      return NextResponse.json({ ok: false, message: "未找到申请记录" }, { status: 404 })
    }

    const pdfBytes = await buildAcademicExchangePdf(application)
    await client.mutation(logDownloadRef, {
      reviewerSessionToken,
      id: params.id as any,
    } as any)

    const applicantName = sanitizeAcademicExchangePdfFileName(application.applicantName || "申请人")
    const fileName = encodeURIComponent(`通班学术交流支持项目申请表-${sanitizeAcademicExchangePdfFileName(application.projectName)}-${applicantName}.pdf`)

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    console.error("reviewer academic exchange pdf export error", error)
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "PDF 导出失败",
    }, { status: 500 })
  }
}
