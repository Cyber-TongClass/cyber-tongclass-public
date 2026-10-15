export type ShowcaseProject = {
  number: string
  slug: string
  title: string
  projectTitle: string
  category: string
  mode: string
  status: string
  description: string
  outputs: string[]
  sourceUrl: string
  image?: string
  imageAlt?: string
}

/**
 * Static showcase content for the public challenge page.
 *
 * This intentionally has no Convex dependency: the showcase can go live
 * while project APIs and the runtime deployment are still being coordinated.
 */
export const creativeChallengeShowcase: ShowcaseProject[] = [
  {
    number: "01",
    slug: "class-notes",
    title: "通小课",
    projectTitle: "课堂笔记自动生成系统",
    category: "学习工具",
    mode: "本地工具",
    status: "展示版",
    description: "把课程内容整理成结构清楚的课堂笔记，生成过程留在自己的电脑上。",
    outputs: ["课程内容整理", "课堂笔记生成", "本地保存与复核"],
    sourceUrl: "https://github.com/xiaoce-2025/yxx_notes",
  },
  {
    number: "02",
    slug: "tongxiaomiao",
    title: "通小喵",
    projectTitle: "通小喵形象设计模型",
    category: "形象设计",
    mode: "案例画廊",
    status: "可浏览",
    description: "从角色图和动作参考出发，探索通班形象在头像、贴纸与插画中的不同模样。",
    outputs: ["角色一致性", "动作参考生成", "贴纸与头像案例"],
    sourceUrl: "https://github.com/look-dyz/tongtong",
    image: "/images/cc2026/tongxiaomiao/result-smile.png",
    imageAlt: "通小喵微笑头像案例",
  },
  {
    number: "03",
    slug: "jiahui",
    title: "嘉会",
    projectTitle: "活动策划型 Agent",
    category: "班务工具",
    mode: "展示版",
    status: "待接入",
    description: "从活动目标出发，拆解流程、预算、物资和人员分工，让一个想法逐步变成可执行的方案。",
    outputs: ["活动方案", "预算与物资清单", "执行任务与分工"],
    sourceUrl: "https://github.com/qqqqingmo/jiahui-activity-agent",
  },
  {
    number: "04",
    slug: "tongmark",
    title: "Tong Mark",
    projectTitle: "Tong Mark 文件水印",
    category: "文件工具",
    mode: "展示版",
    status: "待接入",
    description: "给需要流转的文件留下清晰、可追溯的标记，兼顾使用过程中的阅读和分享。",
    outputs: ["文件水印", "前后对比", "下载与分享"],
    sourceUrl: "https://github.com/Coriolis0120/Tongmark",
  },
  {
    number: "05",
    slug: "admission",
    title: "通小招",
    projectTitle: "招生资料问答 Skill",
    category: "信息检索",
    mode: "展示版",
    status: "待接入",
    description: "在招生资料中寻找答案，并把每条结论指回对应原文，减少只凭印象回答的问题。",
    outputs: ["资料检索", "原文引用", "信息日期提示"],
    sourceUrl: "https://github.com/Paulowniarain/pku-ai-admission",
  },
  {
    number: "06",
    slug: "tongpaper",
    title: "Tong Paper",
    projectTitle: "Tong Paper 论文工具",
    category: "科研工具",
    mode: "展示版",
    status: "待接入",
    description: "把论文阅读、信息整理和数据处理串成一条更顺手的工作流，服务日常科研。",
    outputs: ["论文处理", "数据整理", "科研工作流"],
    sourceUrl: "https://github.com/gky0329/Tongpaper",
  },
  {
    number: "07",
    slug: "yizhi",
    title: "通小知",
    projectTitle: "易知知识工作台",
    category: "知识工作台",
    mode: "展示版",
    status: "待接入",
    description: "把班级资料放进同一个空间，按来源查找和提问，回答可以回到原文核对。",
    outputs: ["资料归集", "文档检索", "引用回溯"],
    sourceUrl: "https://github.com/s11phere/creative-challenge-2026",
  },
]

export const creativeChallengeFeaturedProject = creativeChallengeShowcase.find(
  (project) => project.slug === "tongxiaomiao",
)
