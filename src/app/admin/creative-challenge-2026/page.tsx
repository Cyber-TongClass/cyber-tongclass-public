"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  Github,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  useUsers,
  useCC2026List,
  useCC2026Set,
  useCC2026ManageRegistrations,
  useCC2026UpsertRegistration,
  useCC2026RemoveRegistration,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  bountyTasks,
  getCCSessionToken, canManageCreativeChallenge,
  challengeStageDetails,
  createDefaultCreativeChallengeSettings,
  createRegistrationId,
  formatCreativeChallengeUserName,
  formatCreativeChallengeMembers,
  getCreativeChallengeBountyVoteLimit,
  normalizeCreativeChallengeVoteLimit,
  statusBadgeVariants,
  statusLabels,
  type CreativeChallengeSettings,
  type CreativeChallengeRegistration,
  type CreativeChallengeRegistrationStatus,
  type CreativeChallengeOrganizer,
  type CreativeChallengeStage,
} from "@/lib/creative-challenge-2026"
import type { User } from "@/types"

const ALL_STATUSES = "all-statuses"
const ALL_TRACKS = "all-tracks"

const statusOptions = Object.entries(statusLabels) as [CreativeChallengeRegistrationStatus, string][]
const stageOptions = Object.entries(challengeStageDetails) as [CreativeChallengeStage, (typeof challengeStageDetails)[CreativeChallengeStage]][]

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function toCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function buildPreviewRegistrations(): CreativeChallengeRegistration[] {
  const now = Date.now()

  return [
    {
      id: createRegistrationId(),
      teamName: "Baseline Breakers",
      projectName: "招生咨询 Skill 蒸馏",
      leaderName: "示例队长 A",
      leaderStudentId: "2023000001",
      leaderContact: "demo-a@tongclass.ac.cn",
      members: [
        {
          name: "示例队长 A",
          role: "",
          isTongClass: true,
          studentId: "2023000001",
        },
        {
          name: "示例成员 A2",
          role: "",
        },
      ],
      freshmen: "2026 级新生 1 名，参与资料整理和测试问答。",
      track: "bounty",
      bountyTask: bountyTasks[0],
      projectSummary: "面向招生咨询场景，将通班培养方案、课程信息和常见问答整理为可检索知识库，并蒸馏一个稳定回答相关问题的 Skill。",
      techKeywords: "RAG, Skill, Evaluation",
      githubUrl: "https://github.com/example/tongclass-admission-skill",
      demoUrl: "https://example.com/demo",
      wantsCompute: true,
      computePlan: "用于检索评测、轻量微调和离线问答测试。",
      status: "reviewing",
      adminNote: "示例记录：可在本页修改状态和备注，得票数由投票自动统计。",
      score: null,
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 60 * 60 * 1000,
      finalSubmittedAt: now - 2 * 60 * 60 * 1000,
    } as CreativeChallengeRegistration,
    {
      id: createRegistrationId(),
      teamName: "Workflow Lab",
      projectName: "班级活动策划 Agent",
      leaderName: "示例队长 B",
      leaderStudentId: "2024000002",
      leaderContact: "demo-b@tongclass.ac.cn",
      members: [
        {
          name: "示例队长 B",
          role: "",
          isTongClass: true,
          studentId: "2024000002",
        },
        {
          name: "示例成员 B2",
          role: "",
        },
      ],
      freshmen: "",
      track: "custom",
      bountyTask: "",
      projectSummary: "把活动方案、物资清单、通知文案和时间表规划整合成一个内部工具，用于降低学生工作中的重复沟通成本。",
      techKeywords: "Agent, Next.js, Workflow",
      githubUrl: "https://github.com/example/class-activity-agent",
      demoUrl: "",
      wantsCompute: false,
      computePlan: "",
      status: "accepted",
      adminNote: "",
      score: null,
      createdAt: now - 26 * 60 * 60 * 1000,
      updatedAt: now - 26 * 60 * 60 * 1000,
      finalSubmittedAt: now - 26 * 60 * 60 * 1000,
    } as CreativeChallengeRegistration,
    {
      id: createRegistrationId(),
      teamName: "通通猫大队",
      projectName: "树洞智能情绪分析看板",
      leaderName: "示例队长 C",
      leaderStudentId: "2025000003",
      leaderContact: "demo-c@tongclass.ac.cn",
      members: [
        {
          name: "示例队长 C",
          role: "",
          isTongClass: true,
          studentId: "2025000003",
        },
        {
          name: "示例成员 C2",
          role: "",
        },
      ],
      freshmen: "",
      track: "bounty",
      bountyTask: bountyTasks[3] || bountyTasks[0],
      projectSummary: "基于树洞帖子做情感分析和主题聚类，生成可视化看板用于了解通班同学的关注热点和情绪趋势。",
      techKeywords: "NLP, Sentiment, Visualization",
      githubUrl: "",
      demoUrl: "",
      wantsCompute: false,
      computePlan: "",
      status: "submitted",
      adminNote: "",
      score: null,
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      updatedAt: now - 5 * 60 * 60 * 1000,
    } as CreativeChallengeRegistration,
  ]
}

