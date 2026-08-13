/**
 * First-release public directory fixture.
 *
 * Every entry is deliberately fictional and marked as demonstration data. The
 * shapes mirror the safe public DTOs that will later be supplied by the AIA API
 * boundary, so pages can swap the source without changing their presentation.
 */
export type PublicDirectoryPersonKind = "teacher" | "graduate"

export type PublicDirectoryPerson = {
  slug: string
  nameZh: string
  nameEn: string
  kind: PublicDirectoryPersonKind
  title: string
  photoUrl?: string
  bio: string
  researchAreas: readonly string[]
  groupSlugs: readonly string[]
  coffeeTalkOpen: boolean
  isDemo: boolean
  visibility: "public" | "hidden"
}

export type PublicResearchGroup = {
  slug: string
  nameZh: string
  nameEn: string
  summary: string
  description: string
  researchAreas: readonly string[]
  publicLinks: readonly {
    label: string
    href: string
  }[]
  leaderSlug: string
  memberSlugs: readonly string[]
  recruitmentNote: string
  sortOrder: number
  isDemo: boolean
  visibility: "public" | "hidden"
}

export type PublicResearchOutput = {
  id: string
  title: string
  kind: string
  summary: string
  year: number
  contributorSlugs: readonly string[]
  groupSlugs: readonly string[]
  isDemo: boolean
  isCorrespondingContributor?: boolean
  href?: `/${string}`
}

export type PublicDirectoryUpdate = {
  id: string
  title: string
  summary: string
  dateLabel: string
  relatedPersonSlugs: readonly string[]
  relatedGroupSlugs: readonly string[]
  isDemo: boolean
  href?: `/${string}`
}

export const demoPeople: readonly PublicDirectoryPerson[] = [
  {
    slug: "demo-professor-alpha",
    nameZh: "演示教授甲",
    nameEn: "Professor Demo Alpha",
    kind: "teacher",
    title: "研究院教师（演示档案）",
    bio: "这是用于首期目录展示的虚构教师档案，用来说明公开人物页、研究方向与 Coffee Talk 入口的呈现方式。",
    researchAreas: ["可信人工智能", "人机协作"],
    groupSlugs: ["demo-intelligent-systems-lab"],
    coffeeTalkOpen: false,
    isDemo: true,
    visibility: "public",
  },
  {
    slug: "demo-graduate-beta",
    nameZh: "演示研究生乙",
    nameEn: "Graduate Demo Beta",
    kind: "graduate",
    title: "研究生（演示档案）",
    bio: "这是用于首期目录展示的虚构研究生档案，页面仅呈现经批准公开的简介与研究方向。",
    researchAreas: ["机器学习系统", "科学智能"],
    groupSlugs: ["demo-intelligent-systems-lab", "demo-ai-foundations-group"],
    coffeeTalkOpen: false,
    isDemo: true,
    visibility: "public",
  },
  {
    slug: "demo-graduate-gamma",
    nameZh: "演示研究生丙",
    nameEn: "Graduate Demo Gamma",
    kind: "graduate",
    title: "研究生（演示档案）",
    bio: "这是用于首期目录展示的虚构研究生档案，用于演示跨团队成员关系和公开研究成果的聚合。",
    researchAreas: ["基础模型", "智能体"],
    groupSlugs: ["demo-ai-foundations-group"],
    coffeeTalkOpen: false,
    isDemo: true,
    visibility: "public",
  },
]

export const demoResearchGroups: readonly PublicResearchGroup[] = [
  {
    slug: "demo-intelligent-systems-lab",
    nameZh: "智能系统实验室（演示）",
    nameEn: "Demo Intelligent Systems Lab",
    summary: "以虚构示例展示研究团队目录、成员关系和公开研究主题的呈现结构。",
    description:
      "该团队为产品演示数据，不代表真实研究组织、项目或招募信息。它用于验证用户能够从人员页、团队页和成果页之间清楚地浏览公开资料。",
    researchAreas: ["可信人工智能", "机器学习系统", "人机协作"],
    publicLinks: [],
    leaderSlug: "demo-professor-alpha",
    memberSlugs: ["demo-professor-alpha", "demo-graduate-beta"],
    recruitmentNote: "演示信息：真实招募与联系渠道将在经研究院确认后单独发布。",
    sortOrder: 1,
    isDemo: true,
    visibility: "public",
  },
  {
    slug: "demo-ai-foundations-group",
    nameZh: "智能基础研究组（演示）",
    nameEn: "Demo AI Foundations Group",
    summary: "以虚构示例展示基础研究主题、跨团队成员与相关成果的公开目录结构。",
    description:
      "该团队为产品演示数据，不代表真实课题组、论文、人员或招募安排。它用于说明未来真实公开资料接入后的页面组织方式。",
    researchAreas: ["基础模型", "智能体", "科学智能"],
    publicLinks: [],
    leaderSlug: "demo-professor-alpha",
    memberSlugs: ["demo-graduate-beta", "demo-graduate-gamma"],
    recruitmentNote: "演示信息：真实招募与联系渠道将在经研究院确认后单独发布。",
    sortOrder: 2,
    isDemo: true,
    visibility: "public",
  },
]

export const demoResearchOutputs: readonly PublicResearchOutput[] = [
  {
    id: "demo-output-trustworthy-systems",
    title: "面向研究协作的可信智能系统（演示成果）",
    kind: "研究成果示例",
    summary: "用于展示目录中的成果关联方式，不构成真实论文、项目或发布记录。",
    year: 2026,
    contributorSlugs: ["demo-professor-alpha", "demo-graduate-beta"],
    groupSlugs: ["demo-intelligent-systems-lab"],
    isDemo: true,
  },
  {
    id: "demo-output-foundation-models",
    title: "基础模型研究主题聚合（演示成果）",
    kind: "研究成果示例",
    summary: "用于展示团队页和人员页对公开研究条目的安全聚合，不构成真实学术成果。",
    year: 2026,
    contributorSlugs: ["demo-graduate-beta", "demo-graduate-gamma"],
    groupSlugs: ["demo-ai-foundations-group"],
    isDemo: true,
  },
]

export const demoDirectoryUpdates: readonly PublicDirectoryUpdate[] = [
  {
    id: "demo-update-directory-preview",
    title: "研究院公共目录首期展示（演示动态）",
    summary: "首期页面使用清晰标注的虚构条目，真实公开资料将在审核与发布流程完成后逐步接入。",
    dateLabel: "演示时间线",
    relatedPersonSlugs: ["demo-professor-alpha", "demo-graduate-beta", "demo-graduate-gamma"],
    relatedGroupSlugs: ["demo-intelligent-systems-lab", "demo-ai-foundations-group"],
    isDemo: true,
  },
  {
    id: "demo-update-coffee-talk",
    title: "Coffee Talk 服务入口说明（演示动态）",
    summary: "申请服务以正式流程为准；本条目仅用于展示与可公开教师档案之间的关联。",
    dateLabel: "演示时间线",
    relatedPersonSlugs: ["demo-professor-alpha"],
    relatedGroupSlugs: ["demo-intelligent-systems-lab"],
    isDemo: true,
  },
]

export function getDemoPerson(slug: string) {
  return demoPeople.find((person) => person.slug === slug)
}

export function getDemoResearchGroup(slug: string) {
  return demoResearchGroups.find((group) => group.slug === slug)
}
