import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")

function loadTypeScriptModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  const source = fs.readFileSync(absolutePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  }).outputText

  const loadedModule = { exports: {} }
  const sandbox = {
    __dirname: path.dirname(absolutePath),
    __filename: absolutePath,
    console,
    exports: loadedModule.exports,
    module: loadedModule,
    process,
    require,
  }
  vm.runInNewContext(compiled, sandbox, { filename: absolutePath })
  return loadedModule.exports
}

const pdfSource = loadTypeScriptModule("src/lib/academic-exchange-pdf-source.ts")

test("accepts uploaded paper PDFs with standard PDF metadata", () => {
  assert.equal(
    pdfSource.validateAcademicExchangePaperPdfUpload({
      fileName: "camera-ready.pdf",
      mimeType: "application/pdf",
      size: 1024,
    }),
    null
  )
})

test("rejects uploaded paper files without a PDF extension", () => {
  assert.match(
    pdfSource.validateAcademicExchangePaperPdfUpload({
      fileName: "camera-ready.docx",
      mimeType: "application/pdf",
      size: 1024,
    }),
    /PDF/
  )
})

test("rejects uploaded paper PDFs over the academic exchange size limit", () => {
  assert.match(
    pdfSource.validateAcademicExchangePaperPdfUpload({
      fileName: "oversized.pdf",
      mimeType: "application/pdf",
      size: pdfSource.MAX_ACADEMIC_EXCHANGE_PAPER_PDF_BYTES + 1,
    }),
    /30MB/
  )
})

test("labels uploaded paper PDFs before falling back to external URLs", () => {
  assert.equal(
    pdfSource.getAcademicExchangePaperPdfLabel({
      paperPdfFileName: "latest-version.pdf",
      paperPdfStorageId: "storage-id",
      paperPdfUrl: "https://arxiv.org/pdf/0000.00000",
    }),
    "latest-version.pdf"
  )

  assert.equal(
    pdfSource.getAcademicExchangePaperPdfLabel({
      paperPdfUrl: "https://arxiv.org/pdf/0000.00000",
    }),
    "https://arxiv.org/pdf/0000.00000"
  )
})
