import { readFile } from "fs/promises"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb } from "pdf-lib"
import { hasAcademicExchangePaperPdfAttachment } from "@/lib/academic-exchange-pdf-source"
import { getPublicationAuthorName } from "@/lib/publication-authors"

const TEMPLATE_FILE_NAME = "academic-exchange-application-form-template.pdf"
const TEMPLATE_DIRECTORY = ["public", "templates"]
const BLACK = rgb(0, 0, 0)
const WHITE = rgb(1, 1, 1)
const FILL_FONT_SIZE = 8.5
const NUMBER_FONT_SIZE = 10.2
const DETAIL_LABEL_FONT_SIZE = 10
const DETAIL_CONTENT_VERTICAL_PADDING = FILL_FONT_SIZE * 0.5
const DETAIL_LABEL_VERTICAL_PADDING = DETAIL_LABEL_FONT_SIZE * 0.5
const DETAIL_LINE_HEIGHT_MULTIPLIER = 1.3
const TABLE_OUTER_BORDER_WIDTH = 1
// The source template's Quartz content is fractionally wider than pdf-lib's
// overlay coordinate space. Calibrate extracted template coordinates against
// the rendered fixed rows so every regenerated rule lands on the same pixels.
const alignTemplateCoordinate = (coordinate: number) => coordinate * 1.001176 + 0.0183
const TEMPLATE_TABLE_LEFT = alignTemplateCoordinate(90.753906)
const TEMPLATE_TABLE_RIGHT = alignTemplateCoordinate(515.996094)
const TEMPLATE_TABLE_WIDTH = TEMPLATE_TABLE_RIGHT - TEMPLATE_TABLE_LEFT
const PROJECT_LABEL_DIVIDER = alignTemplateCoordinate(171.537109)
const PROJECT_LABEL_WIDTH = PROJECT_LABEL_DIVIDER - TEMPLATE_TABLE_LEFT
const TABLE_INNER_BORDER_WIDTH = 0.5
const EXPENSE_COLUMN_DIVIDERS = [240.572266, 388.232422].map(alignTemplateCoordinate)
const EXPENSE_COLUMN_WIDTHS = [
  EXPENSE_COLUMN_DIVIDERS[0] - TEMPLATE_TABLE_LEFT,
  EXPENSE_COLUMN_DIVIDERS[1] - EXPENSE_COLUMN_DIVIDERS[0],
  TEMPLATE_TABLE_RIGHT - EXPENSE_COLUMN_DIVIDERS[1],
]
const PERSONAL_TABLE_TOP = 193.806641
const PERSONAL_HEADER_BOTTOM = 215.140625
const PERSONAL_ROW_DIVIDER = 235.994141
const PERSONAL_TABLE_BOTTOM = 256.851562
const PERSONAL_FIRST_ROW_DIVIDERS = [171.537109, 240.572266, 317.279297, 387.994141, 447.201172]
  .map(alignTemplateCoordinate)
const PERSONAL_SECOND_ROW_DIVIDERS = [171.537109, 240.572266, 317.279297]
  .map(alignTemplateCoordinate)
const PROJECT_TABLE_TOP = 273.869141
const PROJECT_HEADER_BOTTOM = 295.203125
const PROJECT_FIXED_ROW_DIVIDER = 316.056641
const PROJECT_DYNAMIC_TOP = 336.433594
const PROJECT_FIXED_DIVIDERS = [171.537109, 317.279297, 388.232422]
  .map(alignTemplateCoordinate)
const CONTINUATION_ROWS_PER_PAGE = 20
const APPLICATION_NUMBER_RECT = { x: 185, top: 145, width: 225, height: 23 }
// The application form explicitly supports direct arXiv PDF links. Keep this
// list deliberately narrow rather than allowing arbitrary external hosts.
const TRUSTED_EXTERNAL_PAPER_PDF_HOSTS = new Set(["arxiv.org"])

type TemplateRect = {
  x: number
  top: number
  width: number
  height: number
}

export function sanitizeAcademicExchangePdfFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "application"
}

async function loadBundledFontBytes(fileName: string) {
  const fontPath = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "public",
    "fonts",
    fileName
  )

  try {
    return await readFile(fontPath)
  } catch {
    return null
  }
}

