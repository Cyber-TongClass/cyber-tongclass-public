import type { User } from "@/types"

export type CreativeChallengeTrack = "custom" | "bounty"
export type CreativeChallengeStage = "registration" | "showcase" | "results"

export type CreativeChallengeRegistrationStatus =
  | "submitted"
  | "reviewing"
  | "accepted"
  | "needs_revision"
  | "withdrawn"

export type CreativeChallengeMember = {
  name: string
  role: string
  isTongClass?: boolean
  userId?: string
  username?: string
  studentId?: string
}

export type CreativeChallengeRegistration = {
  id: string
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
  computeReportFileName?: string
  computeReportMimeType?: string
  computeReportSize?: number
  computeReportUpdatedAt?: number
  status: CreativeChallengeRegistrationStatus
  adminNote: string
  score: number | null
  finalSubmittedAt?: number
  createdAt: number
  updatedAt: number
}

export type CreativeChallengeSettings = {
  stage: CreativeChallengeStage
  customVoteLimit: number
  bountyVoteLimits: Record<string, number>
  updatedAt: number
}

export type CreativeChallengeOrganizer = {
  userId: string
  name: string
  username?: string
  studentId?: string
  email?: string
  grantedAt: number
}

type CreativeChallengeUserLike = Partial<User> & {
  _id?: unknown
  role?: string
}

export type CreativeChallengePhase = {
  label: string
  description: string
  date: string
  dateTime: string
  accent: "blue" | "green" | "amber" | "purple" | "rose"
}

export const challengeMilestones: CreativeChallengePhase[] = [
  {
    label: "发布通知与报名",
    description: "开始自由组队，确定队名、队员构成和初步作品方向。",
    date: "7 月 12 日起",
    dateTime: "2026-07-12T00:00:00+08:00",
    accent: "blue",
  },
  {
    label: "算力权限发放",
    description: "领取悬赏任务或确认自定义方向后，可申请算力支持。",
    date: "7 月 15 日起",
    dateTime: "2026-07-15T00:00:00+08:00",
    accent: "green",
  },
  {
    label: "材料提交截止",
    description: "提交作品介绍、GitHub、README、Demo 和算力使用说明。",
    date: "8 月 23 日",
    dateTime: "2026-08-23T23:59:59+08:00",
    accent: "amber",
  },
  {
    label: "大众投票开启",
    description: "作品在内网公开展示，全体成员参与内部投票。",
    date: "8 月 24 日起",
    dateTime: "2026-08-24T00:00:00+08:00",
    accent: "purple",
  },
  {
    label: "答辩名单公布",
    description: "公布入围答辩队伍和线上答辩时间安排。",
    date: "8 月 26 日",
    dateTime: "2026-08-26T00:00:00+08:00",
    accent: "blue",
  },
  {
    label: "线上答辩",
    description: "展示功能、技术实现、创新亮点、应用价值及后续完善计划。",
    date: "8 月 31 日",
    dateTime: "2026-08-31T00:00:00+08:00",
    accent: "rose",
  },
  {
    label: "获奖公示",
    description: "公布最终结果，优秀作品进入安全审查与长期接入流程。",
    date: "9 月 6 日",
    dateTime: "2026-09-06T00:00:00+08:00",
    accent: "green",
  },
]

export const challengeTracks = [
  {
    value: "custom" as const,
    title: "自定义开发赛道",
    shortTitle: "自定义",
    description: "围绕通班学习、科研、学生工作和内部系统实际需求，自主提出项目创意并完成开发。",
    focuses: ["真实使用场景", "原创工程实现", "可维护迭代", "AI 或系统创新"],
  },
  {
    value: "bounty" as const,
    title: "悬赏任务赛道",
    shortTitle: "悬赏",
    description: "选择组委会发布的明确任务，强调完成度、稳定性和接入通班系统的可能性。",
    focuses: ["任务完成度", "系统稳定性", "部署可行性", "长期使用价值"],
  },
]

export const bountyTasks = [
  "招生咨询 Skill 蒸馏",
  "文件水印与传播追踪功能开发",
  "活动策划型 Agent 开发",
  "通小喵形象自动设计模型",
]

