"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Github,
  PlayCircle,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  classifyDemoUrl,
  getEmbeddableVideoUrl,
  getEmbeddableShareUrl,
  challengeStageDetails,
  createDefaultCreativeChallengeSettings,
} from "@/lib/creative-challenge-2026"
import {
  useCC2026Get,
  useCC2026List,
  useCC2026PublishedRegistrations,
  useCC2026Vote,
} from "@/lib/api"
import type { CreativeChallengeRegistration, CreativeChallengeSettings } from "@/lib/creative-challenge-2026"

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const projectId = params.id
  const { currentUser } = useAuth()

  const cc2026Settings = useCC2026List("settings")
  const cc2026Published = useCC2026PublishedRegistrations()
  const cc2026Votes = useCC2026List("votes")
  const cc2026MyVotes = useCC2026Get("my_votes", currentUser ? String(currentUser._id) : "_")
  const voteMutation = useCC2026Vote()

  const [project, setProject] = useState<CreativeChallengeRegistration | null>(null)
  const [settings, setSettings] = useState<CreativeChallengeSettings>(() => createDefaultCreativeChallengeSettings())
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [myVotes, setMyVotes] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [isVoting, setIsVoting] = useState(false)

  useEffect(() => {
    const raw = (cc2026Settings || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setSettings(JSON.parse(raw.value)) } catch { setSettings(createDefaultCreativeChallengeSettings()) }
    } else {
      setSettings(createDefaultCreativeChallengeSettings())
    }
  }, [cc2026Settings])

  useEffect(() => {
    const list = (cc2026Published || []) as CreativeChallengeRegistration[]
    setProject(list.find((item) => item.id === projectId) || null)
  }, [cc2026Published, projectId])

  useEffect(() => {
    const raw = (cc2026Votes || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setVotes(JSON.parse(raw.value)) } catch { setVotes({}) }
    } else {
      setVotes({})
    }
  }, [cc2026Votes])

  useEffect(() => {
    if (cc2026MyVotes) {
      try { setMyVotes(JSON.parse(cc2026MyVotes)) } catch { setMyVotes([]) }
    } else {
      setMyVotes([])
    }
  }, [cc2026MyVotes])

  const canVote = settings.stage === "showcase"
  const demoKind = useMemo(() => classifyDemoUrl(project?.demoUrl), [project?.demoUrl])
  const embedUrl = useMemo(() => (project?.demoUrl ? getEmbeddableVideoUrl(project.demoUrl) : null), [project?.demoUrl])
  const shareEmbedUrl = useMemo(() => (project?.demoUrl ? getEmbeddableShareUrl(project.demoUrl) : null), [project?.demoUrl])
  const hasVoted = project ? myVotes.includes(project.id) : false

  const handleVote = async () => {
    if (!project || !canVote || hasVoted || isVoting) return
    setIsVoting(true)
    setMessage("")
    try {
      const result = await voteMutation(project.id)
      setVotes(result.votes)
      setMyVotes(result.myVotes)
      setMessage(`已为「${project.projectName}」投票。`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "投票失败")
    } finally {
      setIsVoting(false)
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[hsl(211,30%,97%)]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-slate-500">项目不存在或尚未最终提交。</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/intranet/creative-challenge-2026">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回作品展示
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/intranet/creative-challenge-2026"
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回作品展示
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={project.track === "custom" ? "success" : "warning"} className="rounded-md">
              {project.track === "custom" ? "自定义开发赛道" : "悬赏任务赛道"}
            </Badge>
            {project.bountyTask ? (
              <Badge variant="outline" className="rounded-md bg-slate-50 text-slate-600">
                {project.bountyTask}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
            {project.projectName}
          </h1>
          <p className="mt-2 text-base text-slate-500">队伍：{project.teamName}</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              项目简介
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {project.projectSummary}
            </div>
            {project.techKeywords ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {project.techKeywords.split(/[,，、]/).map((keyword) => (
                  <span key={keyword} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {project.demoUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <PlayCircle className="h-5 w-5 text-primary" />
                在线 Demo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {demoKind === "video" && embedUrl ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full"
                    src={embedUrl}
                  >
                    您的浏览器不支持视频播放，请点击下方链接在新窗口打开。
                  </video>
                </div>
              ) : demoKind === "iframe" && shareEmbedUrl ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <iframe
                    src={shareEmbedUrl}
                    title="项目 Demo"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    className="aspect-video w-full"
                  />
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    以上为网盘内嵌预览，若无法加载请使用下方按钮在新窗口打开。
                  </div>
                </div>
              ) : demoKind === "iframe" && embedUrl ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <iframe
                    src={embedUrl}
                    title="项目 Demo"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    className="aspect-video w-full"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <p className="text-sm text-slate-500">
                    该 Demo 需要通过外部链接查看，点击下方按钮在新窗口打开。
                  </p>
                </div>
              )}
              <div className="mt-4">
                <Button asChild variant="outline">
                  <a href={project.demoUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    在新窗口打开 Demo
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {project.githubUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Github className="h-5 w-5 text-primary" />
                项目代码
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href={project.githubUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  查看 GitHub 仓库
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              队伍信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <span className="text-slate-500">队伍名称：</span>
                {project.teamName}
              </div>
            </div>
          </CardContent>
        </Card>

        {canVote ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">投票</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-3xl font-extrabold text-slate-950">{votes[project.id] || 0}</span>
                <span className="ml-2 text-sm text-slate-500">票</span>
              </div>
              <Button
                size="lg"
                variant={hasVoted ? "outline" : "default"}
                disabled={hasVoted || isVoting}
                onClick={handleVote}
              >
                {hasVoted ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    已投票
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isVoting ? "投票中..." : "投一票"}
                  </>
                )}
              </Button>
              {hasVoted ? (
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  你已为该作品投过票，感谢参与！
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            <XCircle className="h-4 w-4" />
            {settings.stage === "results" ? "投票已结束，结果见榜单。" : "当前不在投票阶段。"}
          </div>
        )}
      </div>
    </div>
  )
}