async function loadApplicationTemplateBytes() {
  const templatePath = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    ...TEMPLATE_DIRECTORY,
    TEMPLATE_FILE_NAME
  )

  try {
    return await readFile(templatePath)
  } catch {
    throw new Error("缺少新版学术交流支持申请表模板")
  }
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim()
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number) {
  const paragraphs = text.split("\n")
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

type StyledTextSegment = {
  text: string
  font: any
}

function wrapStyledTextLines(
  logicalLines: StyledTextSegment[][],
  fontSize: number,
  maxWidth: number
) {
  const wrappedLines: StyledTextSegment[][] = []

  for (const logicalLine of logicalLines) {
    let line: StyledTextSegment[] = []
    let lineWidth = 0
    for (const segment of logicalLine) {
      for (const char of segment.text) {
        const charWidth = segment.font.widthOfTextAtSize(char, fontSize)
        if (line.length > 0 && lineWidth + charWidth > maxWidth) {
          wrappedLines.push(line)
          line = []
          lineWidth = 0
        }
        const previous = line[line.length - 1]
        if (previous?.font === segment.font) {
          previous.text += char
        } else {
          line.push({ text: char, font: segment.font })
        }
        lineWidth += charWidth
      }
    }
    wrappedLines.push(line.length > 0 ? line : [{ text: " ", font: logicalLine[0]?.font }])
  }

  return wrappedLines
}

function getStyledTextRectHeight({
  logicalLines,
  fontSize,
  width,
  paddingX,
  paddingY,
  lineHeightMultiplier,
}: {
  logicalLines: StyledTextSegment[][]
  fontSize: number
  width: number
  paddingX: number
  paddingY: number
  lineHeightMultiplier: number
}) {
  const lines = wrapStyledTextLines(logicalLines, fontSize, Math.max(1, width - paddingX * 2))
  return Math.ceil((lines.length * fontSize * lineHeightMultiplier + paddingY * 2 + 0.01) * 100) / 100
}

function drawStyledTextInTemplateRect({
  page,
  logicalLines,
  rect,
  fontSize,
  paddingX,
  paddingY,
  lineHeightMultiplier,
}: {
  page: any
  logicalLines: StyledTextSegment[][]
  rect: TemplateRect
  fontSize: number
  paddingX: number
  paddingY: number
  lineHeightMultiplier: number
}) {
  const lines = wrapStyledTextLines(logicalLines, fontSize, Math.max(1, rect.width - paddingX * 2))
  const lineHeight = fontSize * lineHeightMultiplier
  const pageHeight = page.getHeight()

  lines.forEach((line, lineIndex) => {
    let x = rect.x + paddingX
    const y = pageHeight - rect.top - paddingY - fontSize - lineIndex * lineHeight
    for (const segment of line) {
      page.drawText(segment.text, { x, y, size: fontSize, font: segment.font, color: BLACK })
      x += segment.font.widthOfTextAtSize(segment.text, fontSize)
    }
  })
}

function getWrappedTextRectHeight({
  text,
  font,
  fontSize,
  width,
  paddingX,
  paddingY,
  lineHeightMultiplier,
}: {
  text: unknown
  font: any
  fontSize: number
  width: number
  paddingX: number
  paddingY: number
  lineHeightMultiplier?: number
}) {
  const content = normalizeText(text) || " "
  const lineHeight = lineHeightMultiplier
    ? fontSize * lineHeightMultiplier
    : Math.max(fontSize + 1.3, fontSize * 1.15)
  const lineCount = wrapText(content, font, fontSize, Math.max(1, width - paddingX * 2)).length
  return Math.ceil((lineCount * lineHeight + paddingY * 2 + 0.01) * 100) / 100
}

function getFixedTextLayout({
  text,
  font,
  fontSize,
  width,
  height,
  paddingX,
  paddingY,
  lineHeightMultiplier,
}: {
  text: string
  font: any
  fontSize: number
  width: number
  height: number
  paddingX: number
  paddingY: number
  lineHeightMultiplier?: number
}) {
  const lineHeight = lineHeightMultiplier
    ? fontSize * lineHeightMultiplier
    : Math.max(fontSize + 1.3, fontSize * 1.15)
  const lines = wrapText(text, font, fontSize, Math.max(1, width - paddingX * 2))
  const maxLines = Math.max(1, Math.floor((height - paddingY * 2) / lineHeight))
  const visibleLines = lines.slice(0, maxLines)

  if (lines.length > maxLines) {
    let finalLine = visibleLines[maxLines - 1].trimEnd()
    const maxWidth = Math.max(1, width - paddingX * 2)
    while (finalLine && font.widthOfTextAtSize(`${finalLine}…`, fontSize) > maxWidth) {
      finalLine = finalLine.slice(0, -1)
    }
    visibleLines[maxLines - 1] = `${finalLine}…`
  }

  return {
    lines: visibleLines,
    size: fontSize,
    lineHeight,
  }
}

function drawTextInTemplateRect({
  page,
  text,
  rect,
  font,
  fontSize = FILL_FONT_SIZE,
  align = "left",
  vertical = "middle",
  paddingX = 5,
  paddingY = 3,
  lineHeightMultiplier,
}: {
  page: any
  text: unknown
  rect: TemplateRect
  font: any
  fontSize?: number
  align?: "left" | "center"
  vertical?: "top" | "middle"
  paddingX?: number
  paddingY?: number
  lineHeightMultiplier?: number
}) {
  const content = normalizeText(text)
  if (!content) return

  const { lines, size, lineHeight } = getFixedTextLayout({
    text: content,
    font,
    fontSize,
    width: rect.width,
    height: rect.height,
    paddingX,
    paddingY,
    lineHeightMultiplier,
  })
  const contentHeight = lines.length * lineHeight
  const topOffset = vertical === "middle"
    ? Math.max(paddingY, (rect.height - contentHeight) / 2)
    : paddingY
  const pageHeight = page.getHeight()

  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, size)
    const x = align === "center"
      ? rect.x + Math.max(paddingX, (rect.width - lineWidth) / 2)
      : rect.x + paddingX
    const y = pageHeight - rect.top - topOffset - size - index * lineHeight
    page.drawText(line, { x, y, size, font, color: BLACK })
  })
}

