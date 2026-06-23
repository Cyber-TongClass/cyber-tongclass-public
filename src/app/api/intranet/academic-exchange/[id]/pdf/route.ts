import { NextRequest, NextResponse } from "next/server"
import { makeFunctionReference } from "convex/server"
import { readFile } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb } from "pdf-lib"
import { getConvexHttpClient } from "@/lib/server/convex-http"
import { getPublicationAuthorName } from "@/lib/publication-authors"

export const runtime = "nodejs"

const getApplicationRef = makeFunctionReference<"query">("academicExchange:getApplication")

async function loadChineseFontBytes() {
  const candidates = [
    path.join(/* turbopackIgnore: true */ process.cwd(), "public", "fonts", "SimSun.ttf"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "public", "fonts", "Songti.ttf"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "public", "fonts", "Songti.otf"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "public", "fonts", "NotoSansSC-Regular.otf"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "public", "fonts", "NotoSansSC-Regular.ttf"),
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
  ]

  for (const candidate of candidates) {
    try {
      return await readFile(candidate)
    } catch {
      // Try the next font path.
    }
  }

  return null
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "application"
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-")
  if (year && month && day) return `${year} 年 ${month} 月 ${day} 日`
  return value
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number) {
  const paragraphs = String(text || "-").split("\n")
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    let line = ""
    for (const char of paragraph) {
      const nextLine = `${line}${char}`
      if (font.widthOfTextAtSize(nextLine, fontSize) > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = nextLine
      }
    }
    lines.push(line || " ")
  }

  return lines
}

