export const MAX_ACADEMIC_EXCHANGE_PAPER_PDF_BYTES = 30 * 1024 * 1024

const PAPER_PDF_MIME_TYPES = new Set(["application/pdf", "application/octet-stream"])

export type AcademicExchangePaperPdfUploadMetadata = {
  fileName?: string | null
  mimeType?: string | null
  size?: number | null
}

export type AcademicExchangePaperPdfLike = {
  paperPdfStorageId?: unknown
  paperPdfFileName?: string | null
  paperPdfUrl?: string | null
}

export function validateAcademicExchangePaperPdfUpload(file: AcademicExchangePaperPdfUploadMetadata) {
  const fileName = String(file.fileName || "").trim()
  const mimeType = String(file.mimeType || "application/octet-stream").trim().toLowerCase()
  const size = Number(file.size || 0)

  if (!fileName.toLowerCase().endsWith(".pdf")) {
    return "论文 PDF 上传仅支持 PDF 文件。"
  }

  if (!PAPER_PDF_MIME_TYPES.has(mimeType)) {
    return "论文 PDF 上传仅支持 PDF 文件。"
  }

  if (!Number.isFinite(size) || size <= 0) {
    return "论文 PDF 文件不能为空。"
  }

  if (size > MAX_ACADEMIC_EXCHANGE_PAPER_PDF_BYTES) {
    return "论文 PDF 文件不能超过 30MB。"
  }

  return null
}

export function hasUploadedAcademicExchangePaperPdf(application: AcademicExchangePaperPdfLike) {
  return Boolean(application.paperPdfStorageId)
}

export function hasAcademicExchangePaperPdfAttachment(application: AcademicExchangePaperPdfLike) {
  return Boolean(application.paperPdfStorageId || application.paperPdfUrl)
}

export function getAcademicExchangePaperPdfLabel(application: AcademicExchangePaperPdfLike) {
  if (application.paperPdfStorageId) {
    return application.paperPdfFileName || "已上传 PDF"
  }
  return application.paperPdfUrl || ""
}
