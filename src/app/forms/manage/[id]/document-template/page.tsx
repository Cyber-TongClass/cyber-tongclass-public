"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, FileCheck2 } from "lucide-react"

import { OADocumentImport } from "@/components/oa-documents/oa-document-import"
import { OADocumentWorkbench } from "@/components/oa-documents/oa-document-workbench"
import {
  getTongClassStoredSessionToken,
  useCreateOrGetOADocumentTemplateVersion,
  useGenerateOADocumentTemplateSourceUploadUrl,
  useManageOAForm,
  useManageUpsertOAForm,
  useOADocumentTemplateVersion,
  useSaveOADocumentTemplateReview,
} from "@/lib/api"
import { uploadFileToStorageTarget } from "@/lib/file-upload"
import {
  buildReviewedDocumentManifest,
  mergeDocumentManifestFields,
} from "@/lib/oa-document-template-client"
import {
  assertWordSourceSize,
  DOCX_MIME,
  DOC_MIME,
  normalizeWordSourceType,
  type OADocumentTemplateCapabilities,
  type OADocumentTemplateManifest,
  type OADocumentTemplateWarning,
} from "@/lib/oa-document-templates"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAForm } from "@/types"

const COMPILER_VERSION = "aia-ooxml-1"
const SYNTAX_VERSION = "1"

type ManagedDocumentForm = OAForm & { activeDocumentTemplateVersionId?: string }
type ManagedDocumentVersion = {
  _id: string
  status: string
  sourceFileName: string
  version: number
  manifest: OADocumentTemplateManifest
  warnings?: OADocumentTemplateWarning[]
  capabilities?: OADocumentTemplateCapabilities
  workingStorageId?: string
  previewStorageId?: string
}

function inferredMimeType(file: File) {
  if (file.type) return file.type
  return file.name.toLocaleLowerCase("en-US").endsWith(".docx") ? DOCX_MIME : DOC_MIME
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function routeRequest(path: string, versionId: string) {
  const sessionToken = getTongClassStoredSessionToken()
  if (!sessionToken) throw new Error("请先登录")
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ versionId }),
  })
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string; manifest?: OADocumentTemplateManifest }
  if (!response.ok || !payload.ok) throw new Error(payload.message || "Word 模板处理失败")
  return payload
}