async function fetchPaperPdf(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "application/pdf",
      "user-agent": "TongClass academic exchange PDF exporter",
    },
  })

  if (!response.ok) {
    throw new Error(`论文 PDF 下载失败：${response.status}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  const header = new TextDecoder().decode(bytes.slice(0, 5))
  const contentType = response.headers.get("content-type") || ""
  if (header !== "%PDF-" && !contentType.toLowerCase().includes("pdf")) {
    throw new Error("论文链接没有直接返回 PDF 文件")
  }

  return bytes
}

async function buildPdf(application: any) {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const fontBytes = await loadChineseFontBytes()
  if (!fontBytes) {
    throw new Error("缺少中文字体资源，无法生成中文申请表 PDF")
  }

  // Full embedding is larger, but pdf-lib/fontkit can render Noto Sans SC
  // incorrectly when subsetting CJK glyphs in production PDFs.
  const font = await pdfDoc.embedFont(fontBytes, { subset: false })
  const a4: [number, number] = [595.28, 841.89]
  const margin = 40
  const tableWidth = a4[0] - margin * 2
  const lineHeight = 14
  const black = rgb(0, 0, 0)
  const white = rgb(1, 1, 1)

  let page = pdfDoc.addPage(a4)
  let y = a4[1] - 44

  const ensureSpace = (height: number) => {
    if (y - height > margin + 12) return
    page = pdfDoc.addPage(a4)
    y = a4[1] - 44
  }

  const drawText = (text: string, x: number, yy: number, size = 10) => {
    page.drawText(text, { x, y: yy, size, font, color: black })
  }

  const drawCenteredText = (text: string, x: number, yy: number, width: number, size = 10) => {
    const textWidth = font.widthOfTextAtSize(text, size)
    drawText(text, x + Math.max(0, (width - textWidth) / 2), yy, size)
  }

  const drawCell = ({
    x,
    top,
    width,
    height,
    text,
    size = 10,
    align = "left",
    valign = "top",
    underlineText,
  }: {
    x: number
    top: number
    width: number
    height: number
    text: string
    size?: number
    align?: "left" | "center"
    valign?: "top" | "middle"
    underlineText?: string
  }) => {
    page.drawRectangle({
      x,
      y: top - height,
      width,
      height,
      borderColor: black,
      borderWidth: 0.8,
      color: white,
    })

    const innerWidth = width - 12
    const lines = wrapText(text || "-", font, size, innerWidth)
    const totalTextHeight = lines.length * lineHeight
    const startY = valign === "middle"
      ? top - (height - totalTextHeight) / 2 - size
      : top - 15

    lines.forEach((line, index) => {
      const lineY = startY - index * lineHeight
      const lineWidth = font.widthOfTextAtSize(line, size)
      const lineX = align === "center" ? x + Math.max(6, (width - lineWidth) / 2) : x + 6
      drawText(line, lineX, lineY, size)

      if (underlineText && line.includes(underlineText)) {
        const prefix = line.slice(0, line.indexOf(underlineText))
        const startX = lineX + font.widthOfTextAtSize(prefix, size)
        const endX = startX + font.widthOfTextAtSize(underlineText, size)
        page.drawLine({
          start: { x: startX, y: lineY - 2 },
          end: { x: endX, y: lineY - 2 },
          thickness: 0.8,
          color: black,
        })
      }
    })
  }

  const drawRow = (
    cells: Array<{ text: string; width: number; size?: number; align?: "left" | "center"; valign?: "top" | "middle"; underlineText?: string }>,
    minHeight = 30
  ) => {
    const height = Math.max(
      minHeight,
      ...cells.map((cell) => {
        const size = cell.size || 10
        const lines = wrapText(cell.text || "-", font, size, cell.width - 12)
        return 16 + lines.length * lineHeight
      })
    )
    ensureSpace(height)
    let x = margin
    for (const cell of cells) {
      drawCell({ x, top: y, height, ...cell })
      x += cell.width
    }
    y -= height
  }

  const labelWidth = 54
  const pair = (label: string, value: string, width: number) => ([
    { text: label, width: labelWidth, align: "center" as const, valign: "middle" as const },
    { text: value || "-", width: width - labelWidth, valign: "middle" as const },
  ])
  const thirdWidth = tableWidth / 3
  const halfWidth = tableWidth / 2
  const paperAuthors = application.paperAuthors.map((author: string) => getPublicationAuthorName(author)).join("，")

  drawCenteredText("通班学术交流支持项目", margin, y, tableWidth, 16)
  y -= 22
  drawCenteredText("申 请 表", margin, y, tableWidth, 18)
  y -= 28

  drawRow([
    ...pair("姓 名", application.applicantName, thirdWidth),
    ...pair("学 号", application.studentId, thirdWidth),
    ...pair("性别", application.gender || "-", thirdWidth),
  ], 32)
  drawRow([
    ...pair("邮 箱", application.email, thirdWidth),
    ...pair("联系电话", application.phone || "-", thirdWidth),
    ...pair("项目类别", application.projectCategory, thirdWidth),
  ], 32)
  drawRow([
    ...pair("项目名称", application.projectName, halfWidth),
    ...pair("交流地点", application.exchangeLocation, halfWidth),
  ], 34)
  drawRow([
    { text: "项目时间", width: labelWidth, align: "center", valign: "middle" },
    { text: application.projectTime, width: tableWidth - labelWidth, valign: "middle" },
  ], 32)
  drawRow([
    { text: "关联接收论文及其作者单位", width: 96, align: "center", valign: "middle" },
    {
      text: `论文题目：${application.paperTitle}\n作者：${paperAuthors}\n申请人位次：${application.applicantAuthorName}，${application.applicantAuthorIndexLabel}\n申请人所在单位：${application.applicantAffiliation}\n总页数：${application.totalPages}；正文页数：${application.bodyPages}\n论文 PDF：${application.paperPdfUrl}`,
      width: tableWidth - 96,
      size: 9,
      underlineText: application.applicantAuthorName,
    },
  ], 108)
  drawRow([
    { text: "有无\n其他资助来源", width: 78, align: "center", valign: "middle" },
    { text: application.otherFunding, width: tableWidth - 78 },
  ], 54)
  drawRow([
    { text: "项目\n计划", width: 78, align: "center", valign: "middle" },
    { text: application.projectPlan, width: tableWidth - 78 },
  ], 86)

  drawRow([
    { text: "申请金额", width: tableWidth, align: "center", valign: "middle", size: 11 },
  ], 28)
  drawRow([
    { text: "开支项目", width: tableWidth * 0.42, align: "center", valign: "middle" },
    { text: "预计金额（人民币元）", width: tableWidth * 0.24, align: "center", valign: "middle" },
    { text: "备注", width: tableWidth * 0.34, align: "center", valign: "middle" },
  ], 28)
  for (const item of application.expenseItems) {
    drawRow([
      { text: item.item, width: tableWidth * 0.42 },
      { text: String(item.amount), width: tableWidth * 0.24, align: "center", valign: "middle" },
      { text: item.note || "-", width: tableWidth * 0.34 },
    ], 30)
  }
  drawRow([
    { text: "总计", width: tableWidth * 0.42, align: "center", valign: "middle" },
    { text: String(application.totalAmount), width: tableWidth * 0.24, align: "center", valign: "middle" },
    { text: "", width: tableWidth * 0.34 },
  ], 30)

  drawRow([
    { text: "附件材料：论文全文见后附 PDF", width: tableWidth, valign: "middle" },
  ], 32)

  ensureSpace(52)
  y -= 28
  drawText("签名：____________________", margin + 8, y, 11)
  drawText(`申请时间：${formatDate(application.applicationDate)}`, a4[0] - margin - 210, y, 11)

  const paperPdfBytes = await fetchPaperPdf(application.paperPdfUrl)
  const paperPdf = await PDFDocument.load(paperPdfBytes)
  const copiedPages = await pdfDoc.copyPages(paperPdf, paperPdf.getPageIndices())
  copiedPages.forEach((copiedPage: any) => pdfDoc.addPage(copiedPage))

  return await pdfDoc.save()
}

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

    const pdfBytes = await buildPdf(application)
    const applicantName = sanitizeFileName(application.applicantName || "申请人")
    const fileName = encodeURIComponent(`通班学术交流支持项目申请表-${sanitizeFileName(application.projectName)}-${applicantName}.pdf`)

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
