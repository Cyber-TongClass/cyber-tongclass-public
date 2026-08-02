import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { fetchUploadedAcademicExchangePaperPdf } from "@/lib/server/academic-exchange-paper-pdf"
import { buildAcademicExchangePdf } from "@/lib/server/academic-exchange-pdf"
import {
  buildAcademicExchangePdfFileName,
  resolveAcademicExchangeBrand,
} from "@/lib/academic-exchange-brand"
import {
  getReviewerAccessCredentials,
  reviewerAccessErrorMessage,
  reviewerAccessErrorStatus,
  toAcademicExchangeAccessArgs,
} from "../../../_lib/access"

export const runtime = "nodejs"

const getApplicationRef = makeFunctionReference<"query">("academicExchange:getApplicationForReviewer")
const logDownloadRef = makeFunctionReference<"mutation">("academicExchange:logReviewerApplicationDownload")

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let accessArgs: ReturnType<typeof toAcademicExchangeAccessArgs>
  let application: any
  let client: ReturnType<typeof getConvexHttpClient>

  try {
    const credentials = getReviewerAccessCredentials(request)
    const params = await context.params
    accessArgs = toAcademicExchangeAccessArgs(credentials)
    client = getConvexHttpClient()
    application = await client.query(getApplicationRef, {
      ...accessArgs,
      id: params.id as any,
    } as any)
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: reviewerAccessErrorMessage(error, "当前账号没有 Reviewer 访问权限"),
    }, {
      status: reviewerAccessErrorStatus(error, 401),
    })
  }

  if (!application) {
    return NextResponse.json({ ok: false, message: "未找到申请记录" }, { status: 404 })
  }

  try {
    const paperPdfBytes = await fetchUploadedAcademicExchangePaperPdf(client, application, accessArgs)
    const pdfBytes = await buildAcademicExchangePdf(application, { paperPdfBytes })
    await client.mutation(logDownloadRef, {
      ...accessArgs,
      id: application._id as any,
    } as any)

    const brand = resolveAcademicExchangeBrand(application)
    const fileName = encodeURIComponent(buildAcademicExchangePdfFileName(
      brand,
      application.projectName,
      application.applicantName,
    ))

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
        "cache-control": "no-store",
      },
    })
  } catch {
    return NextResponse.json({
      ok: false,
      message: "PDF 导出失败",
    }, { status: 500 })
  }
}