function clearTemplateRect(page: any, rect: TemplateRect) {
  page.drawRectangle({
    x: rect.x,
    y: page.getHeight() - rect.top - rect.height,
    width: rect.width,
    height: rect.height,
    color: WHITE,
  })
}

function drawTemplateRule({
  page,
  orientation,
  position,
  start,
  end,
  width,
  color = BLACK,
}: {
  page: any
  orientation: "horizontal" | "vertical"
  position: number
  start: number
  end: number
  width: number
  color?: any
}) {
  const pageHeight = page.getHeight()
  if (orientation === "horizontal") {
    page.drawRectangle({
      x: start,
      y: pageHeight - position - width / 2,
      width: end - start,
      height: width,
      color,
    })
    return
  }

  page.drawRectangle({
    x: position - width / 2,
    y: pageHeight - end,
    width,
    height: end - start,
    color,
  })
}

function drawAlignedTableFrame(
  page: any,
  top: number,
  bottom: number,
  width = TABLE_OUTER_BORDER_WIDTH,
  color = BLACK
) {
  drawTemplateRule({
    page,
    orientation: "vertical",
    position: TEMPLATE_TABLE_LEFT,
    start: top,
    end: bottom,
    width,
    color,
  })
  drawTemplateRule({
    page,
    orientation: "vertical",
    position: TEMPLATE_TABLE_RIGHT,
    start: top,
    end: bottom,
    width,
    color,
  })
  for (const position of [top, bottom]) {
    drawTemplateRule({
      page,
      orientation: "horizontal",
      position,
      start: TEMPLATE_TABLE_LEFT,
      end: TEMPLATE_TABLE_RIGHT,
      width,
      color,
    })
  }
}

function redrawFixedTemplateTableFrames(page: any, projectBottom: number) {
  // Remove the template's original 1.5pt outer rules before replacing them;
  // drawing a thinner rule on top would leave the old thickness visible.
  drawAlignedTableFrame(page, PERSONAL_TABLE_TOP, PERSONAL_TABLE_BOTTOM, 2.5, WHITE)
  drawAlignedTableFrame(page, PROJECT_TABLE_TOP, PROJECT_DYNAMIC_TOP, 2.5, WHITE)
  for (const position of [PERSONAL_HEADER_BOTTOM, PROJECT_HEADER_BOTTOM]) {
    drawTemplateRule({
      page,
      orientation: "horizontal",
      position,
      start: TEMPLATE_TABLE_LEFT,
      end: TEMPLATE_TABLE_RIGHT,
      width: 2.5,
      color: WHITE,
    })
  }

  drawAlignedTableFrame(page, PERSONAL_TABLE_TOP, PERSONAL_TABLE_BOTTOM)
  for (const [position, width] of [
    [PERSONAL_HEADER_BOTTOM, TABLE_OUTER_BORDER_WIDTH],
    [PERSONAL_ROW_DIVIDER, TABLE_INNER_BORDER_WIDTH],
  ] as const) {
    drawTemplateRule({
      page,
      orientation: "horizontal",
      position,
      start: TEMPLATE_TABLE_LEFT,
      end: TEMPLATE_TABLE_RIGHT,
      width,
    })
  }
  for (const position of PERSONAL_FIRST_ROW_DIVIDERS) {
    drawTemplateRule({
      page,
      orientation: "vertical",
      position,
      start: PERSONAL_HEADER_BOTTOM,
      end: PERSONAL_ROW_DIVIDER,
      width: TABLE_INNER_BORDER_WIDTH,
    })
  }
  for (const position of PERSONAL_SECOND_ROW_DIVIDERS) {
    drawTemplateRule({
      page,
      orientation: "vertical",
      position,
      start: PERSONAL_ROW_DIVIDER,
      end: PERSONAL_TABLE_BOTTOM,
      width: TABLE_INNER_BORDER_WIDTH,
    })
  }

  drawAlignedTableFrame(page, PROJECT_TABLE_TOP, projectBottom)
  for (const [position, width] of [
    [PROJECT_HEADER_BOTTOM, TABLE_OUTER_BORDER_WIDTH],
    [PROJECT_FIXED_ROW_DIVIDER, TABLE_INNER_BORDER_WIDTH],
    [PROJECT_DYNAMIC_TOP, TABLE_INNER_BORDER_WIDTH],
  ] as const) {
    drawTemplateRule({
      page,
      orientation: "horizontal",
      position,
      start: TEMPLATE_TABLE_LEFT,
      end: TEMPLATE_TABLE_RIGHT,
      width,
    })
  }
  for (const position of PROJECT_FIXED_DIVIDERS) {
    drawTemplateRule({
      page,
      orientation: "vertical",
      position,
      start: PROJECT_HEADER_BOTTOM,
      end: PROJECT_DYNAMIC_TOP,
      width: TABLE_INNER_BORDER_WIDTH,
    })
  }
}

