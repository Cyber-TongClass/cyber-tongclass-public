"use client"

import { useEffect, useState } from "react"
import { IntranetSectionCard } from "@/components/intranet/intranet-section-card"
import {
  createDefaultIntranetModuleSettings,
  normalizeIntranetModuleSettings,
  defaultIntranetModules,
  getConfiguredIntranetModules,
  type IntranetModuleDefinition,
} from "@/lib/intranet-modules"
import { useCC2026List } from "@/lib/api"

export default function IntranetPage() {
  const cc2026Modules = useCC2026List("intranet_modules")
  const [intranetSections, setIntranetSections] = useState<IntranetModuleDefinition[]>([])

  useEffect(() => {
    const raw = (cc2026Modules || []).find((d: any) => d.key === "_")
    if (raw) {
      try {
        const settings = normalizeIntranetModuleSettings(JSON.parse(raw.value))
        setIntranetSections(getConfiguredIntranetModules(settings))
      } catch {
        setIntranetSections(getConfiguredIntranetModules(createDefaultIntranetModuleSettings()))
      }
    } else {
      setIntranetSections(getConfiguredIntranetModules())
    }
  }, [cc2026Modules])

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">INTRANET</div>
          <div className="mb-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">内部网站</h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative">
            这是一个仅面向通班成员的内部网站，包含内部论坛、意见反馈、内部工具和协作入口等内容。请不要将此网页的内部资源分享到公开渠道哦～
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {intranetSections.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {intranetSections.map((section) => (
                <IntranetSectionCard
                  key={section.id}
                  href={section.href}
                  title={section.title}
                  description={section.description}
                  icon={section.icon}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
              暂无可展示的内网模块。
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
