import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "academic-exchange-brand-"))

function bundle(entry, outputName) {
  const outputPath = path.join(temporaryDirectory, outputName)
  execFileSync(path.join(projectRoot, "node_modules", ".bin", "esbuild"), [
    entry,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--target=node24",
    "--alias:@=./src",
    `--outfile=${outputPath}`,
  ], { cwd: projectRoot, stdio: "pipe" })
  return require(outputPath)
}

function extractPdfText(pdfPath) {
  const result = spawnSync("pdftotext", ["-layout", pdfPath, "-"], {
    cwd: projectRoot,
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}

try {
  const brand = bundle("src/lib/academic-exchange-brand.ts", "brand.cjs")
  const pdf = bundle("src/lib/server/academic-exchange-pdf.ts", "pdf.cjs")

  assert.equal(brand.resolveAcademicExchangeBrand({ pdfBrand: "tong_class" }), "tong_class")
  assert.equal(
    brand.resolveAcademicExchangeBrand({ pdfBrand: "institute", ownerIdentity: { identityType: "undergrad" } }),
    "institute",
    "A persisted snapshot must win over a later identity change",
  )
  assert.equal(brand.resolveAcademicExchangeBrand({ ownerIdentity: { identityType: "undergrad" } }), "tong_class")
  assert.equal(brand.resolveAcademicExchangeBrand({ ownerIdentity: { identityType: "graduate" } }), "institute")
  assert.equal(brand.resolveAcademicExchangeBrand({ ownerIdentity: { identityType: "teacher" } }), "institute")
  assert.equal(brand.resolveAcademicExchangeBrand({}), "institute", "Unknown historical applications default to institute")

  assert.equal(brand.getAcademicExchangeBrandTitle("tong_class"), "北京大学通班学术交流支持")
  assert.equal(brand.getAcademicExchangeBrandTitle("institute"), "北京大学人工智能研究院学术交流支持")
  assert.equal(brand.getAcademicExchangeBrandNumberPrefix("tong_class"), "通")
  assert.equal(brand.getAcademicExchangeBrandNumberPrefix("institute"), "研")
  assert.equal(
    brand.buildAcademicExchangePdfFileName("institute", "国际会议/交流", "李四"),
    "人工智能研究院学术交流支持项目申请表-国际会议_交流-李四.pdf",
  )
  assert.equal(
    brand.parseAcademicExchangePdfContentDisposition(
      "attachment; filename*=UTF-8''%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%E7%A0%94%E7%A9%B6%E9%99%A2.pdf",
    ),
    "人工智能研究院.pdf",
  )
  assert.equal(
    brand.parseAcademicExchangePdfContentDisposition('attachment; filename="fallback.pdf"'),
    "fallback.pdf",
  )
  assert.equal(brand.parseAcademicExchangePdfContentDisposition(null), null)

  const application = {
    _id: "historical-record-202607-003",
    pdfBrand: "institute",
    applicantName: "李四",
    studentId: "G2600001",
    gender: "女",
    phone: "13800138000",
    email: "lisi@pku.edu.cn",
    projectCategory: "出境访学",
    projectName: "国际学术交流",
    projectTime: "2026.08.01-2026.08.05",
    exchangeLocation: "北京",
    otherFunding: "无",
    projectPlan: "参加学术交流。",
    expenseItems: [{ item: "注册费", amount: 100, note: "" }],
    totalAmount: 100,
    applicationDate: "2026-07-31",
  }
  const outputPath = path.join(temporaryDirectory, "institute.pdf")
  fs.writeFileSync(outputPath, await pdf.buildAcademicExchangePdf(application))
  const text = extractPdfText(outputPath)
  assert.match(text, /北京大学人工智能研究院学术交流支持/)
  assert.match(text, /\[研\]\s*202607-/)

  const imagePrefix = path.join(temporaryDirectory, "institute-title")
  execFileSync("pdftoppm", ["-png", "-r", "144", "-f", "1", "-singlefile", outputPath, imagePrefix], {
    stdio: "ignore",
  })
  const { data, info } = await sharp(`${imagePrefix}.png`).greyscale().raw().toBuffer({ resolveWithObject: true })
  const titleBand = { left: 95 * 2, right: 500 * 2, top: 65 * 2, bottom: 130 * 2 }
  let darkPixels = 0
  for (let y = titleBand.top; y < titleBand.bottom; y += 1) {
    for (let x = titleBand.left; x < titleBand.right; x += 1) {
      if (data[y * info.width + x] < 160) darkPixels += 1
    }
  }
  assert.ok(darkPixels > 500, `Redrawn institute title must remain visibly rendered (dark pixels: ${darkPixels})`)

  const routeContracts = [
    ["src/app/api/intranet/academic-exchange/[id]/pdf/route.ts", true],
    ["src/app/api/reviewer/academic-exchange/[id]/pdf/route.ts", false],
    ["src/app/api/reviewer/academic-exchange/export/route.ts", false],
  ]
  for (const [route, mustResolveOwner] of routeContracts) {
    const source = fs.readFileSync(path.join(projectRoot, route), "utf8")
    assert.match(source, /resolveAcademicExchangeBrand/, `${route} must resolve the brand once`)
    assert.match(source, /buildAcademicExchangePdfFileName/, `${route} must use the brand-aware file name`)
    if (mustResolveOwner) {
      assert.match(source, /auth:currentUserBySession/, `${route} must resolve the current applicant identity`)
    }
  }

  const browserDownloadSource = fs.readFileSync(
    path.join(projectRoot, "src/lib/academic-exchange.ts"),
    "utf8",
  )
  assert.match(browserDownloadSource, /parseAcademicExchangePdfContentDisposition/)
  assert.doesNotMatch(
    browserDownloadSource,
    /anchor\.download\s*=\s*`通班学术交流支持项目申请表-/,
    "The browser download name must come from the server's brand-aware response",
  )

  console.log("Academic exchange PDF brand checks passed.")
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true })
}
