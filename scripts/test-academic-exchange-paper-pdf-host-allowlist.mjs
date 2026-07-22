import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { PDFDocument, StandardFonts } from "pdf-lib"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function buildGeneratorModule(temporaryDirectory) {
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

async function makePaperPdf() {
  const document = await PDFDocument.create()
  const page = document.addPage([595.28, 841.89])
  page.drawText("arXiv attachment", {
    x: 48,
    y: 760,
    size: 14,
    font: await document.embedFont(StandardFonts.Helvetica),
  })
  return document.save()
}

test("an arXiv paper URL can be appended to the exported application", async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tongclass-paper-host-"))
  const originalFetch = globalThis.fetch
  const paperUrl = "https://arxiv.org/pdf/2506.13174"
  let requestedUrl = ""

  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(await makePaperPdf(), {
      headers: { "content-type": "application/pdf" },
    })
  }

  try {
    const { buildAcademicExchangePdf } = buildGeneratorModule(temporaryDirectory)
    const pdfBytes = await buildAcademicExchangePdf({
      _id: "arxiv-application",
      applicantName: "严绍恒",
      projectCategory: "学术会议",
      projectName: "ICML",
      projectTime: "2026.07.05-2026.07.12",
      exchangeLocation: "韩国首尔",
      applicationDate: "2026-06-26",
      expenseItems: [{ item: "机票", amount: 100, note: "" }],
      totalAmount: 100,
      paperTitle: "GeoRecon",
      paperPdfUrl: paperUrl,
    })

    assert.equal(requestedUrl, paperUrl)
    assert.equal((await PDFDocument.load(pdfBytes)).getPageCount(), 2)
  } finally {
    globalThis.fetch = originalFetch
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test("an untrusted paper URL remains blocked before it can be fetched", async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tongclass-paper-host-"))
  try {
    const { buildAcademicExchangePdf } = buildGeneratorModule(temporaryDirectory)
    await assert.rejects(
      buildAcademicExchangePdf({
        _id: "untrusted-application",
        projectCategory: "学术会议",
        applicationDate: "2026-06-26",
        expenseItems: [],
        paperPdfUrl: "https://untrusted.example.com/paper.pdf",
      }),
      /论文链接主机未在允许列表中/
    )
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})
