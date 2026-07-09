import {
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Receipt,
  Trophy,
  type LucideIcon,
} from "lucide-react"

export const INTRANET_MODULE_SETTINGS_STORAGE_KEY = "tongclass_intranet_module_settings"

export type IntranetModuleId =
  | "treehole"
  | "feedback"
  | "wps"
  | "techday"
  | "creative-challenge-2026"
  | "materials"
  | "reimbursements"
  | "forms"

export type IntranetModuleDefinition = {
  id: IntranetModuleId
  title: string
  description: string
  icon: LucideIcon
  href: string
}

export type IntranetModuleSetting = {
  id: IntranetModuleId
  visible: boolean
}

export const defaultIntranetModules: IntranetModuleDefinition[] = [
  {
    id: "treehole",
    title: "通班树洞",
    description: "面向通班成员的内部讨论区。可以实名或匿名发帖、回复，交流学习生活中的想法、困惑......",
    icon: MessageSquare,
    href: "/intranet/treehole",
  },
  {
    id: "feedback",
    title: "意见反馈",
    description: "用于收集同学们对通班学习、科研、课程、活动、组织运行等方面的建议，管理员会定期收集整理并向院办/管委会汇报。",
    icon: FileText,
    href: "/intranet/feedback",
  },
  {
    id: "wps",
    title: "通班工作 WPS",
    description: "想参与通班自治委员会工作的同学，可在这里申请加入通班 WPS workspace，获得历年学生工作材料资源。",
    icon: LinkIcon,
    href: "/intranet/wps",
  },
  {
    id: "techday",
    title: "TechDay 科技节平台",
    description: "科技节成果展示、投稿管理、评奖、报销和外部作者/志愿者注册入口。内部成员可直接使用通班账号进入。",
    icon: CalendarDays,
    href: "/techday",
  },
  {
    id: "creative-challenge-2026",
    title: "智慧通班创意开发挑战赛2026",
    description: "2026通班创意开发挑战赛入口，诚邀你来一起建设智慧通班！",
    icon: Trophy,
    href: "/intranet/creative-challenge-2026",
  },
  {
    id: "materials",
    title: "资料下载",
    description: "通班相关的各种内部资料下载，包括但不限于培养方案、报销政策文件等。",
    icon: Download,
    href: "/intranet/materials",
  },
  {
    id: "reimbursements",
    title: "报销",
    description: "学术交流支持、学生活动等报销申请入口。",
    icon: Receipt,
    href: "/intranet/reimbursements",
  },
  {
    id: "forms",
    title: "OA 填报",
    description: "查看正在发布的问卷、申请和报销类表单，提交材料并跟踪审核结果。",
    icon: ClipboardList,
    href: "/intranet/forms",
  },
]

export function createDefaultIntranetModuleSettings(): IntranetModuleSetting[] {
  return defaultIntranetModules.map((module) => ({
    id: module.id,
    visible: true,
  }))
}

export function normalizeIntranetModuleSettings(value: unknown): IntranetModuleSetting[] {
  const fallback = createDefaultIntranetModuleSettings()
  if (!Array.isArray(value)) return fallback

  const validIds = new Set(defaultIntranetModules.map((module) => module.id))
  const seenIds = new Set<IntranetModuleId>()
  const settings: IntranetModuleSetting[] = []

  value.forEach((item) => {
    if (!item || typeof item !== "object") return
    const record = item as Partial<IntranetModuleSetting>
    if (!record.id || !validIds.has(record.id) || seenIds.has(record.id)) return

    settings.push({
      id: record.id,
      visible: typeof record.visible === "boolean" ? record.visible : true,
    })
    seenIds.add(record.id)
  })

  fallback.forEach((setting) => {
    if (!seenIds.has(setting.id)) settings.push(setting)
  })

  return settings
}

export function readIntranetModuleSettings(): IntranetModuleSetting[] {
  if (typeof window === "undefined") return createDefaultIntranetModuleSettings()

  try {
    const raw = window.localStorage.getItem(INTRANET_MODULE_SETTINGS_STORAGE_KEY)
    if (!raw) return createDefaultIntranetModuleSettings()
    return normalizeIntranetModuleSettings(JSON.parse(raw))
  } catch {
    return createDefaultIntranetModuleSettings()
  }
}

export function writeIntranetModuleSettings(settings: IntranetModuleSetting[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    INTRANET_MODULE_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizeIntranetModuleSettings(settings))
  )
}

export function getConfiguredIntranetModules(settings = readIntranetModuleSettings()) {
  const modulesById = new Map(defaultIntranetModules.map((module) => [module.id, module]))

  return normalizeIntranetModuleSettings(settings)
    .filter((setting) => setting.visible)
    .map((setting) => modulesById.get(setting.id))
    .filter(Boolean) as IntranetModuleDefinition[]
}
