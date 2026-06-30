import { makeFunctionReference } from "convex/server"

const getPaperPdfUrlRef = makeFunctionReference<"query">("academicExchange:getPaperPdfUrl")

export async function fetchUploadedAcademicExchangePaperPdf(
  client: { query: (...args: any[]) => Promise<unknown> },
  application: { _id: unknown; paperPdfStorageId?: unknown },
  authArgs: { sessionToken?: string; reviewerSessionToken?: string }
) {
  if (!application.paperPdfStorageId) return null

  const paperPdfUrl = await client.query(getPaperPdfUrlRef, {
    ...authArgs,
    id: application._id as any,
  })

  if (!paperPdfUrl) {
    throw new Error("无法读取已上传的论文 PDF")
  }

  const response = await fetch(String(paperPdfUrl), {
    headers: {
      accept: "application/pdf",
      "user-agent": "TongClass academic exchange uploaded PDF exporter",
    },
  })

  if (!response.ok) {
    throw new Error(`上传论文 PDF 下载失败：${response.status}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  const header = new TextDecoder().decode(bytes.slice(0, 5))
  const contentType = response.headers.get("content-type") || ""
  if (header !== "%PDF-" && !contentType.toLowerCase().includes("pdf")) {
    throw new Error("已上传文件不是有效 PDF")
  }

  return bytes
}
