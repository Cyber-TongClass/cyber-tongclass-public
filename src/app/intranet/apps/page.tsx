"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useCC2026ListAll } from "@/lib/api"
import {
  creativeAppMeta,
  creativeAppStatusLabels,
  deployedChallengeApps,
  type CreativeAppSlug,
} from "@/lib/creative-apps"
import type { CreativeChallengeRegistration } from "@/lib/creative-challenge-2026"

const APP_ICONS: Record<CreativeAppSlug, LucideIcon> = {
  "class-notes": FileText,
  tongxiaomiao: Sparkles,
  jiahui: CalendarDays,
  admission: Search,
  yizhi: BookOpen,
}

function parseRegistrations(listAll: unknown): CreativeChallengeRegistration[] {
  const reg = (listAll as any)?.registration
  if (!reg || typeof reg !== "object") return []
  try {
    const raw = reg._ ? JSON.parse(reg._) : null
    if (Array.isArray(raw)) return raw as CreativeChallengeRegistration[]
  } catch {
    // ignore malformed data
  }
  return []
}

export default function CreativeAppsPage() {
  const cc2026ListAll = useCC2026ListAll()
  const projects = useMemo(() => parseRegistrations(cc2026ListAll), [cc2026ListAll])

  const appEntries = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]))
    return deployedChallengeApps
      .filter((app) => app.enabled)
      .map((app) => ({ app, project: byId.get(app.registrationId) || null }))
  }, [projects])

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/intranet"
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回内网
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md bg-slate-100 text-slate-700">
              CC2026 获奖作品
            </Badge>
            <Badge variant="outline" className="rounded-md">
              仅限通班成员
            </Badge>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
            创意工具
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            这里汇集智慧通班创意开发挑战赛 2026 获奖作品的在线工具入口。项目介绍、演示和仓库链接来自比赛报名信息；
            各工具按接入进度逐步开放，标记为“接入准备中”的项目请稍后再来。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {appEntries.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {appEntries.map(({ app, project }) => {
              const meta = creativeAppMeta[app.slug]
              const Icon = APP_ICONS[app.slug]
              return (
                <Link key={app.slug} href={`/intranet/apps/${app.slug}`} className="group block">
                  <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:shadow-sm">
                    <CardContent className="flex h-full flex-col gap-4 pt-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <h2 className="text-lg font-bold text-slate-950 group-hover:text-primary">
                              {meta.shortTitle}
                            </h2>
                            <p className="text-xs text-slate-500">
                              {project?.projectName || "获奖作品"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={app.status === "online" ? "success" : "secondary"}
                          className="rounded-md whitespace-nowrap"
                        >
                          {creativeAppStatusLabels[app.status]}
                        </Badge>
                      </div>

                      <p className="line-clamp-3 flex-1 text-sm leading-7 text-slate-600">
                        {project?.projectSummary || meta.tagline}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {project?.teamName ? <span>队伍：{project.teamName}</span> : null}
                          <Badge variant="outline" className="rounded-md text-[11px]">
                            {app.delivery === "local" ? "本地工具" : "在线工具"}
                          </Badge>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-primary">
                          查看详情
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
            暂无已接入的创意工具。
          </div>
        )}

        <div className="mt-10 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-600">
          <p className="font-semibold text-slate-700">其他获奖作品去向</p>
          <p className="mt-1">
            Tong Paper（论文查找与审核工具）将融入官网成果管理流程；TongMark（文件水印与传播追踪）将融入内网资料下载。
            两项功能上线后会在对应页面直接可用，不在此目录重复展示。
          </p>
        </div>
      </section>
    </div>
  )
}
