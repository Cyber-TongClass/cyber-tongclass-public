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
import { siteCopy } from "@/config/site-copy"

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
    ...siteCopy.intranet.modules.treehole,
    icon: MessageSquare,
    href: "/tong-class/intranet/treehole",
  },
  {
    id: "feedback",
    ...siteCopy.intranet.modules.feedback,
    icon: FileText,
    href: "/tong-class/intranet/feedback",
  },
  {
    id: "wps",
    ...siteCopy.intranet.modules.wps,
    icon: LinkIcon,
    href: "/tong-class/intranet/wps",
  },
  {
    id: "techday",
    ...siteCopy.intranet.modules.techday,
    icon: CalendarDays,
    href: "/techday",
  },
  {
    id: "creative-challenge-2026",
    ...siteCopy.intranet.modules.challenge,
    icon: Trophy,
    href: "/tong-class/intranet/creative-challenge-2026",
  },
  {
    id: "materials",
    ...siteCopy.intranet.modules.materials,
    icon: Download,
    href: "/tong-class/intranet/materials",
  },
  {
    id: "reimbursements",
    ...siteCopy.intranet.modules.reimbursements,
    icon: Receipt,
    href: "/tong-class/intranet/reimbursements",
  },
  {
    id: "forms",
    ...siteCopy.intranet.modules.forms,
    icon: ClipboardList,
    href: "/tong-class/intranet/forms",
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