export const bountyTaskRequirements = [
  {
    title: bountyTasks[0],
    description: "面向招生咨询、信息问答和资料检索等场景，开发或蒸馏能够稳定回答通班和北京大学智能学科相关问题的 Skill，提高招生相关信息服务的准确性和效率。暂定奖品或奖金价值约 6000 元。",
  },
  {
    title: bountyTasks[1],
    description: "开发功能完善的文件水印系统，使文件在传播过程中能够保留可追踪信息，用于辅助定位文件传播者、转发者或泄露来源。项目应重点关注安全性、可靠性、隐蔽性和实际部署可行性。暂定奖品或奖金价值约 5000 元。",
  },
  {
    title: bountyTasks[2],
    description: "开发面向班级活动策划与执行的智能 Agent，支持活动方案生成、流程安排、物资清单整理、通知文案撰写、任务分工建议和时间表规划等功能，提升学生工作效率。暂定奖品或奖金价值约 5000 元。",
  },
  {
    title: bountyTasks[3],
    description: "围绕通班专属猫咪形象“通小喵”，开发支持多风格、多场景、多用途生成的形象自动设计模型或工具。作品可用于生成“通小喵”的表情包、头像、贴纸、插画、周边文创设计参考图、活动宣传素材等，辅助后续通班形象建设与文创产品设计。项目可结合图像生成模型微调、LoRA 训练、多模态提示词设计、风格迁移和素材管理等技术实现。暂定奖品或奖金价值约 6000 元。",
  },
]

export const DEFAULT_CUSTOM_VOTE_LIMIT = 3
export const DEFAULT_BOUNTY_TASK_VOTE_LIMIT = 1

export function normalizeCreativeChallengeVoteLimit(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" || typeof value === "string" ? Number(value) : fallback
  if (!Number.isFinite(numericValue)) return fallback
  return Math.max(0, Math.floor(numericValue))
}

export function createDefaultBountyVoteLimits() {
  return Object.fromEntries(bountyTasks.map((task) => [task, DEFAULT_BOUNTY_TASK_VOTE_LIMIT]))
}

export function createDefaultCreativeChallengeSettings(): CreativeChallengeSettings {
  return {
    stage: "registration",
    customVoteLimit: DEFAULT_CUSTOM_VOTE_LIMIT,
    bountyVoteLimits: createDefaultBountyVoteLimits(),
    updatedAt: 0,
  }
}

export function getCreativeChallengeBountyVoteLimit(settings: CreativeChallengeSettings, task: string) {
  return normalizeCreativeChallengeVoteLimit(
    settings.bountyVoteLimits[task],
    DEFAULT_BOUNTY_TASK_VOTE_LIMIT
  )
}

function getUserId(user: CreativeChallengeUserLike) {
  return user._id ? String(user._id) : ""
}

export function formatCreativeChallengeUserName(user: CreativeChallengeUserLike) {
  return [user.chineseName, user.englishName].filter(Boolean).join(" / ") || user.username || user.email || "用户"
}

export function createCreativeChallengeOrganizerFromUser(user: CreativeChallengeUserLike): CreativeChallengeOrganizer {
  return {
    userId: getUserId(user),
    name: formatCreativeChallengeUserName(user),
    ...(user.username ? { username: user.username } : {}),
    ...(user.studentId ? { studentId: user.studentId } : {}),
    ...(user.email ? { email: user.email } : {}),
    grantedAt: Date.now(),
  }
}

export function normalizeCreativeChallengeOrganizers(value: unknown): CreativeChallengeOrganizer[] {
  if (!Array.isArray(value)) return []

  const seenIds = new Set<string>()
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Partial<CreativeChallengeOrganizer>
      const userId = typeof record.userId === "string" ? record.userId : ""
      if (!userId || seenIds.has(userId)) return null
      seenIds.add(userId)

      return {
        userId,
        name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : "用户",
        ...(typeof record.username === "string" && record.username ? { username: record.username } : {}),
        ...(typeof record.studentId === "string" && record.studentId ? { studentId: record.studentId } : {}),
        ...(typeof record.email === "string" && record.email ? { email: record.email } : {}),
        grantedAt: typeof record.grantedAt === "number" ? record.grantedAt : 0,
      }
    })
    .filter(Boolean) as CreativeChallengeOrganizer[]
}

export function getCCSessionToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("tongclass_session_token")
}

export function parseCC2026DocSingle(cc2026List: any[] | undefined, collection: string) {
  const doc = (cc2026List || []).find((d: any) => d.key === "_")
  if (!doc) return null
  try { return JSON.parse(doc.value) } catch { return null }
}

export function isCreativeChallengeOrganizer(
  user?: CreativeChallengeUserLike | null,
  cc2026Organizers?: string[] | null
) {
  if (!user || !cc2026Organizers || cc2026Organizers.length === 0) return false
  const userId = getUserId(user)
  return userId ? cc2026Organizers.includes(String(userId)) : false
}

