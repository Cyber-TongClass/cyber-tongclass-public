"use client"

import { useRouter } from "next/navigation"

import { OADocumentImport } from "@/components/oa-documents/oa-document-import"
import {
  getTongClassStoredSessionToken,
  useCreateOrGetOADocumentTemplateVersion,
  useGenerateOADocumentTemplateSourceUploadUrl,
  useManageUpsertOAForm,
} from "@/lib/api"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import {
  assertWordSourceSize,
  DOCX_MIME,
  DOC_MIME,
  normalizeWordSourceType,
  type OADocumentTemplateManifest,
} from "@/lib/oa-document-templates"
import { createWordImportDraftPayload } from "@/lib/oa-word-import-flow"

const COMPILER_VERSION = "aia-ooxml-1"
const SYNTAX_VERSION = "1"

function inferredMimeType(file: File) {
  if (file.type) return file.type
  return file.name.toLocaleLowerCase("en-US").endsWith(".docx") ? DOCX_MIME : DOC_MIME
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function analyzeVersion(versionId: string) {
  const sessionToken = getTongClassStoredSessionToken()
  if (!sessionToken) throw new Error("请先登录")
  const response = await fetch("/api/oa/document-templates/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ versionId }),
  })
  const payload = await response.json().catch(() => ({})) as {
    ok?: boolean
    message?: string
    manifest?: OADocumentTemplateManifest
  }
  if (!response.ok || !payload.ok || !payload.manifest) {
    throw new Error(payload.message || "Word 结构分析失败")
  }
}

export function OADocumentNewFormImport({
  creatorId,
  compact = false,
}: {
  creatorId: string
  compact?: boolean
}) {
  const router = useRouter()
  const upsertForm = useManageUpsertOAForm()
  const generateUpload = useGenerateOADocumentTemplateSourceUploadUrl()
  const createVersion = useCreateOrGetOADocumentTemplateVersion()

  const importWord = async (file: File) => {
    assertWordSourceSize(file.size)
    const bytes = await file.arrayBuffer()
    const mimeType = inferredMimeType(file)
    const sourceType = normalizeWordSourceType(mimeType, file.name, new Uint8Array(bytes))
    const sourceSha256 = await sha256(bytes)
    const nonce = `${Date.now().toString(36)}-${crypto.randomUUID()}`
    const formId = String(await upsertForm(createWordImportDraftPayload(file.name, creatorId, nonce)))
    const target = await generateUpload({ formId, fileName: file.name, mimeType })
    const sourceStorageId = await uploadFileToStorageTarget(target, file, "Word 原文件上传失败")
    const versionId = String(await createVersion({
      formId,
      sourceType,
      sourceFileName: file.name,
      sourceMimeType: mimeType,
      sourceSize: file.size,
      sourceSha256,
      sourceStorageId,
      compilerVersion: COMPILER_VERSION,
      syntaxVersion: SYNTAX_VERSION,
    }))
    await analyzeVersion(versionId)
    router.push(`/forms/manage/${formId}/document-template?versionId=${encodeURIComponent(versionId)}`)
  }

  return <OADocumentImport onSelect={importWord} compact={compact} />
}
