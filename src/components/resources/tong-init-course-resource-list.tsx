"use client"

import { ArrowUpRight, FileArchive, FileText, Presentation } from "lucide-react"
import { useTongInitCourseResources } from "@/lib/api"
import {
  mergeTongInitCourseResources,
  tongAiResearchCourseResources,
  type TongInitCoursePublicManifest,
} from "@/lib/resources/tong-init-course"

function ResourceIcon({ kind }: { kind: "slides" | "exercise" | "supplement" }) {
  if (kind === "slides") return <Presentation className="h-5 w-5" aria-hidden="true" />
  if (kind === "exercise") return <FileArchive className="h-5 w-5" aria-hidden="true" />
  return <FileText className="h-5 w-5" aria-hidden="true" />
}

function formatFileType(fileName?: string) {
  const lowerName = String(fileName || "").toLowerCase()
  if (lowerName.endsWith(".tar.gz")) return "TAR.GZ"
  const extension = lowerName.split(".").pop()
  return extension ? extension.toUpperCase() : "文件"
}

function formatFileSize(size?: number) {
  if (!size) return null
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

export function TongInitCourseResourceList() {
  const manifest = useTongInitCourseResources() as TongInitCoursePublicManifest | undefined
  const resources = mergeTongInitCourseResources(tongAiResearchCourseResources, manifest)

  if (resources.length === 0) {
    return (
      <div className="bg-white px-6 py-16 text-center shadow-sm">
        <FileText className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
        <h2 className="mt-5 text-xl font-extrabold text-slate-900">课程资料即将上线</h2>
        <p className="mt-3 text-slate-600">课件上传后会在这里展示，敬请期待。</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => (
        <a
          key={resource.resourceKey}
          href={resource.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md md:p-6"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary/10 text-primary">
            <ResourceIcon kind={resource.kind} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900 transition-colors group-hover:text-primary">{resource.title}</h2>
            {resource.description ? <p className="mt-1 text-sm text-slate-600">{resource.description}</p> : null}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {[formatFileType(resource.fileName), formatFileSize(resource.size)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-primary" aria-hidden="true" />
        </a>
      ))}
    </div>
  )
}