export function canManageCreativeChallenge(
  user?: CreativeChallengeUserLike | null,
  cc2026Organizers?: string[] | null
) {
  return user?.role === "super_admin" || isCreativeChallengeOrganizer(user, cc2026Organizers)
}

export const submissionChecklist = [
  "作品名称与简介",
  "队伍信息、队长和成员",
  "参赛赛道与悬赏任务选择",
  "GitHub 仓库链接与 README",
  "演示视频、截图、在线链接或可运行 Demo",
  "使用统一算力时提交算力使用说明报告",
]

export const statusLabels: Record<CreativeChallengeRegistrationStatus, string> = {
  submitted: "已提交",
  reviewing: "审核中",
  accepted: "已确认",
  needs_revision: "需补充",
  withdrawn: "已撤回",
}

export const statusBadgeVariants: Record<CreativeChallengeRegistrationStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  submitted: "secondary",
  reviewing: "default",
  accepted: "success",
  needs_revision: "warning",
  withdrawn: "destructive",
}

export const challengeStageDetails: Record<CreativeChallengeStage, {
  label: string
  description: string
  badgeVariant: "default" | "secondary" | "success" | "warning" | "outline"
}> = {
  registration: {
    label: "报名与提交中",
    description: "可报名、编辑报名信息、补充材料并最终提交作品。",
    badgeVariant: "success",
  },
  showcase: {
    label: "展示投票中",
    description: "报名和最终提交已截止，开放作品展示与内部投票。",
    badgeVariant: "warning",
  },
  results: {
    label: "结果公示",
    description: "投票已关闭，展示最终项目与评审结果。",
    badgeVariant: "secondary",
  },
}

export function getCurrentChallengePhase(now = new Date()) {
  const current = now.getTime()
  const launch = new Date(challengeMilestones[0].dateTime).getTime()
  const submitDeadline = new Date(challengeMilestones[2].dateTime).getTime()
  const voteOpen = new Date(challengeMilestones[3].dateTime).getTime()
  const defense = new Date(challengeMilestones[5].dateTime).getTime()
  const awards = new Date(challengeMilestones[6].dateTime).getTime()

  if (current < launch) return { label: "筹备中", description: "距离正式发布还有一小段时间。", accent: "blue" as const }
  if (current <= submitDeadline) return { label: "报名与开发中", description: "队伍可报名、完善方向并准备作品材料。", accent: "green" as const }
  if (current < voteOpen) return { label: "材料整理中", description: "组委会进行初步审阅，准备公开展示。", accent: "amber" as const }
  if (current < defense) return { label: "展示投票中", description: "作品进入内网展示与大众投票阶段。", accent: "purple" as const }
  if (current < awards) return { label: "答辩评审中", description: "入围队伍完成线上答辩，裁判组汇总评分。", accent: "rose" as const }
  return { label: "结果公示", description: "获奖结果公示，优秀作品进入安全审查。", accent: "green" as const }
}

export function daysUntilSubmitDeadline(now = new Date()) {
  const deadline = new Date(challengeMilestones[2].dateTime).getTime()
  return Math.max(0, Math.ceil((deadline - now.getTime()) / (24 * 60 * 60 * 1000)))
}

export function createRegistrationId() {
  return `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeCreativeChallengeMembers(value: unknown): CreativeChallengeMember[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const member = item as Partial<CreativeChallengeMember>
        const name = typeof member.name === "string" ? member.name.trim() : ""
        const role = typeof member.role === "string" ? member.role.trim() : ""
        if (!name && !role) return null

        return {
          name,
          role,
          ...(member.isTongClass ? { isTongClass: true } : {}),
          ...(member.userId ? { userId: String(member.userId) } : {}),
          ...(member.username ? { username: member.username } : {}),
          ...(member.studentId ? { studentId: member.studentId } : {}),
        }
      })
      .filter(Boolean) as CreativeChallengeMember[]
  }

  if (typeof value === "string") {
    const text = value.trim()
    return text ? [{ name: "", role: text }] : []
  }

  return []
}

export function formatCreativeChallengeMembers(members: unknown) {
  const normalizedMembers = normalizeCreativeChallengeMembers(members)
  if (normalizedMembers.length === 0) return ""

  return normalizedMembers
    .map((member, index) => {
      const name = member.name || `核心成员 ${index + 1}`
      const identity = member.isTongClass ? "已确认通班成员" : "未关联成员"
      const role = member.role ? `：${member.role}` : ""
      return `${name}（${identity}）${role}`
    })
    .join("\n")
}