export default function AdminCreativeChallenge2026Page() {
  const { currentUser, isSuperAdmin } = useAuth()
  const usersData = useUsers({ limit: 1000, skip: !isSuperAdmin })
  const [registrations, setRegistrations] = useState<CreativeChallengeRegistration[]>([])
  const [settings, setSettings] = useState<CreativeChallengeSettings>(() => createDefaultCreativeChallengeSettings())
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [organizers, setOrganizers] = useState<string[]>([])
  const [organizerSearch, setOrganizerSearch] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)
  const [trackFilter, setTrackFilter] = useState(ALL_TRACKS)
  const canManageChallenge = canManageCreativeChallenge(currentUser, organizers)
  const setCC2026Mutation = useCC2026Set()
  const upsertCC2026Registration = useCC2026UpsertRegistration()
  const removeCC2026Registration = useCC2026RemoveRegistration()
  const cc2026Organizers = useCC2026List("organizers")
  const cc2026Settings = useCC2026List("settings")
  const cc2026Registrations = useCC2026ManageRegistrations(canManageChallenge)
  const cc2026Votes = useCC2026List("votes")

  useEffect(() => {
    const raw = (cc2026Organizers || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setOrganizers(JSON.parse(raw.value)) } catch { setOrganizers([]) }
    } else {
      setOrganizers([])
    }
  }, [cc2026Organizers])

  useEffect(() => {
    const raw = (cc2026Settings || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setSettings(JSON.parse(raw.value)) } catch { setSettings(createDefaultCreativeChallengeSettings()) }
    }
  }, [cc2026Settings])

  useEffect(() => {
    setRegistrations((cc2026Registrations || []) as CreativeChallengeRegistration[])
  }, [cc2026Registrations])

  useEffect(() => {
    const raw = (cc2026Votes || []).find((d: any) => d.key === "_")
    if (raw) {
      try { setVotes(JSON.parse(raw.value)) } catch { setVotes({}) }
    }
  }, [cc2026Votes])

  const filteredRegistrations = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return registrations.filter((item) => {
      const matchesSearch =
        !keyword ||
        [
          item.teamName,
          item.projectName,
          item.leaderName,
          item.leaderStudentId,
          item.leaderContact,
          formatCreativeChallengeMembers(item.members),
          item.projectSummary,
          item.techKeywords,
          item.bountyTask,
        ].some((value) => value.toLowerCase().includes(keyword))
      const matchesStatus = statusFilter === ALL_STATUSES || item.status === statusFilter
      const matchesTrack = trackFilter === ALL_TRACKS || item.track === trackFilter
      return matchesSearch && matchesStatus && matchesTrack
    })
  }, [registrations, search, statusFilter, trackFilter])

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      custom: registrations.filter((item) => item.track === "custom").length,
      bounty: registrations.filter((item) => item.track === "bounty").length,
      accepted: registrations.filter((item) => item.status === "accepted").length,
    }
  }, [registrations])

  const organizerIds = useMemo(() => new Set(organizers), [organizers])
  const organizerUserMap = useMemo(() => {
    const map = new Map<string, User>()
    for (const u of (usersData || [])) {
      map.set(String(u._id), u as User)
    }
    return map
  }, [usersData])
  const organizerCandidates = useMemo(() => {
    const keyword = organizerSearch.trim().toLowerCase()
    if (!keyword) return []

    return ((usersData || []) as User[])
      .filter((user) => !organizerIds.has(String(user._id)))
      .filter((user) =>
        [
          user.chineseName || "",
          user.englishName,
          user.username,
          user.studentId,
          user.email,
        ].some((value) => value.toLowerCase().includes(keyword))
      )
      .slice(0, 6)
  }, [organizerIds, organizerSearch, usersData])

  async function persist(
    nextRegistrations: CreativeChallengeRegistration[],
    changedRegistration?: CreativeChallengeRegistration | CreativeChallengeRegistration[]
  ) {
    setRegistrations(nextRegistrations)
    const changedRegistrations = Array.isArray(changedRegistration)
      ? changedRegistration
      : changedRegistration
        ? [changedRegistration]
        : []
    await Promise.all(changedRegistrations.map((registration) =>
      upsertCC2026Registration(registration as unknown as Record<string, unknown>)
    ))
  }

  function updateRegistration(id: string, patch: Partial<CreativeChallengeRegistration>) {
    const updatedRegistration = registrations.find((item) => item.id === id)
    if (!updatedRegistration) return
    const nextRegistration = { ...updatedRegistration, ...patch, updatedAt: Date.now() }
    const nextRegistrations = registrations.map((item) =>
      item.id === id ? nextRegistration : item
    )
    persist(nextRegistrations, nextRegistration).catch((error) => {
      window.alert(error instanceof Error ? error.message : "保存报名记录失败")
    })
  }

  function removeRegistration(id: string) {
    const target = registrations.find((item) => item.id === id)
    if (!target) return
    if (!window.confirm(`确认删除「${target.projectName}」的报名记录吗？`)) return
    const nextRegistrations = registrations.filter((item) => item.id !== id)
    setRegistrations(nextRegistrations)
    removeCC2026Registration(id).catch((error) => {
      window.alert(error instanceof Error ? error.message : "删除报名记录失败")
    })
  }

  function seedPreviewData() {
    const previewRegistrations = buildPreviewRegistrations()
    const demoIds = new Set(previewRegistrations.map((r) => r.id))
    const existing = registrations.filter((r) => demoIds.has(r.id))
    if (existing.length > 0) {
      if (!window.confirm("演示数据已存在，重新生成会覆盖现有演示数据。确定继续？")) return
    }
    const nextRegistrations = [
      ...previewRegistrations,
      ...registrations.filter((r) => !demoIds.has(r.id)),
    ]
    persist(nextRegistrations, previewRegistrations).catch((error) => {
      window.alert(error instanceof Error ? error.message : "写入演示报名记录失败")
    })
  }

  function writeSettings(nextSettings: CreativeChallengeSettings) {
    setSettings(nextSettings)
    const st = getCCSessionToken()
    setCC2026Mutation({
      collection: "settings",
      key: "_",
      value: JSON.stringify(nextSettings),
      sessionToken: st || undefined,
    })
  }

  function updateStage(stage: CreativeChallengeStage) {
    writeSettings({ ...settings, stage, updatedAt: Date.now() })
  }

  function updateCustomVoteLimit(value: string) {
    writeSettings({
      ...settings,
      customVoteLimit: normalizeCreativeChallengeVoteLimit(value, settings.customVoteLimit),
      updatedAt: Date.now(),
    })
  }

  function updateBountyVoteLimit(task: string, value: string) {
    writeSettings({
      ...settings,
      bountyVoteLimits: {
        ...settings.bountyVoteLimits,
        [task]: normalizeCreativeChallengeVoteLimit(value, getCreativeChallengeBountyVoteLimit(settings, task)),
      },
      updatedAt: Date.now(),
    })
  }

  function grantOrganizer(user: User) {
    const nextOrganizers = [
      ...organizers.filter((id) => id !== String(user._id)),
      String(user._id),
    ]
    const sessionToken = getCCSessionToken()
    setOrganizers(nextOrganizers)
    setCC2026Mutation({
      collection: "organizers",
      key: "_",
      value: JSON.stringify(nextOrganizers),
      sessionToken: sessionToken || undefined,
    })
    setOrganizerSearch("")
  }

  function revokeOrganizer(userId: string) {
    if (!window.confirm("确认取消该用户的挑战赛后台管理权限吗？")) return

    const nextOrganizers = organizers.filter((id) => id !== userId)
    const sessionToken = getCCSessionToken()
    setOrganizers(nextOrganizers)
    setCC2026Mutation({
      collection: "organizers",
      key: "_",
      value: JSON.stringify(nextOrganizers),
      sessionToken: sessionToken || undefined,
    })
  }

  function exportCsv() {
    const headers = [
      "队名",
      "作品名称",
      "队长",
      "队长学号",
      "联系方式",
      "赛道",
      "悬赏任务",
      "核心成员",
      "新生参与",
      "作品简介",
      "技术关键词",
      "GitHub",
      "Demo",
      "申请算力",
      "算力计划",
      "算力使用说明 PDF",
      "状态",
      "管理员备注",
      "得票数",
      "最终提交时间",
      "提交时间",
      "更新时间",
    ]
    const rows = filteredRegistrations.map((item) => [
      item.teamName,
      item.projectName,
      item.leaderName,
      item.leaderStudentId,
      item.leaderContact,
      item.track === "custom" ? "自定义开发赛道" : "悬赏任务赛道",
      item.bountyTask,
      formatCreativeChallengeMembers(item.members),
      item.freshmen,
      item.projectSummary,
      item.techKeywords,
      item.githubUrl,
      item.demoUrl,
      item.wantsCompute ? "是" : "否",
      item.computePlan,
      item.computeReportFileName || "",
      statusLabels[item.status],
      item.adminNote,
      votes[item.id] || 0,
      item.finalSubmittedAt ? formatDateTime(item.finalSubmittedAt) : "",
      formatDateTime(item.createdAt),
      formatDateTime(item.updatedAt),
    ])
    const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "creative-challenge-2026-registrations.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!canManageChallenge) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>智慧通班创意开发挑战赛2026</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          只有超级管理员或已授权的挑战赛组织人员可以管理挑战赛报名信息。
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md border-blue-200 bg-blue-50 text-blue-800">
              独立模块
            </Badge>
            <Badge variant="outline" className="rounded-md border-violet-200 bg-violet-50 text-violet-800">
              {isSuperAdmin ? "超级管理员" : "挑战赛组织人员"}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">创意开发挑战赛后台</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理“智慧通班创意开发挑战赛2026”的报名队伍、审核状态、备注和导出数据。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/intranet/creative-challenge-2026">
              <ExternalLink className="mr-2 h-4 w-4" />
              前台页面
            </Link>
          </Button>
          <Button variant="outline" onClick={seedPreviewData}>
            <RotateCcw className="mr-2 h-4 w-4" />
            生成演示数据
          </Button>
          <Button onClick={exportCsv} disabled={filteredRegistrations.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">报名总数</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">自定义赛道</CardTitle>
            <Sparkles className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.custom}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">悬赏赛道</CardTitle>
            <Trophy className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.bounty}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">已确认</CardTitle>
            <ShieldCheck className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.accepted}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            阶段权限控制
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
            <div>
              <Select value={settings.stage} onValueChange={(value) => updateStage(value as CreativeChallengeStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map(([value, detail]) => (
                    <SelectItem key={value} value={value}>{detail.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-slate-500">
                上次切换：{settings.updatedAt ? formatDateTime(settings.updatedAt) : "尚未手动切换"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Badge variant={challengeStageDetails[settings.stage].badgeVariant} className="rounded-md">
                {challengeStageDetails[settings.stage].label}
              </Badge>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {challengeStageDetails[settings.stage].description}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                报名阶段允许报名、编辑材料和最终提交；展示投票阶段关闭提交并开放作品展示/投票；结果公示阶段关闭投票。
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">投票额度设置</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                额度按每位用户计算；自由赛道共用一个额度，悬赏赛道按具体任务分别计算。
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
              <label className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="block text-xs font-medium text-slate-500">自定义开发赛道</span>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={settings.customVoteLimit}
                    onChange={(event) => updateCustomVoteLimit(event.target.value)}
                    className="h-9"
                  />
                  <span className="whitespace-nowrap text-xs text-slate-500">票 / 人</span>
                </div>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                {bountyTasks.map((task) => (
                  <label key={task} className="rounded-lg border border-slate-200 bg-white p-3">
                    <span className="block min-h-[34px] text-xs font-medium leading-5 text-slate-600">{task}</span>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={getCreativeChallengeBountyVoteLimit(settings, task)}
                        onChange={(event) => updateBountyVoteLimit(task, event.target.value)}
                        className="h-9"
                      />
                      <span className="whitespace-nowrap text-xs text-slate-500">票 / 人</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isSuperAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              组织人员授权
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-600">
                被授权用户可以进入“创意开发挑战赛后台”，管理赛事阶段、投票额度、报名状态、备注、导出和删除记录；不会获得其他后台模块权限，也不能继续授权他人。
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={organizerSearch}
                    onChange={(event) => setOrganizerSearch(event.target.value)}
                    placeholder="搜索姓名、用户名、学号或邮箱"
                    className="pl-9"
                  />
                </label>

                {organizerSearch.trim() ? (
                  <div className="space-y-2">
                    {organizerCandidates.length > 0 ? (
                      organizerCandidates.map((user) => (
                        <div key={String(user._id)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-950">{formatCreativeChallengeUserName(user)}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {user.studentId || "无学号"} · {user.username || user.email}
                            </div>
                          </div>
                          <Button type="button" size="sm" onClick={() => grantOrganizer(user)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            授权
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        未找到可授权用户。
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    输入关键词后选择用户授权。
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">已授权组织人员</h2>
                  <Badge variant="secondary" className="rounded-md">{organizers.length} 人</Badge>
                </div>
                {organizers.length > 0 ? (
                  <div className="space-y-2">
                    {organizers.map((organizerId) => {
                       const u = organizerUserMap.get(organizerId)
                       const name = u?.chineseName || u?.englishName || organizerId
                       return (
                       <div key={organizerId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                         <div className="min-w-0">
                           <div className="font-medium text-slate-950">{name}</div>
                           <div className="mt-1 text-xs text-slate-500">
                             {u?.studentId || "无学号"} · {u?.username || u?.email || organizerId}
                           </div>
                         </div>
                         <Button type="button" size="sm" variant="destructive" onClick={() => revokeOrganizer(organizerId)}>
                           <UserMinus className="mr-2 h-4 w-4" />
                           取消
                         </Button>
                       </div>
                     )})}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    暂无额外组织人员。
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            报名记录
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索队名、作品、队长、关键词"
                className="pl-9"
              />
            </label>
            <Select value={trackFilter} onValueChange={setTrackFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TRACKS}>全部赛道</SelectItem>
                <SelectItem value="custom">自定义开发</SelectItem>
                <SelectItem value="bounty">悬赏任务</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>全部状态</SelectItem>
                {statusOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredRegistrations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">项目</TableHead>
                  <TableHead className="min-w-[220px]">队伍</TableHead>
                  <TableHead className="min-w-[180px]">赛道</TableHead>
                  <TableHead className="min-w-[180px]">状态</TableHead>
                  <TableHead className="min-w-[120px]">得票数</TableHead>
                  <TableHead className="min-w-[260px]">管理员备注</TableHead>
                  <TableHead className="min-w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-950">{item.projectName}</div>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">{item.projectSummary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.teamName}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {item.leaderName} · {item.leaderStudentId}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{item.leaderContact}</div>
                      <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600">
                        <div className="mb-1 font-semibold text-slate-700">核心成员</div>
                        <div className="whitespace-pre-wrap">{formatCreativeChallengeMembers(item.members) || "未填写"}</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">提交：{formatDateTime(item.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.track === "custom" ? "success" : "warning"} className="rounded-md">
                        {item.track === "custom" ? "自定义开发" : "悬赏任务"}
                      </Badge>
                      {item.bountyTask ? <p className="mt-2 text-xs leading-5 text-slate-500">{item.bountyTask}</p> : null}
                      {item.wantsCompute ? (
                        <div className="mt-2 space-y-1">
                          <Badge variant="outline" className="rounded-md border-blue-200 text-blue-700">申请算力</Badge>
                          <p className="text-xs leading-5 text-slate-500">
                            {item.computeReportFileName ? `算力说明：${item.computeReportFileName}` : "尚未上传算力说明"}
                          </p>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateRegistration(item.id, { status: value as CreativeChallengeRegistrationStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant={statusBadgeVariants[item.status]} className="mt-2 rounded-md">
                        {statusLabels[item.status]}
                      </Badge>
                      {item.finalSubmittedAt ? (
                        <div className="mt-2">
                          <Badge variant="success" className="rounded-md">已最终提交</Badge>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{formatDateTime(item.finalSubmittedAt)}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">尚未最终提交</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                        <div className="text-2xl font-extrabold text-slate-950">{votes[item.id] || 0}</div>
                        <div className="mt-1 text-xs text-slate-500">自动统计</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={item.adminNote}
                        onChange={(event) => updateRegistration(item.id, { adminNote: event.target.value })}
                        placeholder="审核意见、补充材料要求或内部备注"
                        className="min-h-[96px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => removeRegistration(item.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">暂无报名记录。</p>
              <Button variant="outline" className="mt-4" onClick={seedPreviewData}>
                <RotateCcw className="mr-2 h-4 w-4" />
                生成演示数据
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
