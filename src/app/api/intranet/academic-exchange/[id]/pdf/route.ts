import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { fetchUploadedAcademicExchangePaperPdf } from "@/lib/server/academic-exchange-paper-pdf"
import { buildAcademicExchangePdf } from "@/lib/server/academic-exchange-pdf"
import { getAcademicExchangePdfDownloadName } from "@/lib/academic-exchange"

export const runtime = "nodejs"

const getApplicationRef = makeFunctionReference<"query">("academicExchange:getApplication")

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const sessionToken = body?.sessionToken ? String(body.sessionToken) : ""
    const params = await context.params

    if (!sessionToken) {
      return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 })
    }

    const client = getConvexHttpClient()
    const application = await client.query(getApplicationRef, {
      sessionToken,
      id: params.id as any,
    } as any)

    if (!application) {
      return NextResponse.json({ ok: false, message: "未找到申请记录" }, { status: 404 })
    }

    const paperPdfBytes = await fetchUploadedAcademicExchangePaperPdf(client, application, { sessionToken })
    const pdfBytes = await buildAcademicExchangePdf(application, { paperPdfBytes })
    const fileName = encodeURIComponent(getAcademicExchangePdfDownloadName(application))

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    console.error("academic exchange pdf export error", error)
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "PDF 导出失败",
    }, { status: 500 })
  }
}
