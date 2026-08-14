import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { REVIEWER_SESSION_COOKIE } from "@/lib/server/reviewer-session"
import { getPublicationAuthorName } from "@/lib/publication-authors"
import { getAcademicExchangePaperPdfLabel } from "@/lib/academic-exchange-pdf-source"
import { fetchUploadedAcademicExchangePaperPdf } from "@/lib/server/academic-exchange-paper-pdf"
import { buildAcademicExchangePdf } from "@/lib/server/academic-exchange-pdf"
import { getAcademicExchangeFileNameDate, sanitizeAcademicExchangePdfFileName } from "@/lib/academic-exchange"
import { buildSimpleXlsx } from "@/lib/server/simple-xlsx"
import { buildSimpleZip } from "@/lib/server/simple-zip"

export const runtime = "nodejs"

const listApplicationsRef = makeFunctionReference<"query">("academicExchange:listApplicationsForReviewer")
const logDownloadRef = makeFunctionReference<"mutation">("academicExchange:logReviewerApplicationDownload")

function formatDate(value?: string | number | null) {
  if (!value) return ""
  if (typeof value === "string") return value
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value))
}

/**
 * 会议简称提取：优先取括号/斜杠/全角括号内的英文缩写（如 "AAAI 2025"、"CVPR 2025"），
 * 没有则取全称中的英文缩写段（含年份，如 "ICML 2025"、"NeurIPS 2025"），仍无则返回全称。
 */
function getConferenceShortName(projectName: string): string {
  const name = String(projectName || "").trim()
  if (!name) return ""
  // 1) 括号内优先（如 "第38届AAAI会议（AAAI 2025）"、"CVPR 2025 (Conference on ...)"）
  const bracket = name.match(/[（(]([^（）()]*[A-Za-z][^（）()]*)[）)]/)
  if (bracket) {
    const inner = bracket[1].trim()
    // 括号内是简短缩写（含年份且较短）直接用；是长全称则忽略括号
    const shortMatch = inner.match(/\b([A-Z][A-Za-z]*\s*\d{4})\b|\b([A-Z]{2,})\b/)
    if (shortMatch) {
      const short = (shortMatch[1] || shortMatch[2] || "").trim()
      if (short.length <= 20) return short
    }
  }
  // 2) 全称中独立的英文缩写段（含年份）："ICML 2025"、"NeurIPS 2025"
  const english = name.match(/\b([A-Z][A-Za-z]*\s+\d{4})\b|\b([A-Z]{2,})\b/)
  if (english) {
    const short = (english[1] || english[2] || "").trim()
    if (short.length <= 20) return short
  }
  // 3) 兜底：整串全称
  return name
}

function getApplicationYear(application: any) {
  const year = String(application.applicationDate || "").slice(0, 4)
  return /^\d{4}$/.test(year) ? year : String(new Date(application.createdAt || Date.now()).getFullYear())
}

function getYearlyApplicationCount(application: any, allApplications: any[]) {
  const year = getApplicationYear(application)
  const start = `${year}-01-01`
  const currentDate = String(application.applicationDate || "")

  return allApplications.filter((item) => {
    if (String(item.studentId) !== String(application.studentId)) return false
    const itemDate = String(item.applicationDate || "")
    if (!itemDate) return false
    return itemDate >= start && itemDate <= currentDate
  }).length || 1
}

function buildSummaryRows(applications: any[], allApplications: any[]) {
  const headers = [
    "申请时间",
    "姓名",
    "学号",
    "类型",
    "事由",
    "交流时间",
    "交流地点",
    "有无其他资助来源",
    "申请金额",
    "今年申请次数",
    "论文题目",
    "作者",
    "作者排序及作者单位",
    "论文页数",
    "论文 PDF 来源",
  ]

  const rows = applications.map((application) => [
    formatDate(application.applicationDate),
    application.applicantName || "",
    application.studentId || "",
    application.projectCategory || "",
    getConferenceShortName(application.projectName || ""),
    application.projectTime || "",
    application.exchangeLocation || "",
    application.otherFunding || "",
    Number(application.totalAmount || 0),
    getYearlyApplicationCount(application, allApplications),
    application.paperTitle || "",
    (application.paperAuthors || []).map((author: string) => getPublicationAuthorName(author)).join("，"),
    [application.applicantAuthorIndexLabel, application.applicantAffiliation].filter(Boolean).join("；"),
    application.totalPages || application.bodyPages ? `总页数 ${application.totalPages || ""}；正文页数 ${application.bodyPages || ""}` : "",
    getAcademicExchangePaperPdfLabel(application),
  ])

  return [headers, ...rows]
}

function todayCompact() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${now.getFullYear()}${month}${day}`
}

export async function POST(request: NextRequest) {
  try {
    const reviewerSessionToken = request.cookies.get(REVIEWER_SESSION_COOKIE)?.value || ""
    if (!reviewerSessionToken) {
      return NextResponse.json({ ok: false, message: "请先登录 Reviewer 账号" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const selectedIds = Array.isArray(body?.applicationIds)
      ? body.applicationIds.map((id: unknown) => String(id)).filter(Boolean)
      : []

    if (selectedIds.length === 0) {
      return NextResponse.json({ ok: false, message: "请先选择至少一条申请记录" }, { status: 400 })
    }

    const client = getConvexHttpClient()
    const allApplications = await client.query(listApplicationsRef, { reviewerSessionToken } as any)
    const byId = new Map((allApplications || []).map((application: any) => [String(application._id), application]))
    const applications = selectedIds.map((id: string) => byId.get(id)).filter(Boolean)

    if (applications.length !== selectedIds.length) {
      return NextResponse.json({ ok: false, message: "部分申请记录不存在或无权访问" }, { status: 404 })
    }

    const folderName = `学术交流支持申请导出-${todayCompact()}`
    const xlsxEntries = buildSimpleXlsx(buildSummaryRows(applications, allApplications || []))
    const xlsxBuffer = buildSimpleZip(xlsxEntries)
    const zipEntries: Array<{ name: string; data: Buffer | Uint8Array | string }> = [
      {
        name: `${folderName}/报销申请汇总.xlsx`,
        data: xlsxBuffer,
      },
    ]

    for (const application of applications) {
      const paperPdfBytes = await fetchUploadedAcademicExchangePaperPdf(client, application, { reviewerSessionToken })
      const pdfBytes = await buildAcademicExchangePdf(application, { paperPdfBytes })
      const applicantName = sanitizeAcademicExchangePdfFileName(application.applicantName || "申请人")
      const fileDate = getAcademicExchangeFileNameDate(application)
      zipEntries.push({
        name: `${folderName}/申请表PDF/通班学术交流支持申请表-${applicantName}-${fileDate}.pdf`,
        data: Buffer.from(pdfBytes),
      })
      await client.mutation(logDownloadRef, {
        reviewerSessionToken,
        id: application._id as any,
      } as any)
    }

    const zipBuffer = buildSimpleZip(zipEntries)
    const fileName = encodeURIComponent(`${folderName}.zip`)

    return new NextResponse(zipBuffer, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
        "content-length": String(zipBuffer.length),
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    console.error("reviewer academic exchange batch export error", error)
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "批量导出失败",
    }, { status: 500 })
  }
}