function formatAmount(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ""
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function getTotalAmount(application: any) {
  const explicitTotal = Number(application.totalAmount)
  if (Number.isFinite(explicitTotal)) return explicitTotal
  return (Array.isArray(application.expenseItems) ? application.expenseItems : [])
    .reduce((total: number, item: any) => total + (Number(item?.amount) || 0), 0)
}

function getApplicationDisplayNumber(application: any) {
  const yearMonth = String(application.applicationDate || "").replace(/\D/g, "").slice(0, 6) || "000000"
  const recordSuffix = String(application._id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase() || "申请"
  return `[通] ${yearMonth}-${recordSuffix} 号`
}

function getPaperDetailText(application: any, hasPaperAttachment: boolean) {
  if (application.projectCategory === "出境访学") {
    return "出境访学无需关联论文"
  }

  if (!hasPaperAttachment) {
    return "未关联论文"
  }

  const paperAuthors = (application.paperAuthors || [])
    .map((author: string) => getPublicationAuthorName(author))
    .join("，")

  return [
    `论文题目：${application.paperTitle || ""}`,
    `作者：${paperAuthors}`,
    `申请人位次：${application.applicantAuthorName || ""}，${application.applicantAuthorIndexLabel || ""}`,
    `申请人所在单位：${application.applicantAffiliation || ""}`,
    `总页数：${application.totalPages || ""}；正文页数：${application.bodyPages || ""}`,
  ].join("\n")
}

function getPaperDetailStyledLines(
  application: any,
  hasPaperAttachment: boolean,
  headingFont: any,
  fillFont: any
): StyledTextSegment[][] | null {
  if (application.projectCategory === "出境访学" || !hasPaperAttachment) {
    return null
  }

  const paperAuthors = (application.paperAuthors || [])
    .map((author: string) => getPublicationAuthorName(author))
    .join("，")
  const label = (text: string): StyledTextSegment => ({ text, font: headingFont })
  const content = (text: unknown): StyledTextSegment => ({ text: normalizeText(text), font: fillFont })

  return [
    [label("论文题目："), content(application.paperTitle)],
    [label("作者："), content(paperAuthors)],
    [
      label("申请人位次："),
      content(`${application.applicantAuthorName || ""}，${application.applicantAuthorIndexLabel || ""}`),
    ],
    [label("申请人所在单位："), content(application.applicantAffiliation)],
    [
      label("总页数："),
      content(application.totalPages),
      label("；正文页数："),
      content(application.bodyPages),
    ],
  ]
}

function getR2HostAllowlist() {
  const hostnames = new Set<string>()
  const endpoint = process.env.R2_ENDPOINT?.replace(/\/+$/, "")
  if (endpoint) {
    try {
      hostnames.add(new URL(endpoint).hostname.toLowerCase())
    } catch {
      // ignore — invalid R2 endpoint env
    }
  }
  const accountId = process.env.R2_ACCOUNT_ID
  if (accountId) {
    hostnames.add(`${accountId.toLowerCase()}.r2.cloudflarestorage.com`)
  }
  return hostnames
}

function getExtraHostAllowlist() {
  const raw = process.env.ACADEMIC_EXCHANGE_PDF_ALLOWED_HOSTS || ""
  return new Set(
    raw
      .split(/[,\s]+/)
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  )
}

function isSafePaperPdfUrl(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:") {
    return false
  }

  const host = parsed.hostname.toLowerCase()
  if (!host) return false

  // Block obvious internal / link-local hosts even if an admin accidentally
  // added them to the allowlist.
  if (host === "localhost" || host.endsWith(".localhost")) return false
  if (host === "0.0.0.0" || host === "::1") return false
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|127\.)/.test(host)) return false
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(host)) return false

  const allowlist = new Set([
    ...TRUSTED_EXTERNAL_PAPER_PDF_HOSTS,
    ...getR2HostAllowlist(),
    ...getExtraHostAllowlist(),
  ])
  return allowlist.has(host)
}

