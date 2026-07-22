import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { PDFDocument, StandardFonts } from "pdf-lib"
import sharp from "sharp"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const templatePath = path.join(projectRoot, "public", "templates", "academic-exchange-application-form-template.pdf")
const fangSongPath = path.join(projectRoot, "public", "fonts", "FZFSK.TTF")
const shuSongPath = path.join(projectRoot, "public", "fonts", "FZSSK.TTF")
const kaiTiPath = path.join(projectRoot, "public", "fonts", "FZKTK.TTF")
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tongclass-academic-exchange-pdf-"))

function buildGeneratorModule() {
  const bundlePath = path.join(temporaryDirectory, "academic-exchange-pdf.cjs")
  execFileSync(path.join(projectRoot, "node_modules", ".bin", "esbuild"), [
    "src/lib/server/academic-exchange-pdf.ts",
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--target=node24",
    "--alias:@=./src",
    `--outfile=${bundlePath}`,
  ], {
    cwd: projectRoot,
    stdio: "pipe",
  })
  return require(bundlePath)
}

function extractPdfText(pdfBytes, fileName) {
  const pdfPath = path.join(temporaryDirectory, fileName)
  fs.writeFileSync(pdfPath, pdfBytes)
  const result = spawnSync("pdftotext", ["-layout", pdfPath, "-"], {
    cwd: projectRoot,
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}

function inspectPdf(pdfBytes, fileName) {
  const pdfPath = path.join(temporaryDirectory, fileName)
  fs.writeFileSync(pdfPath, pdfBytes)
  const fonts = execFileSync("pdffonts", [pdfPath], { encoding: "utf8" })
  const xml = execFileSync("pdftohtml", ["-xml", "-i", "-hidden", "-stdout", pdfPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
  return { pdfPath, fonts, xml }
}

function parseTextRuns(xml) {
  const fonts = new Map(
    [...xml.matchAll(/<fontspec id="([^"]+)" size="([^"]+)" family="([^"]+)"/g)]
      .map((match) => [match[1], { size: Number(match[2]), family: match[3] }])
  )
  const pageMatches = [...xml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)]
  return pageMatches.map((pageMatch) => {
    const pageXml = pageMatch[1]
    return [...pageXml.matchAll(/<text top="([^"]+)" left="([^"]+)"[^>]*font="([^"]+)">([\s\S]*?)<\/text>/g)]
      .map((match) => ({
        top: Number(match[1]),
        left: Number(match[2]),
        text: match[4].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim(),
        ...fonts.get(match[3]),
      }))
  })
}

function findRun(runs, text) {
  const needle = text.replace(/\s+/g, "")
  const run = runs.find((candidate) => candidate.text.replace(/\s+/g, "").includes(needle))
  assert.ok(run, `Expected PDF text run containing: ${text}`)
  return run
}

function findTopmostRun(runs, text) {
  const needle = text.replace(/\s+/g, "")
  const run = runs
    .filter((candidate) => candidate.text.replace(/\s+/g, "").includes(needle))
    .sort((left, right) => left.top - right.top)[0]
  assert.ok(run, `Expected PDF text run containing: ${text}`)
  return run
}

async function assertExpenseTableBottomBorderIsIntact(pdfPath, expectedBottomTop) {
  const imagePrefix = path.join(temporaryDirectory, "outbound-border")
  execFileSync("pdftoppm", ["-png", "-r", "144", "-f", "1", "-singlefile", pdfPath, imagePrefix], {
    stdio: "ignore",
  })
  const { data, info } = await sharp(`${imagePrefix}.png`).greyscale().raw().toBuffer({ resolveWithObject: true })
  const scale = 2
  const xStart = Math.round(91.59 * scale)
  const xEnd = Math.round(515.9 * scale)
  const expectedY = Math.round(expectedBottomTop * scale)
  let bestCoverage = 0

  for (let y = expectedY - 4; y <= expectedY + 4; y += 1) {
    let darkPixels = 0
    for (let x = xStart; x <= xEnd; x += 1) {
      if (data[y * info.width + x] < 128) darkPixels += 1
    }
    bestCoverage = Math.max(bestCoverage, darkPixels / (xEnd - xStart + 1))
  }

  assert.ok(bestCoverage > 0.9, `Expense table bottom border is covered (dark coverage ${bestCoverage.toFixed(3)})`)
}

async function assertContinuationOuterBordersAreBold(pdfPath) {
  const imagePrefix = path.join(temporaryDirectory, "continuation-border")
  execFileSync("pdftoppm", ["-png", "-r", "288", "-f", "2", "-singlefile", pdfPath, imagePrefix], {
    stdio: "ignore",
  })
  const { data, info } = await sharp(`${imagePrefix}.png`).greyscale().raw().toBuffer({ resolveWithObject: true })
  const scale = 4
  const y = Math.round(246.27 * scale)

  const getDarkRun = (pointX) => {
    const centerX = Math.round(pointX * scale)
    let bestRun = 0
    let currentRun = 0
    for (let x = centerX - 8; x <= centerX + 8; x += 1) {
      if (data[y * info.width + x] < 128) {
        currentRun += 1
        bestRun = Math.max(bestRun, currentRun)
      } else {
        currentRun = 0
      }
    }
    return bestRun
  }

  assert.ok(getDarkRun(91.59) >= 6, "Continuation table left outer border must render at 1.5pt")
  assert.ok(getDarkRun(515.9) >= 6, "Continuation table right outer border must render at 1.5pt")
}

async function assertFirstPageOuterBordersAreBold(pdfPath) {
  const imagePrefix = path.join(temporaryDirectory, "first-page-border")
  execFileSync("pdftoppm", ["-png", "-r", "288", "-f", "1", "-singlefile", pdfPath, imagePrefix], {
    stdio: "ignore",
  })
  const { data, info } = await sharp(`${imagePrefix}.png`).greyscale().raw().toBuffer({ resolveWithObject: true })
  const scale = 4

  const getDarkRun = (pointX, pointY) => {
    const centerX = Math.round(pointX * scale)
    const y = Math.round(pointY * scale)
    let bestRun = 0
    let currentRun = 0
    for (let x = centerX - 8; x <= centerX + 8; x += 1) {
      if (data[y * info.width + x] < 128) {
        currentRun += 1
        bestRun = Math.max(bestRun, currentRun)
      } else {
        currentRun = 0
      }
    }
    return bestRun
  }

  for (const y of [360, 520]) {
    assert.ok(getDarkRun(91.59, y) >= 6, `First-page left outer border at ${y}pt must render at 1.5pt`)
    assert.ok(getDarkRun(515.9, y) >= 6, `First-page right outer border at ${y}pt must render at 1.5pt`)
  }
}

function makeExpenseItems(count) {
  return Array.from({ length: count }, (_, index) => ({
    item: `费用项目 ${index + 1}`,
    amount: (index + 1) * 100,
    note: `备注 ${index + 1}`,
  }))
}

async function makeAttachmentPdf() {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  page.drawText("Attached paper page", {
    x: 48,
    y: 760,
    size: 14,
    font: await pdfDoc.embedFont(StandardFonts.Helvetica),
  })
  return await pdfDoc.save()
}

try {
  assert.ok(fs.existsSync(templatePath), "The new PDF template must be deployed with the application")
  assert.ok(fs.existsSync(fangSongPath), "FZ FangSong must be deployed for the application number")
  assert.ok(fs.existsSync(shuSongPath), "FZ ShuSong must be deployed for all filled form content")
  assert.ok(fs.existsSync(kaiTiPath), "FZ KaiTi must be deployed for the final total label")

  const { buildAcademicExchangePdf } = buildGeneratorModule()
  const outboundApplication = {
    _id: "outbound-record-202607-001",
    applicantName: "张三",
    studentId: "2300012345",
    gender: "男",
    phone: "13800138000",
    email: "2300012345@stu.pku.edu.cn",
    projectCategory: "出境访学",
    projectName: "剑桥大学暑期访学",
    projectTime: "2026.08.01-2026.08.21",
    exchangeLocation: "英国剑桥",
    otherFunding: "学院国际交流专项",
    projectPlan: "参加课程、实验室访问与学术交流。",
    expenseItems: makeExpenseItems(7),
    totalAmount: 2800,
    applicationDate: "2026-07-20",
  }

  const outboundPdf = await buildAcademicExchangePdf(outboundApplication)
  const outboundDocument = await PDFDocument.load(outboundPdf)
  const outboundText = extractPdfText(outboundPdf, "outbound-sample.pdf")
  const outboundInspection = inspectPdf(outboundPdf, "outbound-inspection.pdf")
  const outboundRuns = parseTextRuns(outboundInspection.xml)
  assert.equal(outboundDocument.getPageCount(), 2, "Seven expense rows must create a continuation page")
  assert.match(outboundText, /北京大学通班学术交流支持/)
  assert.match(outboundText, /张三/)
  assert.match(outboundText, /剑桥大学暑期访学/)
  assert.match(outboundText, /出境访学无需关联论文/)
  assert.match(outboundText, /支出明细（续）/)
  assert.match(outboundText, /费用项目 7/)
  assert.match(outboundInspection.fonts, /FZFSK--GBK1-0/, "Application numbers must use FZ FangSong")
  assert.match(outboundInspection.fonts, /FZSSK--GBK1-0/, "Filled content must use FZ ShuSong")
  assert.doesNotMatch(outboundInspection.fonts, /SourceHanSansSC|Helvetica/, "Export must not mix substitute fill fonts")

  const pageOneRuns = outboundRuns[0]
  const pageTwoRuns = outboundRuns[1]
  const dynamicPageOneValues = [
    "张三",
    "2300012345",
    "男",
    "13800138000",
    "2300012345@stu.pku.edu.cn",
    "剑桥大学暑期访学",
    "出境访学",
    "2026.08.01-2026.08.21",
    "英国剑桥",
    "学院国际交流专项",
    "参加课程、实验室访问与学术交流。",
    "费用项目 1",
    "附件材料：无",
  ]
  const pageOneDynamicRuns = dynamicPageOneValues.map((value) => findRun(pageOneRuns, value))
  assert.ok(pageOneDynamicRuns.every((run) => /FZSSK/.test(run.family)), "Every filled value on page one must use FZ ShuSong")
  assert.equal(new Set(pageOneDynamicRuns.map((run) => run.size)).size, 1, "Every filled value on page one must use one font size")

  const applicationNumberRun = findRun(pageOneRuns, "202607-607001")
  assert.match(applicationNumberRun.family, /FZFSK/, "The generated application number must use FZ FangSong")
  const continuationExpenseRun = findRun(pageTwoRuns, "费用项目 7")
  assert.match(continuationExpenseRun.family, /FZSSK/, "Continuation-page filled content must use FZ ShuSong")
  assert.equal(continuationExpenseRun.size, pageOneDynamicRuns[0].size, "Continuation-page fill size must match page one")
  assert.equal(
    pageOneRuns.filter((run) => run.text.replace(/\s+/g, "").includes("2,800.00")).length,
    0,
    "The first page must not show a total when expenses continue onto another page"
  )
  const continuationAmountRun = findRun(pageTwoRuns, "2,800.00")
  assert.ok(
    continuationAmountRun.top - continuationExpenseRun.top < 50,
    "The final total row must immediately follow the actual continuation items"
  )
  const continuationTotalRun = pageTwoRuns
    .filter((run) => run.text.replace(/\s+/g, "") === "总计")
    .sort((left, right) => left.top - right.top)[0]
  assert.ok(continuationTotalRun, "The final continuation page must show a total label")
  assert.match(continuationTotalRun.family, /FZKTK/, "The final total label must use FZ KaiTi")

  const pageOneTitle = findRun(pageOneRuns, "北京大学通班学术交流支持")
  const pageTwoTitle = findRun(pageTwoRuns, "北京大学通班学术交流支持")
  assert.ok(Math.abs(pageOneTitle.top - pageTwoTitle.top) <= 2, "Continuation-page title must keep the first-page vertical layout")
  assert.ok(Math.abs(pageOneTitle.left - pageTwoTitle.left) <= 2, "Continuation-page title must keep the first-page horizontal layout")
  assert.equal(pageTwoTitle.family, pageOneTitle.family, "Continuation-page title must keep the first-page font")
  const compactProjectPlanLabelRun = findTopmostRun(pageOneRuns, "项目计划")
  const compactExpenseHeadingRun = findTopmostRun(pageOneRuns, "支出明细")
  const compactProjectPlanToExpenseGap = compactExpenseHeadingRun.top - compactProjectPlanLabelRun.top
  assert.ok(
    compactProjectPlanToExpenseGap < 80,
    `Paper, funding, and project-plan rows must compact to their wrapped content height (gap ${compactProjectPlanToExpenseGap})`
  )
  await assertExpenseTableBottomBorderIsIntact(outboundInspection.pdfPath, 608.28)
  await assertContinuationOuterBordersAreBold(outboundInspection.pdfPath)

  const paperApplication = {
    ...outboundApplication,
    _id: "paper-record-202607-002",
    projectCategory: "学术会议",
    projectName: "国际人工智能学术会议",
    expenseItems: makeExpenseItems(1),
    totalAmount: 100,
    paperTitle: "GeoRecon: Graph-Level Representation Learning for 3D Molecules via Reconstruction-Based Pretraining",
    paperAuthors: ["张三", "李四"],
    applicantAuthorName: "张三",
    applicantAuthorIndexLabel: "第一作者",
    applicantAffiliation: "北京大学人工智能研究院",
    totalPages: 12,
    bodyPages: 9,
    paperPdfUrl: "https://example.com/paper.pdf",
    otherFunding: "学院国际交流专项已提供部分注册费支持，申请人仍需自行承担国际旅费、住宿费及会议期间必要支出；本申请所列金额未与其他渠道重复申报。资助来源说明结束。",
    projectPlan: "2026年7月5日乘飞机抵达韩国首尔，完成会议注册并参加大会报告、专题研讨和学术交流；会议期间展示研究成果并与同行讨论后续合作，7月12日乘飞机返回北京。行程安排和学术交流计划说明结束。",
  }
  const paperPdf = await buildAcademicExchangePdf(paperApplication, {
    paperPdfBytes: await makeAttachmentPdf(),
  })
  const paperDocument = await PDFDocument.load(paperPdf)
  const paperText = extractPdfText(paperPdf, "paper-sample.pdf")
  const paperInspection = inspectPdf(paperPdf, "paper-inspection.pdf")
  const paperRuns = parseTextRuns(paperInspection.xml)[0]
  assert.equal(paperDocument.getPageCount(), 2, "A paper-backed application must append the supplied paper PDF")
  assert.match(paperText, /论文题目：GeoRecon/)
  assert.match(paperText, /申请人所在单位：北京大学人工智能研究院/)
  assert.match(paperText, /资助来源说明结束/)
  assert.match(paperText, /学术交流计划说明结束/)
  assert.doesNotMatch(paperText, /…/, "Dynamic project-information rows must not truncate content with an ellipsis")
  assert.match(paperText, /Attached paper page/)
  const paperTitleRun = findTopmostRun(paperRuns, "论文题目：GeoRecon")
  const paperTitleTopPadding = paperTitleRun.top - 336.63 * 1.5
  assert.ok(
    paperTitleTopPadding >= 6.25,
    `Dynamic detail cells must keep 0.5em vertical padding (top padding ${paperTitleTopPadding.toFixed(2)}px)`
  )
  await assertFirstPageOuterBordersAreBold(paperInspection.pdfPath)
  const singleExpenseRun = findRun(paperRuns, "费用项目 1")
  const singleExpenseTotalRun = paperRuns
    .filter((run) => run.text.replace(/\s+/g, "") === "总计")
    .sort((left, right) => left.top - right.top)[0]
  assert.ok(singleExpenseTotalRun, "A one-item first page must show a total label")
  assert.ok(
    singleExpenseTotalRun.top - singleExpenseRun.top < 50,
    "A first-page total must immediately follow the actual expense items without blank rows"
  )

  console.log("Academic exchange PDF template checks passed.")
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true })
}
