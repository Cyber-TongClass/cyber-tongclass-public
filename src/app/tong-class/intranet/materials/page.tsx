"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Download, FileText } from "lucide-react"
import { getTongClassStoredSessionToken } from "@/lib/api"
import {
  SCHOLARSHIP_REVIEW_MATERIAL_CATEGORY,
  reimbursementMaterialPages,
} from "@/lib/reimbursement-material-pages"

const downloadableSections = [
  {
    title: "培养方案",
    description: "各年级培养方案，可能与现今实际情况相比略有不同或过时，仅供参考，具体请以院办最新通知为准。",
    materials: [
      {
        name: "25级培养方案",
        fileName: "25级培养方案.pdf",
        type: "PDF",
      },
      {
        name: "23级培养方案",
        fileName: "23级培养方案.pdf",
        type: "PDF",
      },
    ],
  },
  {
    title: "学术交流报销相关资料",
    description: "学术交流项目相关的支持方案、报销指引和开支标准，仅供通班内部成员使用。",
    materials: [
      {
        name: "通班学术交流项目支持方案",
        fileName: "通班学术交流项目支持方案.pdf",
        type: "PDF",
      },
      {
        name: "通班学生出国出境报销注意事项",
        fileName: "通班学生出国出境报销注意事项.docx",
        type: "DOCX",
      },
      {
        name: "各国住宿伙食公杂开支标准",
        fileName: "各国住宿伙食公杂开支标准.xlsx",
        type: "XLSX",
      },
    ],
  },
  // {
  //   title: "学生活动报销资料",
  //   description: "学生组织活动相关的报销申请表格和流程说明。",
  //   materials: [],
  // },
  {
    title: "奖学金评选",
    description: "奖学金评选相关的说明材料。",
    materials: [],
    pageCategory: SCHOLARSHIP_REVIEW_MATERIAL_CATEGORY,
  },
]

export default function MaterialsPage() {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState("")

  async function downloadMaterial(fileName: string) {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) {
      setDownloadError("请先登录后下载内部资料。")
      return
    }

    setDownloading(fileName)
    setDownloadError("")
    try {
      const response = await fetch(`/api/intranet-materials/${encodeURIComponent(fileName)}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        cache: "no-store",
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || "资料下载失败")
      }

      const blobUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a")
      anchor.href = blobUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "资料下载失败")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[7rem] lg:text-[9rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none">
            MATERIALS
          </div>
          <Link
            href="/tong-class/intranet"
            className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回内网
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">资料下载</h1>
          <p className="text-lg text-white/70 max-w-2xl mt-2">
            培养方案、报销政策等内部文件资源，请勿分享到公开渠道。
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {downloadableSections.map((section) => {
            const materialPages = section.pageCategory
              ? reimbursementMaterialPages.filter((item) => item.category === section.pageCategory)
              : []
            const hasMaterials = section.materials.length > 0 || materialPages.length > 0

            return (
              <div key={section.title} className="mb-16 last:mb-0">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{section.title}</h2>
                <p className="text-sm text-slate-500 mb-6">{section.description}</p>
                {downloadError ? (
                  <p role="alert" className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {downloadError}
                  </p>
                ) : null}
                {hasMaterials ? (
                  <div className="space-y-3">
                    {section.materials.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => downloadMaterial(item.fileName)}
                        disabled={downloading === item.fileName}
                        className="flex min-h-14 w-full items-center gap-4 bg-white border border-slate-200 rounded-sm px-5 py-4 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-all group disabled:cursor-wait disabled:opacity-60"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                          <Download className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {downloading === item.fileName ? "正在准备安全下载…" : `下载 ${item.type} 文件`}
                          </p>
                        </div>
                      </button>
                    ))}
                    {materialPages.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/tong-class/intranet/reimbursements/materials/${item.slug}`}
                        className="flex items-center gap-4 bg-white border border-slate-200 rounded-sm px-5 py-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-400">查看页面</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-12 text-center bg-white border border-dashed border-slate-200 rounded-sm">
                    暂无文件，敬请期待
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
