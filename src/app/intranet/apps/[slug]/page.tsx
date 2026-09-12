"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ExternalLink,
  FileText,
  Github,
  Search,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCC2026ListAll } from "@/lib/api"
import {
  creativeAppMeta,
  creativeAppStatusLabels,
  getDeployedChallengeApp,
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

export default function CreativeAppPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const cc2026ListAll = useCC2026ListAll()
  const projects = useMemo(() => parseRegistrations(cc2026ListAll), [cc2026ListAll])

  const app = getDeployedChallengeApp(slug)
  const project = useMemo(
    () => (app ? projects.find((p) => p.id === app.registrationId) || null : null),
    [app, projects]
  )

  if (!app || !app.enabled) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-slate-500">该创意工具不存在或尚未开放。</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/intranet/apps">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回创意工具
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const meta = creativeAppMeta[app.slug]
  const Icon = APP_ICONS[app.slug]

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/intranet/apps"
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回创意工具
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
                  {meta.shortTitle}
                </h1>
                <Badge
                  variant={app.status === "online" ? "success" : "secondary"}
                  className="rounded-md"
                >
                  {creativeAppStatusLabels[app.status]}
                </Badge>
                <Badge variant="outline" className="rounded-md">
                  {app.delivery === "local" ? "本地工具" : "在线工具"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {project?.projectName || "CC2026 获奖作品"}
                {project?.teamName ? ` · ${project.teamName}` : ""}
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            {project?.projectSummary || meta.tagline}
          </p>

          {project?.techKeywords ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {project.techKeywords.split(/[,，、]/).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {keyword.trim()}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {app.slug === "class-notes" ? <ClassNotesPanel project={project} /> : null}
        {app.slug === "tongxiaomiao" ? <TongxiaomiaoPanel /> : null}
        {app.slug === "jiahui" || app.slug === "admission" || app.slug === "yizhi" ? (
          <ComingSoonPanel
            slug={app.slug}
            project={project}
            note={
              app.slug === "jiahui"
                ? "嘉会的方案生成、修订和经费表能力将接入官网账号体系后开放。"
                : app.slug === "admission"
                  ? "招生咨询的检索与问答接口正在接入，同时提供官方来源与时效标注。"
                  : "易知将在资源评估完成后以精简能力上线，首期开放资料索引与问答。"
            }
          />
        ) : null}
      </div>
    </div>
  )
}

function ClassNotesPanel({ project }: { project: CreativeChallengeRegistration | null }) {
  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 pt-6 text-sm leading-7 text-amber-900">
          <Wrench className="mt-1 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">这是一个在个人电脑上运行的本地工具</p>
            <p className="mt-1">
              课堂笔记生成需要登录北大课程平台，涉及个人 IAAA 凭据。为保护账号安全，通班官网不部署、不中继该登录链路，
              官网也不会接收你的 IAAA 凭据、Cookie 或课程视频。请在本机运行该工具。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">使用方式</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-slate-700">
          <ol className="list-decimal space-y-2 pl-5">
            <li>从项目仓库下载最新的预编译便携版（Windows x64 / macOS Apple Silicon）。</li>
            <li>按发布说明完成首次配置：填写你自己申请的模型服务 Key，并检查本地依赖。</li>
            <li>在本机登录北大课程平台，选择课程与讲次，工具将自动完成转写与笔记生成。</li>
            <li>生成的笔记保存在本机；如需云模型能力，相关数据将发送至你自行配置的第三方服务。</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {project?.githubUrl ? (
              <Button asChild variant="outline">
                <a href={project.githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  项目仓库与发布说明
                </a>
              </Button>
            ) : null}
            {project?.demoUrl ? (
              <Button asChild variant="outline">
                <a href={project.demoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  演示视频
                </a>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            使用须知
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
          <p>
            · 本工具是 CC2026 获奖作品的本地使用入口，不是北大官方课程平台功能；请仅处理你本人有权访问和使用的课程内容。
          </p>
          <p>
            · 使用 DashScope/DeepSeek 等云模型时，选定的音频、转写文本或提示词会发送至你自行配置的第三方模型服务，并受相应服务条款约束；
            只有项目提供本地 ASR/LLM 模式时，相关数据才完全不离开设备。
          </p>
          <p>· 云模型调用可能产生费用，Key 与费用由使用者自行承担。</p>
          <p>· 若遇到安装或运行问题，请通过项目仓库反馈。</p>
        </CardContent>
      </Card>
    </>
  )
}

function TongxiaomiaoPanel() {
  return (
    <>
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 pt-6 text-sm leading-7 text-blue-900">
          <Sparkles className="mt-1 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">在线生成需要 GPU，首期以成品画廊与许愿池的形式开放</p>
            <p className="mt-1">
              项目方的生成服务将在获得稳定 GPU 资源后接入；当前页面展示经审核的成品图，并收集大家的许愿主题，
              由项目组定期批量生成后回填。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">成品画廊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400"
              >
                成品图待项目方提供
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            画廊图片将由项目方提供并经过审核后上传，当前为占位展示。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">许愿池</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
          <p>想让通小喵做什么？写下你的主题（动作、配饰、表情、场景），项目组会定期挑选并批量生成。</p>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            许愿池即将开放，敬请期待。
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function ComingSoonPanel({
  slug,
  project,
  note,
}: {
  slug: CreativeAppSlug
  project: CreativeChallengeRegistration | null
  note: string
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">接入进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
          <p>{note}</p>
          <p>
            项目介绍、演示和仓库链接来自比赛报名信息，可直接查看；在线能力开放后本页会同步更新。
          </p>
          <div className="flex flex-wrap gap-2">
            {project?.githubUrl ? (
              <Button asChild variant="outline">
                <a href={project.githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub 仓库
                </a>
              </Button>
            ) : null}
            {project?.demoUrl ? (
              <Button asChild variant="outline">
                <a href={project.demoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  演示视频
                </a>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href={`/intranet/creative-challenge-2026/projects/${project?.id || ""}`}>
                查看比赛详情页
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-slate-400">项目标识：{slug}</p>
        </CardContent>
      </Card>
    </>
  )
}
