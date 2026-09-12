export type CreativeAppSlug =
  | "class-notes"
  | "tongxiaomiao"
  | "jiahui"
  | "admission"
  | "yizhi"

export type CreativeAppStatus = "preparing" | "beta" | "online" | "maintenance"

export type DeployedChallengeApp = {
  slug: CreativeAppSlug
  registrationId: string
  delivery: "online" | "local"
  status: CreativeAppStatus
  enabled: boolean
}

/**
 * 已部署的 CC2026 获奖作品接入配置。
 * 项目介绍、GitHub、Demo 等展示信息一律从比赛报名数据（cc2026Store）读取，
 * 此配置只保存映射关系和上线状态，避免两处内容不一致。
 */
export const deployedChallengeApps: DeployedChallengeApp[] = [
  {
    slug: "class-notes",
    registrationId: "challenge-1783832867586-cd7kyc",
    delivery: "local",
    status: "preparing",
    enabled: true,
  },
  {
    slug: "tongxiaomiao",
    registrationId: "challenge-1787497262096-q4vs1m",
    delivery: "online",
    status: "preparing",
    enabled: true,
  },
  {
    slug: "jiahui",
    registrationId: "challenge-1787424801864-6fu3k1",
    delivery: "online",
    status: "preparing",
    enabled: true,
  },
  {
    slug: "admission",
    registrationId: "challenge-1787497416416-zthp82",
    delivery: "online",
    status: "preparing",
    enabled: true,
  },
  {
    slug: "yizhi",
    registrationId: "challenge-1784000655566-26r7mf",
    delivery: "online",
    status: "preparing",
    enabled: true,
  },
]

export const creativeAppMeta: Record<
  CreativeAppSlug,
  { shortTitle: string; tagline: string }
> = {
  "class-notes": {
    shortTitle: "课堂笔记生成",
    tagline: "从北大课程平台选择讲次，自动生成整理后的课堂笔记（本地工具）",
  },
  tongxiaomiao: {
    shortTitle: "通小喵画廊",
    tagline: "通小喵形象自动设计模型的成品画廊与许愿池",
  },
  jiahui: {
    shortTitle: "嘉会",
    tagline: "活动策划型 Agent：生成活动方案、经费表与流程安排",
  },
  admission: {
    shortTitle: "招生咨询",
    tagline: "通班招生信息检索与问答：官方来源、带引用、时效校验",
  },
  yizhi: {
    shortTitle: "易知",
    tagline: "个人知识工作台：资料索引与基于已发布资料的问答",
  },
}

export const creativeAppStatusLabels: Record<CreativeAppStatus, string> = {
  preparing: "接入准备中",
  beta: "内测中",
  online: "已上线",
  maintenance: "维护中",
}

export function getDeployedChallengeApp(slug: string): DeployedChallengeApp | undefined {
  return deployedChallengeApps.find((app) => app.slug === slug)
}

export function isCreativeAppSlug(slug: string): slug is CreativeAppSlug {
  return deployedChallengeApps.some((app) => app.slug === slug)
}
