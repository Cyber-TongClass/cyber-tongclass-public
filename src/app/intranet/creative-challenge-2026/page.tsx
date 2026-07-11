"use client"

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Code2,
  Cpu,
  Edit3,
  ExternalLink,
  FileCheck2,
  Github,
  LayoutDashboard,
  ListChecks,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreativeChallengeMemberEditor } from "@/components/intranet/creative-challenge-member-editor"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUsers, useCC2026List, useCC2026Set, useCC2026Get, useCC2026BatchSet } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  bountyTasks,
  bountyTaskRequirements,
  getCCSessionToken, canManageCreativeChallenge,
  challengeMilestones,
  challengeTracks,
  createDefaultCreativeChallengeSettings,
  createRegistrationId,
  daysUntilSubmitDeadline,
  challengeStageDetails,
  getCreativeChallengeBountyVoteLimit,
  statusBadgeVariants,
  submissionChecklist,
  type CreativeChallengeSettings,
  type CreativeChallengeMember,
  type CreativeChallengeRegistration,
  type CreativeChallengeTrack,
} from "@/lib/creative-challenge-2026"
import { cn } from "@/lib/utils"

type RegistrationDraft = {
  teamName: string
  projectName: string
  leaderName: string
  leaderStudentId: string
  leaderContact: string
  members: CreativeChallengeMember[]
  freshmen: string
  track: CreativeChallengeTrack
  bountyTask: string
  projectSummary: string
  techKeywords: string
  githubUrl: string
  demoUrl: string
  wantsCompute: boolean
  computePlan: string
}

const emptyDraft: RegistrationDraft = {
  teamName: "",
  projectName: "",
  leaderName: "",
  leaderStudentId: "",
  leaderContact: "",
  members: [],
  freshmen: "",
  track: "custom",
  bountyTask: bountyTasks[0],
  projectSummary: "",
  techKeywords: "",
  githubUrl: "",
  demoUrl: "",
  wantsCompute: false,
  computePlan: "",
}

const accentClasses = {
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  purple: "bg-violet-100 text-violet-800 border-violet-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200",
}

function compactDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function CreativeChallenge2026Page() {
  const { currentUser, isSuperAdmin } = useAuth()
  const cc2026Organizers = useCC2026List("organizers")
  const cc2026OrganizerUserIds = (cc2026Organizers || [])
    .filter((d: any) => d.key === "_")
    .flatMap((d: any) => {
      try { return JSON.parse(d.value) } catch { return [] }
    }) as string[]
  const cc2026Settings = useCC2026List("settings")
  const cc2026Registrations = useCC2026List("registration")
  const cc2026Votes = useCC2026List("votes")
  const cc2026MyVotes = useCC2026Get("my_votes", currentUser ? String(currentUser._id) : "_")
  const setCC2026Mutation = useCC2026Set()
  const batchSetCC2026 = useCC2026BatchSet()
  const usersData = useUsers({ limit: 1000, classMembersOnly: true })
  const projectSummaryTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [draft, setDraft] = useState<RegistrationDraft>(emptyDraft)
  const [registrations, setRegistrations] = useState<CreativeChallengeRegistration[]>([])
  const [settings, setSettings] = useState<CreativeChallengeSettings>(() => createDefaultCreativeChallengeSettings())
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [myVotes, setMyVotes] = useState<string[]>([])
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [selectedBountyTask, setSelectedBountyTask] = useState<string | null>(null)
  const [hasUnresolvedMemberMatch, setHasUnresolvedMemberMatch] = useState(false)
  const [showcaseTrackFilter, setShowcaseTrackFilter] = useState<string>("all")
  const [showcaseSortDir, setShowcaseSortDir] = useState<"desc" | "asc">("desc")

  const stageDetails = challengeStageDetails[settings.stage]
  const canRegister = settings.stage === "registration"
  const canShowcase = settings.stage === "showcase" || settings.stage === "results"
  const canVote = settings.stage === "showcase"
  const daysLeft = useMemo(() => daysUntilSubmitDeadline(), [])
  const localPublishedProjects = useMemo(() => {
    let published = registrations.filter((item) => item.finalSubmittedAt)
    if (showcaseTrackFilter !== "all") {
      published = published.filter((p) => p.track === showcaseTrackFilter)
    }
    if (!canShowcase) {
      // Registration phase: order by createdAt ascending (oldest first)
      return published.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    }
    if (canVote) {
      // Voting phase: no vote-based order to avoid Matthew effect
      // Group by track, random order within each
      const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5)
      const custom = shuffle(published.filter((p) => p.track === "custom"))
      const bounty = shuffle(published.filter((p) => p.track === "bounty"))
      return [...custom, ...bounty]
    }
    // Results phase: sort by votes within each track
    const sorter = showcaseSortDir === "desc"
      ? (a: any, b: any) => (votes[b.id] || 0) - (votes[a.id] || 0)
      : (a: any, b: any) => (votes[a.id] || 0) - (votes[b.id] || 0)
    const custom = published.filter((p) => p.track === "custom").sort(sorter)
    const bounty = published.filter((p) => p.track === "bounty").sort(sorter)
    return [...custom, ...bounty]
  }, [registrations, votes, canVote, showcaseTrackFilter, showcaseSortDir])
  const registrationsById = useMemo(
    () => new Map(registrations.map((item) => [item.id, item])),
    [registrations]
  )
  const selectedBountyTaskRequirement = useMemo(
    () => bountyTaskRequirements.find((item) => item.title === selectedBountyTask) || null,
    [selectedBountyTask]
  )

  useEffect(() => {
    // Read settings from Convex
    const raw = (cc2026Settings || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setSettings(JSON.parse(raw.value)) } catch { setSettings(createDefaultCreativeChallengeSettings()) }
    } else {
      setSettings(createDefaultCreativeChallengeSettings())
    }
  }, [cc2026Settings])

  useEffect(() => {
    // Read registrations from Convex
    const doc = (cc2026Registrations || []).find((d: any) => d.key === "_")
    if (doc) {
      try { setRegistrations(JSON.parse(doc.value)) } catch { setRegistrations([]) }
    }
  }, [cc2026Registrations])

  useEffect(() => {
    // Read votes from Convex
    const raw = (cc2026Votes || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setVotes(JSON.parse(raw.value)) } catch { setVotes({}) }
    } else {
      setVotes({})
    }
  }, [cc2026Votes])

  useEffect(() => {
    // Read my_votes from Convex
    if (cc2026MyVotes) {
      try { setMyVotes(JSON.parse(cc2026MyVotes)) } catch { setMyVotes([]) }
    } else {
      setMyVotes([])
    }
  }, [cc2026MyVotes])

  useEffect(() => {
    if (projectSummaryTextareaRef.current) {
      autoResizeTextarea(projectSummaryTextareaRef.current)
    }
  }, [draft.projectSummary])

  useEffect(() => {
    if (!currentUser) return

    const currentName = [currentUser.chineseName, currentUser.englishName].filter(Boolean).join(" / ")
    setDraft((prev) => {
      const next = {
        ...prev,
        leaderName: prev.leaderName || currentName || currentUser.username || "",
        leaderStudentId: prev.leaderStudentId || currentUser.studentId || "",
        leaderContact: prev.leaderContact || currentUser.email || currentUser.personalEmail || "",
      }

      const isAlreadyMember = prev.members.some(
        (m) =>
          (m.studentId && m.studentId === currentUser.studentId) ||
          (m.name && m.name === currentName) ||
          (m.name && currentUser.chineseName && m.name.includes(currentUser.chineseName))
      )
      if (!isAlreadyMember) {
        next.members = [
          {
            name: currentName || currentUser.chineseName || currentUser.username || "",
            role: "队长",
            isTongClass: true,
            userId: String(currentUser._id),
            username: currentUser.username,
            studentId: currentUser.studentId,
          },
          ...prev.members,
        ]
      }

      return next
    })
  }, [currentUser])

  function updateDraft<K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function persistRegistrations(nextRegistrations: CreativeChallengeRegistration[]) {
    setRegistrations(nextRegistrations)
    const st = getCCSessionToken()
    setCC2026Mutation({
      collection: "registration",
      key: "_",
      value: JSON.stringify(nextRegistrations),
      sessionToken: st || undefined,
    })
  }

  function autoResizeTextarea(element: HTMLTextAreaElement) {
    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canRegister) {
      setMessage("报名和最终提交已截止，当前阶段不能再提交或修改项目。")
      return
    }

    const requiredFields = [
      draft.teamName,
      draft.projectName,
      draft.leaderName,
      draft.leaderStudentId,
      draft.leaderContact,
      draft.projectSummary,
    ]

    if (requiredFields.some((value) => value.trim().length === 0)) {
      setMessage("请补全队伍、项目、队长联系方式和作品简介。")
      return
    }

    if (draft.members.length === 0 || draft.members.some((member) => !member.name.trim())) {
      setMessage("请至少添加一位核心成员。")
      return
    }

    if (hasUnresolvedMemberMatch) {
      setMessage("请先确认或排除核心成员里的通班成员匹配。")
      return
    }

    if (draft.track === "bounty" && !draft.bountyTask) {
      setMessage("请选择一个悬赏任务。")
      return
    }

    const now = Date.now()
    if (editingRegistrationId) {
      const target = registrations.find((item) => item.id === editingRegistrationId)
      if (!target) {
        setMessage("未找到要编辑的报名记录。")
        return
      }
      if (target.finalSubmittedAt) {
        setMessage("该项目已最终提交，不能再修改报名信息。")
        return
      }

      const nextRegistrations = registrations.map((item) =>
        item.id === editingRegistrationId
          ? {
              ...item,
              ...draft,
              bountyTask: draft.track === "bounty" ? draft.bountyTask : "",
              updatedAt: now,
            }
          : item
      )
      setRegistrations(nextRegistrations)
      persistRegistrations(nextRegistrations)
      setEditingRegistrationId(null)
      setMessage("报名信息已更新。")
      setDraft((prev) => ({
        ...emptyDraft,
        leaderName: prev.leaderName,
        leaderStudentId: prev.leaderStudentId,
        leaderContact: prev.leaderContact,
      }))
      return
    }

    const nextRegistration: CreativeChallengeRegistration = {
      ...draft,
      githubUrl: "",
      demoUrl: "",
      bountyTask: draft.track === "bounty" ? draft.bountyTask : "",
      id: createRegistrationId(),
      status: "submitted",
      adminNote: "",
      score: null,
      createdAt: now,
      updatedAt: now,
    }

    const nextRegistrations = [nextRegistration, ...registrations]
    persistRegistrations(nextRegistrations)
    setMessage("报名已保存。之后可在“编辑和提交已有项目”中补充 GitHub、Demo 并最终提交。")
    setDraft((prev) => ({
      ...emptyDraft,
      leaderName: prev.leaderName,
      leaderStudentId: prev.leaderStudentId,
      leaderContact: prev.leaderContact,
    }))
  }

  function startEditRegistration(registration: CreativeChallengeRegistration) {
    if (!canRegister) {
      setMessage("报名和最终提交已截止，当前阶段不能再修改报名信息。")
      return
    }

    if (registration.finalSubmittedAt) {
      setMessage("该项目已最终提交，不能再修改报名信息。")
      return
    }

    setEditingRegistrationId(registration.id)
    setDraft({
      teamName: registration.teamName,
      projectName: registration.projectName,
      leaderName: registration.leaderName,
      leaderStudentId: registration.leaderStudentId,
      leaderContact: registration.leaderContact,
      members: registration.members,
      freshmen: registration.freshmen,
      track: registration.track,
      bountyTask: registration.bountyTask || bountyTasks[0],
      projectSummary: registration.projectSummary,
      techKeywords: registration.techKeywords,
      githubUrl: registration.githubUrl,
      demoUrl: registration.demoUrl,
      wantsCompute: registration.wantsCompute,
      computePlan: registration.computePlan,
    })
    setMessage("正在编辑报名信息。")
  }

  function cancelEditRegistration() {
    setEditingRegistrationId(null)
    setDraft((prev) => ({
      ...emptyDraft,
      leaderName: prev.leaderName,
      leaderStudentId: prev.leaderStudentId,
      leaderContact: prev.leaderContact,
    }))
  }

  function getVoteGroupKey(project: CreativeChallengeRegistration) {
    return project.track === "custom" ? "custom" : `bounty:${project.bountyTask || "未选择任务"}`
  }

  function getVoteGroupLabel(project: CreativeChallengeRegistration) {
    return project.track === "custom" ? "自定义开发赛道" : project.bountyTask || "悬赏任务"
  }

  function getVoteLimit(project: CreativeChallengeRegistration) {
    if (project.track === "custom") return settings.customVoteLimit
    return getCreativeChallengeBountyVoteLimit(settings, project.bountyTask)
  }

  function getUsedVoteCount(project: CreativeChallengeRegistration) {
    const groupKey = getVoteGroupKey(project)
    return myVotes.filter((projectId) => {
      const votedProject = registrationsById.get(projectId)
      return votedProject ? getVoteGroupKey(votedProject) === groupKey : false
    }).length
  }

  function persistVotes(nextVotes: Record<string, number>, nextMyVotes: string[]) {
    setVotes(nextVotes)
    setMyVotes(nextMyVotes)
    batchSetCC2026({
      entries: [
        { collection: "votes", key: "_", value: JSON.stringify(nextVotes) },
        { collection: "my_votes", key: currentUser ? String(currentUser._id) : "_", value: JSON.stringify(nextMyVotes) },
      ],
      sessionToken: getCCSessionToken() || undefined,
    })
  }

  function voteForProject(project: CreativeChallengeRegistration) {
    if (!canVote) return
    if (myVotes.includes(project.id)) return

    const voteLimit = getVoteLimit(project)
    const usedVoteCount = getUsedVoteCount(project)
    if (usedVoteCount >= voteLimit) {
      setMessage(`${getVoteGroupLabel(project)}的投票额度已用完。`)
      return
    }

    const nextVotes = {
      ...votes,
      [project.id]: (votes[project.id] || 0) + 1,
    }
    const nextMyVotes = [...myVotes, project.id]

    persistVotes(nextVotes, nextMyVotes)
    setMessage(`已为「${project.projectName}」投票。`)
  }

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

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant={stageDetails.badgeVariant} className="rounded-md">
                  {stageDetails.label}
                </Badge>
                <Badge variant="secondary" className="rounded-md bg-slate-100 text-slate-700">
                  2026 年暑期
                </Badge>
              </div>
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 md:text-6xl">
                智慧通班创意开发挑战赛2026
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                面向通班在读本科生、校友和 2026 级通班意向新生的内部开发大赛，征集可落地的编程工具、系统功能、AI 应用和创意作品，欢迎积极参加赢取五万大奖！
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/intranet/creative-challenge-2026/rules">
                    <BookOpen className="mr-2 h-4 w-4" />
                    查看规则
                  </Link>
                </Button>
                {canRegister ? (
                  <>
                    <Button asChild variant="outline">
                      <a href="#registration">
                        <Rocket className="mr-2 h-4 w-4" />
                        报名参赛
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/intranet/creative-challenge-2026/projects">
                        <FileCheck2 className="mr-2 h-4 w-4" />
                        编辑和提交已有项目
                      </Link>
                    </Button>
                  </>
                ) : null}
                {canShowcase ? (
                  <Button asChild variant="outline">
                    <a href="#projects">
                      <Sparkles className="mr-2 h-4 w-4" />
                      浏览作品
                    </a>
                  </Button>
                ) : null}
                {isSuperAdmin || canManageCreativeChallenge(currentUser, cc2026OrganizerUserIds) ? (
                  <Button asChild variant="outline">
                    <Link href="/admin/creative-challenge-2026">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      后台管理
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  提交截止
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-950">8 月 23 日</div>
                <div className="mt-1 text-sm text-slate-500">剩余 {daysLeft} 天</div>
              </div>
              {/* <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Trophy className="h-4 w-4" />
                  两条赛道
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-950">自定义 / 悬赏</div>
                <div className="mt-1 text-sm text-slate-500">分别评审、分别设奖</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  后续接入
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-950">安全审查</div>
                <div className="mt-1 text-sm text-slate-500">优秀作品可长期使用</div>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarDays className="h-5 w-5 text-primary" />
                赛事进度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {challengeMilestones.map((item) => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-950">{item.label}</div>
                      <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", accentClasses[item.accent])}>
                        {item.date}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {canRegister ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Code2 className="h-5 w-5 text-primary" />
                    赛道与任务
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {challengeTracks.map((track) => (
                      <div key={track.value} className="rounded-lg border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="text-lg font-bold text-slate-950">{track.title}</h2>
                          <Badge variant={track.value === "custom" ? "success" : "warning"} className="rounded-md">
                            {track.shortTitle}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{track.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {track.focuses.map((focus) => (
                            <span key={focus} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {focus}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3 flex items-center gap-2 font-semibold text-slate-950">
                      <ListChecks className="h-5 w-5 text-primary" />
                      悬赏任务池
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {bountyTasks.map((task) => (
                        <button
                          key={task}
                          type="button"
                          onClick={() => setSelectedBountyTask(task)}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            selectedBountyTask === task
                              ? "border-amber-300 bg-amber-50 text-amber-900"
                              : "border-transparent bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50"
                          )}
                        >
                          <ArrowRight className="h-4 w-4 text-amber-600" />
                          <span>{task}</span>
                        </button>
                      ))}
                    </div>
                    {selectedBountyTaskRequirement ? (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-white p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="warning" className="rounded-md">具体要求</Badge>
                          <h3 className="font-semibold text-slate-950">{selectedBountyTaskRequirement.title}</h3>
                        </div>
                        <p className="text-sm leading-7 text-slate-600">
                          {selectedBountyTaskRequirement.description}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">点击任一悬赏任务查看具体要求。</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileCheck2 className="h-5 w-5 text-primary" />
                    提交材料
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {submissionChecklist.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {canShowcase ? (
            <Card id="projects">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  作品展示与投票
                </CardTitle>
              </CardHeader>
               <CardContent>
                 {canShowcase ? (
                   <div className="flex items-center justify-between gap-3 mb-5">
                     <div className="flex items-center gap-2">
                       {[
                         { value: "all", label: "全部作品" },
                         { value: "custom", label: "自定义开发" },
                         { value: "bounty", label: "悬赏任务" },
                       ].map((tab) => (
                         <button
                           key={tab.value}
                           onClick={() => setShowcaseTrackFilter(tab.value)}
                           className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                             showcaseTrackFilter === tab.value
                               ? "bg-primary text-white"
                               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                           }`}
                         >
                           {tab.label}
                         </button>
                       ))}
                     </div>
                     {!canVote ? (
                       <button
                         onClick={() => setShowcaseSortDir((d) => d === "desc" ? "asc" : "desc")}
                         className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                       >
                         {showcaseSortDir === "desc" ? "票数 ↓" : "票数 ↑"}
                       </button>
                     ) : (
                       <span className="text-xs text-slate-400">随机排序</span>
                     )}
                   </div>
                 ) : null}
                 {localPublishedProjects.length > 0 ? (
                  <div className="space-y-4">
                    {localPublishedProjects.map((item, index) => {
                      const hasVoted = myVotes.includes(item.id)
                      const voteLimit = getVoteLimit(item)
                      const usedVoteCount = getUsedVoteCount(item)
                      const remainingVotes = Math.max(0, voteLimit - usedVoteCount)
                      const voteDisabled = hasVoted || remainingVotes <= 0
                      const prevTrack = index > 0 ? localPublishedProjects[index - 1].track : null
                      const trackChanged = prevTrack && prevTrack !== item.track

                      return (
                        <React.Fragment key={item.id}>
                          {trackChanged && canVote ? (
                            <div className="flex items-center gap-3 pt-2 -mb-2">
                              <div className="flex-1 h-px bg-slate-200" />
                              <Badge variant={item.track === "custom" ? "success" : "warning"} className="rounded-md text-xs">
                                {item.track === "custom" ? "自定义开发赛道" : "悬赏任务赛道"}
                              </Badge>
                              <div className="flex-1 h-px bg-slate-200" />
                            </div>
                          ) : null}
                          <div className="rounded-lg border border-slate-200 bg-white p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={item.track === "custom" ? "success" : "warning"} className="rounded-md">
                              {item.track === "custom" ? "自定义开发" : "悬赏任务"}
                            </Badge>
                            <Badge variant="success" className="rounded-md">
                              已最终提交
                            </Badge>
                          </div>
                          <h3 className="mt-3 text-lg font-bold text-slate-950">{item.projectName}</h3>
                          <p className="mt-1 text-sm text-slate-500">{item.teamName}</p>
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{item.projectSummary}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {item.githubUrl ? (
                              <a href={item.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                <Github className="h-3.5 w-3.5" />
                                GitHub
                              </a>
                            ) : null}
                            {item.demoUrl ? (
                              <a href={item.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Demo
                              </a>
                            ) : null}
                          </div>
                          <div className="mt-4 flex flex-col gap-3 rounded-lg bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <span className="text-sm text-slate-600">票数：{votes[item.id] || 0}</span>
                              {canVote ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  {getVoteGroupLabel(item)}剩余：{remainingVotes} / {voteLimit}
                                </p>
                              ) : null}
                            </div>
                            {canVote ? (
                              <Button
                                size="sm"
                                variant={hasVoted || remainingVotes <= 0 ? "outline" : "default"}
                                disabled={voteDisabled}
                                onClick={() => voteForProject(item)}
                              >
                                {hasVoted ? "已投票" : remainingVotes <= 0 ? "额度已满" : "投票"}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500">投票已关闭</span>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">暂无已最终提交作品。</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card id="registration">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-primary" />
                报名参赛
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canRegister ? (
              <form className="space-y-4" onSubmit={submitRegistration}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">队名</span>
                    <Input value={draft.teamName} onChange={(event) => updateDraft("teamName", event.target.value)} placeholder="例如：通通是最萌小猫队" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">作品名称</span>
                    <Input value={draft.projectName} onChange={(event) => updateDraft("projectName", event.target.value)} placeholder="例如：禄岛撸猫时间查询和预约系统" />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">队长姓名</span>
                    <Input value={draft.leaderName} onChange={(event) => updateDraft("leaderName", event.target.value)} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">队长学号</span>
                    <Input value={draft.leaderStudentId} onChange={(event) => updateDraft("leaderStudentId", event.target.value)} />
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">联系方式</span>
                  <Input value={draft.leaderContact} onChange={(event) => updateDraft("leaderContact", event.target.value)} placeholder="邮箱 / 微信 / 手机" />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">参赛赛道</span>
                    <Select value={draft.track} onValueChange={(value) => updateDraft("track", value as CreativeChallengeTrack)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">自定义开发赛道</SelectItem>
                        <SelectItem value="bounty">悬赏任务赛道</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>

                  {draft.track === "bounty" ? (
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">悬赏任务</span>
                      <Select value={draft.bountyTask} onValueChange={(value) => updateDraft("bountyTask", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bountyTasks.map((task) => (
                            <SelectItem key={task} value={task}>{task}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  ) : (
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">技术关键词</span>
                      <Input value={draft.techKeywords} onChange={(event) => updateDraft("techKeywords", event.target.value)} placeholder="例如：Skill 蒸馏 / Agent / ..." />
                    </label>
                  )}
                </div>

                <CreativeChallengeMemberEditor
                  value={draft.members}
                  users={usersData || []}
                  onChange={(members) => updateDraft("members", members)}
                  onValidationChange={setHasUnresolvedMemberMatch}
                  error={hasUnresolvedMemberMatch ? "存在未确认的通班成员匹配，请确认后再提交。" : undefined}
                />

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">2026 级新生参与</span>
                  <Textarea value={draft.freshmen} onChange={(event) => updateDraft("freshmen", event.target.value)} placeholder="如有新生参与，请填写姓名，1-2人（不计入3人核心成员人数限制）。" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">作品简介</span>
                  <Textarea
                    ref={projectSummaryTextareaRef}
                    value={draft.projectSummary}
                    onChange={(event) => {
                      updateDraft("projectSummary", event.target.value)
                      autoResizeTextarea(event.currentTarget)
                    }}
                    onInput={(event) => autoResizeTextarea(event.currentTarget)}
                    placeholder="简要说明项目背景、设计思路、目标用户、技术路线、应用场景和实际价值等内容（更详细内容请于 README 文档中阐明）。"
                    className="min-h-[120px] resize-none overflow-hidden"
                  />
                </label>

                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    checked={draft.wantsCompute}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    type="checkbox"
                    onChange={(event) => updateDraft("wantsCompute", event.target.checked)}
                  />
                  <span>
                    <span className="font-medium">申请算力支持</span>
                    <span className="block text-xs leading-5 text-slate-500">正式提交作品时需补交算力使用说明。</span>
                  </span>
                </label>

                {draft.wantsCompute ? (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">算力使用初步计划</span>
                    <Textarea value={draft.computePlan} onChange={(event) => updateDraft("computePlan", event.target.value)} placeholder="模型训练、微调、数据处理或部署测试计划。" />
                  </label>
                ) : null}

                {message ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</p>
                ) : null}

                <Button type="submit" className="w-full">
                  <Rocket className="mr-2 h-4 w-4" />
                  {editingRegistrationId ? "保存报名修改" : "保存报名"}
                </Button>
                {editingRegistrationId ? (
                  <Button type="button" variant="outline" className="w-full" onClick={cancelEditRegistration}>
                    <X className="mr-2 h-4 w-4" />
                    取消编辑
                  </Button>
                ) : null}
              </form>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                  报名和最终提交已截止。当前阶段为“{stageDetails.label}”，请在作品展示区查看和投票。
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Cpu className="h-5 w-5 text-primary" />
                本人报名记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registrations.length > 0 ? (
                <div className="space-y-3">
                  {registrations.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950">{item.projectName}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            报名：{compactDate(item.createdAt)}
                            {item.finalSubmittedAt ? ` · 最终提交：${compactDate(item.finalSubmittedAt)}` : ""}
                          </div>
                        </div>
                        <Badge variant={item.finalSubmittedAt ? "success" : statusBadgeVariants[item.status]} className="rounded-md">
                          {item.finalSubmittedAt ? "已最终提交" : "报名已保存"}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {!item.finalSubmittedAt ? (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => startEditRegistration(item)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              编辑报名
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/intranet/creative-challenge-2026/projects?project=${encodeURIComponent(item.id)}`}>
                                <FileCheck2 className="mr-2 h-4 w-4" />
                                编辑和提交
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <p className="text-xs leading-5 text-slate-500">该报名已锁定，不能再修改。</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-7 text-slate-500">暂无报名记录。</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}