export default function OADocumentTemplatePage() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading } = useAuth()
  const form = useManageOAForm(params.id) as ManagedDocumentForm | null | undefined
  const [versionId, setVersionId] = useState<string | null>(null)
  const version = useOADocumentTemplateVersion(versionId) as ManagedDocumentVersion | null | undefined
  const generateUpload = useGenerateOADocumentTemplateSourceUploadUrl()
  const createVersion = useCreateOrGetOADocumentTemplateVersion()
  const saveReview = useSaveOADocumentTemplateReview()
  const upsertForm = useManageUpsertOAForm()
  const [manifest, setManifest] = useState<OADocumentTemplateManifest | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!versionId && form?.activeDocumentTemplateVersionId) setVersionId(form.activeDocumentTemplateVersionId)
  }, [form?.activeDocumentTemplateVersionId, versionId])

  useEffect(() => {
    if (version?.manifest) setManifest(version.manifest)
  }, [version?._id, version?.manifest])

  async function importWord(file: File) {
    if (!form) throw new Error("表单尚未加载完成")
    setBusy(true)
    setMessage("")
    try {
      assertWordSourceSize(file.size)
      const bytes = await file.arrayBuffer()
      const mimeType = inferredMimeType(file)
      const sourceType = normalizeWordSourceType(mimeType, file.name, new Uint8Array(bytes))
      const sourceSha256 = await sha256(bytes)
      const target = await generateUpload({ formId: form._id, fileName: file.name, mimeType })
      const sourceStorageId = await uploadFileToStorageTarget(target, file, "Word 原文件上传失败")
      const nextVersionId = String(await createVersion({
        formId: form._id,
        sourceType,
        sourceFileName: file.name,
        sourceMimeType: mimeType,
        sourceSize: file.size,
        sourceSha256,
        sourceStorageId,
        compilerVersion: COMPILER_VERSION,
        syntaxVersion: SYNTAX_VERSION,
      }))
      setVersionId(nextVersionId)
      const analyzed = await routeRequest("/api/oa/document-templates/analyze", nextVersionId)
      if (!analyzed.manifest) throw new Error("分析结果不完整")
      setManifest(analyzed.manifest)
      setMessage("Word 结构分析完成，请逐项确认批注。")
    } finally {
      setBusy(false)
    }
  }

  async function persistReview(nextManifest: OADocumentTemplateManifest) {
    if (!versionId) throw new Error("模板版本尚未创建")
    await saveReview({
      versionId,
      manifest: nextManifest,
      warnings: version?.warnings || [],
      capabilities: version?.capabilities || {},
      ...(version?.workingStorageId ? { workingStorageId: version.workingStorageId } : {}),
      ...(version?.previewStorageId ? { previewStorageId: version.previewStorageId } : {}),
    })
    setManifest(nextManifest)
  }

  async function compileAndActivate(draftManifest: OADocumentTemplateManifest) {
    if (!versionId || !form) throw new Error("模板版本尚未创建")
    setBusy(true)
    setMessage("")
    try {
      const reviewedManifest = buildReviewedDocumentManifest(draftManifest)
      await persistReview(reviewedManifest)
      await routeRequest("/api/oa/document-templates/compile", versionId)
      const fields = mergeDocumentManifestFields(form.fields, reviewedManifest)
      await upsertForm({ ...form, id: form._id, fields })
      setManifest(reviewedManifest)
      setMessage(`原格式模板已启用，${reviewedManifest.fields.length} 个 Word 字段已绑定到收集表单。`)
    } finally {
      setBusy(false)
    }
  }

  if (isLoading || (isAuthenticated && form === undefined)) {
    return <main className="container-custom py-12"><p role="status" className="aia-text-muted text-sm">正在加载原格式模板…</p></main>
  }
  if (!isAuthenticated) {
    return <main className="container-custom max-w-3xl py-12"><p className="aia-text-muted text-sm">请先登录后管理 Word 原格式模板。</p></main>
  }
  if (!form) {
    return <main className="container-custom max-w-3xl py-12"><p role="alert" className="aia-text-muted text-sm">表单不存在或无权访问。</p></main>
  }

  const isCompiled = version?.status === "compiled" || version?.status === "active"

  return (
    <main className="container-custom max-w-6xl py-10 sm:py-12">
      <Link href={`/forms/manage/${form._id}`} className="aia-link aia-focus text-sm font-medium">
        <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回编辑表单
      </Link>
      <header className="mt-8 border-b aia-border-rule pb-7">
        <p className="aia-kicker">OA · ORIGINAL WORD</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">原格式 Word 模板</h1>
        <p className="aia-text-muted mt-2 max-w-3xl text-sm leading-6">
          为「{form.title}」导入上级下发的 .docx 或 .doc。平台保留原文件，识别可填写区域，并在确认后把字段绑定到原始版式。
        </p>
      </header>

      {message ? <p role="status" className="mt-5 border-l-2 border-[hsl(var(--aia-red))] pl-3 text-sm text-[hsl(var(--aia-ink))]">{message}</p> : null}

      <section className="mt-8">
        <OADocumentImport onSelect={importWord} />
        {busy ? <p role="status" className="aia-mono mt-3 text-xs aia-text-muted">正在安全处理文件，请勿关闭页面…</p> : null}
      </section>

      {isCompiled && version ? (
        <section className="mt-8 border-y aia-border-rule py-7">
          <div className="flex flex-wrap items-start gap-4">
            <FileCheck2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="aia-kicker text-emerald-700">ACTIVE BINDING</p>
              <h2 className="aia-serif mt-2 text-xl font-semibold text-[hsl(var(--aia-ink))]">原格式模板已绑定</h2>
              <p className="aia-text-muted mt-2 text-sm leading-6">
                版本 {version.version} · {version.sourceFileName} · {version.manifest.fields.length} 个字段。再次上传会创建不可变的新版本，不会覆盖已有提交所引用的模板。
              </p>
            </div>
          </div>
        </section>
      ) : manifest && versionId && version ? (
        <section className="mt-8">
          <OADocumentWorkbench
            key={versionId}
            initialManifest={manifest}
            onChange={setManifest}
            onSave={persistReview}
            onCompile={compileAndActivate}
            compiling={busy}
          />
        </section>
      ) : versionId && version === undefined ? (
        <p role="status" className="aia-text-muted mt-8 border-y aia-border-rule py-7 text-sm">正在读取模板版本…</p>
      ) : null}
    </main>
  )
}