async function fetchPaperPdf(url: string) {
  if (!isSafePaperPdfUrl(url)) {
    throw new Error("论文链接主机未在允许列表中")
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/pdf",
      "user-agent": "TongClass academic exchange PDF exporter",
    },
    redirect: "follow",
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

function drawExpenseContinuationPages({
  pages,
  fillFont,
  headingFont,
  numberFont,
  totalFont,
  application,
  expenseItems,
  totalAmount,
}: {
  pages: any[]
  fillFont: any
  headingFont: any
  numberFont: any
  totalFont: any
  application: any
  expenseItems: any[]
  totalAmount: number
}) {
  const tableX = TEMPLATE_TABLE_LEFT
  const tableWidth = TEMPLATE_TABLE_WIDTH
  const columnWidths = EXPENSE_COLUMN_WIDTHS
  const sectionTop = 195.27
  const sectionHeight = 20.4
  const headerTop = sectionTop + sectionHeight
  const rowHeight = 20.4

  pages.forEach((page, pageIndex) => {
    const start = pageIndex * CONTINUATION_ROWS_PER_PAGE
    const currentItems = expenseItems.slice(start, start + CONTINUATION_ROWS_PER_PAGE)
    const isLastPage = pageIndex === pages.length - 1

    clearTemplateRect(page, { x: 70, top: 188, width: 455, height: 590 })
    clearTemplateRect(page, APPLICATION_NUMBER_RECT)
    drawTextInTemplateRect({
      page,
      text: getApplicationDisplayNumber(application),
      rect: APPLICATION_NUMBER_RECT,
      font: numberFont,
      fontSize: NUMBER_FONT_SIZE,
      align: "center",
    })

    const sectionRect = { x: tableX, top: sectionTop, width: tableWidth, height: sectionHeight }
    drawTextInTemplateRect({
      page,
      text: "支出明细（续）",
      rect: sectionRect,
      font: headingFont,
      fontSize: 10,
      align: "center",
      paddingY: 2,
    })

    const headerCells = [
      { text: "项目", width: columnWidths[0] },
      { text: "预计金额（人民币）", width: columnWidths[1] },
      { text: "备注", width: columnWidths[2] },
    ]
    let headerX = tableX
    for (const cell of headerCells) {
      const rect = { x: headerX, top: headerTop, width: cell.width, height: rowHeight }
      drawTextInTemplateRect({ page, text: cell.text, rect, font: fillFont, fontSize: 10, align: "center" })
      headerX += cell.width
    }

    currentItems.forEach((item, rowIndex) => {
      const top = headerTop + rowHeight + rowIndex * rowHeight
      const cells = [
        { text: item?.item || "", width: columnWidths[0], align: "left" as const },
        { text: formatAmount(item?.amount), width: columnWidths[1], align: "center" as const },
        { text: item?.note || "", width: columnWidths[2], align: "left" as const },
      ]
      let columnX = tableX
      for (const cell of cells) {
        const rect = { x: columnX, top, width: cell.width, height: rowHeight }
        drawTextInTemplateRect({ page, text: cell.text, rect, font: fillFont, align: cell.align })
        columnX += cell.width
      }
    })

    const contentBottom = headerTop + rowHeight + currentItems.length * rowHeight
    if (isLastPage) {
      const labelRect = { x: tableX, top: contentBottom, width: columnWidths[0], height: rowHeight }
      const amountRect = { x: tableX + columnWidths[0], top: contentBottom, width: columnWidths[1], height: rowHeight }
      drawTextInTemplateRect({
        page,
        text: "总计",
        rect: labelRect,
        font: totalFont,
        fontSize: 10,
        align: "center",
      })
      drawTextInTemplateRect({
        page,
        text: formatAmount(totalAmount),
        rect: amountRect,
        font: fillFont,
        align: "center",
      })
    }

    const tableBottom = contentBottom + (isLastPage ? rowHeight : 0)
    drawAlignedTableFrame(page, sectionTop, tableBottom)
    drawTemplateRule({
      page,
      orientation: "horizontal",
      position: headerTop,
      start: tableX,
      end: tableX + tableWidth,
      width: TABLE_OUTER_BORDER_WIDTH,
    })
    for (let position = headerTop + rowHeight; position < tableBottom; position += rowHeight) {
      drawTemplateRule({
        page,
        orientation: "horizontal",
        position,
        start: tableX,
        end: tableX + tableWidth,
        width: TABLE_INNER_BORDER_WIDTH,
      })
    }
    for (const position of EXPENSE_COLUMN_DIVIDERS) {
      drawTemplateRule({
        page,
        orientation: "vertical",
        position,
        start: headerTop,
        end: tableBottom,
        width: TABLE_INNER_BORDER_WIDTH,
      })
    }
  })
}

function drawApplicationTemplatePage({
  page,
  fillFont,
  headingFont,
  numberFont,
  totalFont,
  application,
  expenseItems,
  totalAmount,
  hasPaperAttachment,
}: {
  page: any
  fillFont: any
  headingFont: any
  numberFont: any
  totalFont: any
  application: any
  expenseItems: any[]
  totalAmount: number
  hasPaperAttachment: boolean
}) {
  const fields = {
    number: APPLICATION_NUMBER_RECT,
    applicantName: { x: 172.95, top: 215.67, width: 67.67, height: 19.91 },
    studentId: { x: 317.91, top: 215.67, width: 70.31, height: 19.91 },
    gender: { x: 447.99, top: 215.67, width: 67.91, height: 19.91 },
    phone: { x: 171.99, top: 236.07, width: 68.63, height: 19.91 },
    email: { x: 317.91, top: 236.07, width: 197.99, height: 19.91 },
    projectName: { x: 171.99, top: 295.83, width: 145.43, height: 19.91 },
    projectCategory: { x: 388.95, top: 295.83, width: 126.95, height: 19.91 },
    projectTime: { x: 171.99, top: 316.23, width: 145.43, height: 19.91 },
    exchangeLocation: { x: 388.95, top: 316.23, width: 126.95, height: 19.91 },
  }

  clearTemplateRect(page, fields.number)
  drawTextInTemplateRect({
    page,
    text: getApplicationDisplayNumber(application),
    rect: fields.number,
    font: numberFont,
    fontSize: NUMBER_FONT_SIZE,
    align: "center",
  })

  const shortFields = [
    [application.applicantName, fields.applicantName],
    [application.studentId, fields.studentId],
    [application.gender, fields.gender],
    [application.phone, fields.phone],
    [application.email, fields.email],
    [application.projectName, fields.projectName],
    [application.projectCategory, fields.projectCategory],
    [application.projectTime, fields.projectTime],
    [application.exchangeLocation, fields.exchangeLocation],
  ] as const
  for (const [text, rect] of shortFields) {
    drawTextInTemplateRect({ page, text, rect, font: fillFont, align: "center", paddingX: 3, paddingY: 2 })
  }

  const tableX = TEMPLATE_TABLE_LEFT
  const tableWidth = TEMPLATE_TABLE_WIDTH
  const labelWidth = PROJECT_LABEL_WIDTH
  const contentX = tableX + labelWidth
  const contentWidth = tableWidth - labelWidth
  const dynamicRowsTop = PROJECT_DYNAMIC_TOP
  const paperDetailStyledLines = getPaperDetailStyledLines(
    application,
    hasPaperAttachment,
    headingFont,
    fillFont
  )
  const dynamicRows = [
    {
      label: "关联接受论文及\n其作者单位",
      text: getPaperDetailText(application, hasPaperAttachment),
      styledLines: paperDetailStyledLines,
    },
    { label: "其他资助来源", text: application.otherFunding, styledLines: null },
    { label: "项目计划", text: application.projectPlan, styledLines: null },
  ].map((row) => ({
    ...row,
    height: Math.max(
      28,
      getWrappedTextRectHeight({
        text: row.label,
        font: fillFont,
        fontSize: DETAIL_LABEL_FONT_SIZE,
        width: labelWidth,
        paddingX: 4,
        paddingY: DETAIL_LABEL_VERTICAL_PADDING,
        lineHeightMultiplier: DETAIL_LINE_HEIGHT_MULTIPLIER,
      }),
      row.styledLines
        ? getStyledTextRectHeight({
            logicalLines: row.styledLines,
            fontSize: FILL_FONT_SIZE,
            width: contentWidth,
            paddingX: 5,
            paddingY: DETAIL_CONTENT_VERTICAL_PADDING,
            lineHeightMultiplier: DETAIL_LINE_HEIGHT_MULTIPLIER,
          })
        : getWrappedTextRectHeight({
            text: row.text,
            font: fillFont,
            fontSize: FILL_FONT_SIZE,
            width: contentWidth,
            paddingX: 5,
            paddingY: DETAIL_CONTENT_VERTICAL_PADDING,
            lineHeightMultiplier: DETAIL_LINE_HEIGHT_MULTIPLIER,
          })
    ),
  }))

  // Remove the template's fixed-height project rows and expense block, then
  // rebuild them from the wrapped content so no field needs an ellipsis.
  clearTemplateRect(page, {
    x: 88,
    top: dynamicRowsTop,
    width: 430,
    height: 476,
  })

  let dynamicTop = dynamicRowsTop
  dynamicRows.forEach((row, rowIndex) => {
    const labelRect = { x: tableX, top: dynamicTop, width: labelWidth, height: row.height }
    const contentRect = { x: contentX, top: dynamicTop, width: contentWidth, height: row.height }
    drawTextInTemplateRect({
      page,
      text: row.label,
      rect: labelRect,
      font: fillFont,
      fontSize: DETAIL_LABEL_FONT_SIZE,
      align: "center",
      vertical: "middle",
      paddingX: 4,
      paddingY: DETAIL_LABEL_VERTICAL_PADDING,
      lineHeightMultiplier: DETAIL_LINE_HEIGHT_MULTIPLIER,
    })
    if (row.styledLines) {
      drawStyledTextInTemplateRect({
        page,
        logicalLines: row.styledLines,
        rect: contentRect,
        fontSize: FILL_FONT_SIZE,
        paddingX: 5,
        paddingY: DETAIL_CONTENT_VERTICAL_PADDING,
        lineHeightMultiplier: DETAIL_LINE_HEIGHT_MULTIPLIER,
      })
    } else {
      drawTextInTemplateRect({
        page,
        text: row.text,
        rect: contentRect,
        font: fillFont,
        vertical: "top",
        paddingX: 5,
        paddingY: DETAIL_CONTENT_VERTICAL_PADDING,
        lineHeightMultiplier: DETAIL_LINE_HEIGHT_MULTIPLIER,
      })
    }
    dynamicTop += row.height
    if (rowIndex < dynamicRows.length - 1) {
      drawTemplateRule({
        page,
        orientation: "horizontal",
        position: dynamicTop,
        start: tableX,
        end: tableX + tableWidth,
        width: TABLE_INNER_BORDER_WIDTH,
      })
    }
  })

  drawTemplateRule({
    page,
    orientation: "vertical",
    position: contentX,
    start: dynamicRowsTop,
    end: dynamicTop,
    width: TABLE_INNER_BORDER_WIDTH,
  })
  redrawFixedTemplateTableFrames(page, dynamicTop)

  const columnWidths = EXPENSE_COLUMN_WIDTHS
  const sectionTop = dynamicTop + 19.45
  const rowHeight = 20.4
  const headerTop = sectionTop + rowHeight
  const maxFirstPageTableBottom = 790
  const maxItemsWithoutTotal = Math.max(
    0,
    Math.min(6, Math.floor((maxFirstPageTableBottom - sectionTop) / rowHeight) - 2)
  )
  const allItemsFitWithTotal = expenseItems.length <= 6
    && sectionTop + (expenseItems.length + 3) * rowHeight <= maxFirstPageTableBottom
  const firstPageExpenseItemCount = allItemsFitWithTotal
    ? expenseItems.length
    : Math.min(expenseItems.length, Math.max(1, maxItemsWithoutTotal))
  const hasExpenseContinuation = expenseItems.length > firstPageExpenseItemCount
  const firstPageItems = expenseItems.slice(0, firstPageExpenseItemCount)

  const sectionRect = { x: tableX, top: sectionTop, width: tableWidth, height: rowHeight }
  drawTextInTemplateRect({
    page,
    text: "支出明细",
    rect: sectionRect,
    font: headingFont,
    fontSize: 10,
    align: "center",
    paddingY: 2,
  })

  const headerCells = [
    { text: "项目", width: columnWidths[0] },
    { text: "预计金额（人民币）", width: columnWidths[1] },
    { text: "备注", width: columnWidths[2] },
  ]
  let headerX = tableX
  for (const cell of headerCells) {
    const rect = { x: headerX, top: headerTop, width: cell.width, height: rowHeight }
    drawTextInTemplateRect({ page, text: cell.text, rect, font: fillFont, fontSize: 10, align: "center" })
    headerX += cell.width
  }

  firstPageItems.forEach((item, rowIndex) => {
    const top = headerTop + rowHeight + rowIndex * rowHeight
    const cells = [
      { text: item?.item || "", width: columnWidths[0], align: "left" as const },
      { text: formatAmount(item?.amount), width: columnWidths[1], align: "center" as const },
      { text: item?.note || "", width: columnWidths[2], align: "left" as const },
    ]
    let columnX = tableX
    for (const cell of cells) {
      const rect = { x: columnX, top, width: cell.width, height: rowHeight }
      drawTextInTemplateRect({ page, text: cell.text, rect, font: fillFont, align: cell.align })
      columnX += cell.width
    }
  })

  const contentBottom = headerTop + rowHeight + firstPageItems.length * rowHeight
  if (!hasExpenseContinuation) {
    const labelRect = { x: tableX, top: contentBottom, width: columnWidths[0], height: rowHeight }
    const amountRect = { x: tableX + columnWidths[0], top: contentBottom, width: columnWidths[1], height: rowHeight }
    drawTextInTemplateRect({ page, text: "总计", rect: labelRect, font: totalFont, fontSize: 10, align: "center" })
    drawTextInTemplateRect({ page, text: formatAmount(totalAmount), rect: amountRect, font: fillFont, align: "center" })
  }

  const tableBottom = contentBottom + (hasExpenseContinuation ? 0 : rowHeight)
  drawAlignedTableFrame(page, sectionTop, tableBottom)
  drawTemplateRule({
    page,
    orientation: "horizontal",
    position: headerTop,
    start: tableX,
    end: tableX + tableWidth,
    width: TABLE_OUTER_BORDER_WIDTH,
  })
  for (let position = headerTop + rowHeight; position < tableBottom; position += rowHeight) {
    drawTemplateRule({
      page,
      orientation: "horizontal",
      position,
      start: tableX,
      end: tableX + tableWidth,
      width: TABLE_INNER_BORDER_WIDTH,
    })
  }
  for (const position of EXPENSE_COLUMN_DIVIDERS) {
    drawTemplateRule({
      page,
      orientation: "vertical",
      position,
      start: headerTop,
      end: tableBottom,
      width: TABLE_INNER_BORDER_WIDTH,
    })
  }

  drawTextInTemplateRect({
    page,
    text: hasPaperAttachment ? "附件材料：论文全文见后附 PDF" : "附件材料：无",
    rect: { x: 90.4, top: tableBottom + 4, width: 220, height: 14 },
    font: fillFont,
    vertical: "top",
    paddingX: 0.5,
    paddingY: 0.5,
  })

  return { firstPageExpenseItemCount, hasExpenseContinuation }
}

export async function buildAcademicExchangePdf(
  application: any,
  options: { paperPdfBytes?: Uint8Array | null } = {}
) {
  const [templateBytes, fangSongBytes, shuSongBytes, heiTiBytes, kaiTiBytes] = await Promise.all([
    loadApplicationTemplateBytes(),
    loadBundledFontBytes("FZFSK.TTF"),
    loadBundledFontBytes("FZSSK.TTF"),
    loadBundledFontBytes("FZHTK.TTF"),
    loadBundledFontBytes("FZKTK.TTF"),
  ])
  if (!fangSongBytes || !shuSongBytes || !heiTiBytes || !kaiTiBytes) {
    throw new Error("缺少方正仿宋、方正书宋、方正黑体或方正楷体资源，无法生成申请表 PDF")
  }

  const pdfDoc = await PDFDocument.load(templateBytes)
  if (pdfDoc.getPageCount() !== 1) {
    throw new Error("新版学术交流支持申请表模板必须包含且只包含一页")
  }
  pdfDoc.registerFontkit(fontkit)

  const numberFont = await pdfDoc.embedFont(fangSongBytes, { subset: true })
  const fillFont = await pdfDoc.embedFont(shuSongBytes, { subset: true })
  const headingFont = await pdfDoc.embedFont(heiTiBytes, { subset: true })
  const totalFont = await pdfDoc.embedFont(kaiTiBytes, { subset: true })
  const expenseItems = (Array.isArray(application.expenseItems) ? application.expenseItems : [])
    .filter((item: any) => item && (normalizeText(item.item) || Number.isFinite(Number(item.amount)) || normalizeText(item.note)))
  const totalAmount = getTotalAmount(application)
  const hasPaperAttachment = hasAcademicExchangePaperPdfAttachment(application)
  const firstPageLayout = drawApplicationTemplatePage({
    page: pdfDoc.getPage(0),
    fillFont,
    headingFont,
    numberFont,
    totalFont,
    application,
    expenseItems,
    totalAmount,
    hasPaperAttachment,
  })

  if (firstPageLayout.hasExpenseContinuation) {
    const continuationItems = expenseItems.slice(firstPageLayout.firstPageExpenseItemCount)
    const continuationPageCount = Math.ceil(continuationItems.length / CONTINUATION_ROWS_PER_PAGE)
    const continuationTemplateDoc = await PDFDocument.load(templateBytes)
    const continuationPages = await pdfDoc.copyPages(
      continuationTemplateDoc,
      Array.from({ length: continuationPageCount }, () => 0)
    )
    continuationPages.forEach((page) => pdfDoc.addPage(page))
    drawExpenseContinuationPages({
      pages: continuationPages,
      fillFont,
      headingFont,
      numberFont,
      totalFont,
      application,
      expenseItems: continuationItems,
      totalAmount,
    })
  }

  if (hasPaperAttachment) {
    const paperPdfBytes = options.paperPdfBytes || (application.paperPdfUrl ? await fetchPaperPdf(application.paperPdfUrl) : null)
    if (!paperPdfBytes) {
      throw new Error("未找到已上传的论文 PDF")
    }
    const paperPdf = await PDFDocument.load(paperPdfBytes)
    const copiedPages = await pdfDoc.copyPages(paperPdf, paperPdf.getPageIndices())
    copiedPages.forEach((copiedPage: any) => pdfDoc.addPage(copiedPage))
  }

  return await pdfDoc.save()
}
