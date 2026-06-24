import { readFile } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { getPublicationAuthorName } from "@/lib/publication-authors"

export function sanitizeAcademicExchangePdfFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "application"
}

async function loadChineseFontBytes() {
  // Source Han Sans SC is bundled in public/ so local and deployed PDF output
  // use the same open-source CJK font instead of relying on server fonts.
  const fontPath = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "public",
    "fonts",
    "SourceHanSansSC-Regular.otf"
  )

  try {
    return await readFile(fontPath)
  } catch {
    return null
  }
}

function formatApplicationDate(value: string) {
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

function fitFontSize(text: string, font: any, preferredSize: number, maxWidth: number, minSize = 5.5) {
  let size = preferredSize
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.25
  }
  return Math.max(size, minSize)
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

export async function buildAcademicExchangePdf(application: any) {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const fontBytes = await loadChineseFontBytes()
  if (!fontBytes) {
    throw new Error("缺少中文字体资源，无法生成中文申请表 PDF")
  }

  // Full embedding is larger, but CJK subset embedding can produce corrupt
  // glyph maps in some production PDF viewers.
  const font = await pdfDoc.embedFont(fontBytes, { subset: false })
  const latinFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const a4: [number, number] = [595.28, 841.89]
  const margin = 40
  const tableWidth = a4[0] - margin * 2
  const lineHeight = 14
  const black = rgb(0, 0, 0)

  let page = pdfDoc.addPage(a4)
  let y = a4[1] - 44

  const ensureSpace = (height: number) => {
    if (y - height > margin + 12) return
    page = pdfDoc.addPage(a4)
    y = a4[1] - 44
  }

  const drawText = (text: string, x: number, yy: number, size = 10, textFont = font) => {
    page.drawText(text, { x, y: yy, size, font: textFont, color: black })
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
    noWrap = false,
    textFont = font,
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
    noWrap?: boolean
    textFont?: any
  }) => {
    page.drawRectangle({
      x,
      y: top - height,
      width,
      height,
      borderColor: black,
      borderWidth: 0.8,
    })

    const innerWidth = width - 14
    const displayText = text || "-"
    const effectiveSize = noWrap ? fitFontSize(displayText, textFont, size, innerWidth) : size
    const lines = noWrap ? [displayText] : wrapText(displayText, textFont, effectiveSize, innerWidth)
    const effectiveLineHeight = Math.max(9, effectiveSize + 4)
    const totalTextHeight = lines.length * effectiveLineHeight
    const startY = valign === "middle"
      ? top - (height - totalTextHeight) / 2 - effectiveSize
      : top - 15

    lines.forEach((line, index) => {
      const lineY = startY - index * effectiveLineHeight
      const lineWidth = textFont.widthOfTextAtSize(line, effectiveSize)
      const lineX = align === "center" ? x + Math.max(6, (width - lineWidth) / 2) : x + 6
      drawText(line, lineX, lineY, effectiveSize, textFont)

      if (underlineText && line.includes(underlineText)) {
        const prefix = line.slice(0, line.indexOf(underlineText))
        const startX = lineX + textFont.widthOfTextAtSize(prefix, effectiveSize)
        const endX = startX + textFont.widthOfTextAtSize(underlineText, effectiveSize)
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
    cells: Array<{ text: string; width: number; size?: number; align?: "left" | "center"; valign?: "top" | "middle"; underlineText?: string; noWrap?: boolean; textFont?: any }>,
    minHeight = 30
  ) => {
    const height = Math.max(
      minHeight,
      ...cells.map((cell) => {
        const size = cell.size || 10
        const innerWidth = cell.width - 14
        const textFont = cell.textFont || font
        const effectiveSize = cell.noWrap ? fitFontSize(cell.text || "-", textFont, size, innerWidth) : size
        const lines = cell.noWrap ? [cell.text || "-"] : wrapText(cell.text || "-", textFont, effectiveSize, innerWidth)
        return 16 + lines.length * Math.max(9, effectiveSize + 4)
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
  const pair = (label: string, value: string, width: number, valueSize = 10, noWrap = false, textFont = font) => ([
    { text: label, width: labelWidth, align: "center" as const, valign: "middle" as const },
    { text: value || "-", width: width - labelWidth, valign: "middle" as const, size: valueSize, noWrap, textFont },
  ])
  const thirdWidth = tableWidth / 3
  const halfWidth = tableWidth / 2
  const hasPaperAttachment = Boolean(application.paperPdfUrl)
  const paperAuthors = (application.paperAuthors || []).map((author: string) => getPublicationAuthorName(author)).join("，")
  const paperDetailText = hasPaperAttachment
    ? `论文题目：${application.paperTitle || ""}\n作者：${paperAuthors}\n申请人位次：${application.applicantAuthorName || ""}，${application.applicantAuthorIndexLabel || ""}\n申请人所在单位：${application.applicantAffiliation || ""}\n总页数：${application.totalPages || ""}；正文页数：${application.bodyPages || ""}\n论文 PDF：${application.paperPdfUrl || ""}`
    : " "

  drawCenteredText("通班学术交流支持项目", margin, y, tableWidth, 16)
  y -= 22
  drawCenteredText("申 请 表", margin, y, tableWidth, 18)
  y -= 28

  drawRow([
    ...pair("姓 名", application.applicantName, thirdWidth),
    ...pair("学 号", application.studentId, thirdWidth, 10, false, latinFont),
    ...pair("性别", application.gender || "-", thirdWidth),
  ], 32)
  drawRow([
    ...pair("联系电话", application.phone || "-", thirdWidth, 10, false, latinFont),
    ...pair("项目类别", application.projectCategory, tableWidth - thirdWidth),
  ], 32)
  drawRow([
    { text: "邮 箱", width: labelWidth, align: "center", valign: "middle" },
    { text: String(application.email || "").trim(), width: tableWidth - labelWidth, valign: "middle", size: 10, noWrap: true, textFont: latinFont },
  ], 32)
  drawRow([
    ...pair("项目名称", application.projectName, halfWidth),
    ...pair("交流地点", application.exchangeLocation, halfWidth),
  ], 34)
  drawRow([
    { text: "项目时间", width: labelWidth, align: "center", valign: "middle" },
    { text: application.projectTime, width: tableWidth - labelWidth, valign: "middle" },
  ], 32)
  if (hasPaperAttachment) {
    drawRow([
      { text: "关联接收论文及其作者单位", width: 96, align: "center", valign: "middle" },
      {
        text: paperDetailText,
        width: tableWidth - 96,
        size: 9,
        underlineText: application.applicantAuthorName,
      },
    ], 108)
  }
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

  if (hasPaperAttachment) {
    drawRow([
      { text: "附件材料：论文全文见后附 PDF", width: tableWidth, valign: "middle" },
    ], 32)
  }

  ensureSpace(52)
  y -= 28
  drawText("签名：____________________", margin + 8, y, 11)
  drawText(`申请时间：${formatApplicationDate(application.applicationDate)}`, a4[0] - margin - 210, y, 11)

  if (hasPaperAttachment) {
    const paperPdfBytes = await fetchPaperPdf(application.paperPdfUrl)
    const paperPdf = await PDFDocument.load(paperPdfBytes)
    const copiedPages = await pdfDoc.copyPages(paperPdf, paperPdf.getPageIndices())
    copiedPages.forEach((copiedPage: any) => pdfDoc.addPage(copiedPage))
  }

  return await pdfDoc.save()
}
