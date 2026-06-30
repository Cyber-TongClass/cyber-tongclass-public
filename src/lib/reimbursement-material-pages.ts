export type ReimbursementMaterialTextBlock = {
  type: "title" | "heading" | "paragraph" | "signature"
  text: string
}

export type ReimbursementMaterialImageBlock = {
  type: "image"
  src: string
  alt: string
  width: number
  height: number
}

export type ReimbursementMaterialDocumentBlock = ReimbursementMaterialTextBlock | ReimbursementMaterialImageBlock

export type ReimbursementMaterialPage = {
  slug: string
  title: string
  description: string
  category: string
  sourceType: "PDF" | "DOCX"
  sourceUpdatedAt: string
  documentBlocks: ReimbursementMaterialDocumentBlock[]
}

export const SUPPORT_PLAN_PAGE_SLUG = "academic-exchange-support-plan"
export const OVERSEAS_REIMBURSEMENT_NOTES_PAGE_SLUG = "overseas-reimbursement-notes"
export const SCHOLARSHIP_RESEARCH_REVIEW_PAGE_SLUG = "scholarship-research-review-suggestions"
export const ACADEMIC_EXCHANGE_MATERIAL_CATEGORY = "academic-exchange"
export const SCHOLARSHIP_REVIEW_MATERIAL_CATEGORY = "scholarship-review"

export const reimbursementMaterialPages: ReimbursementMaterialPage[] = [
  {
    slug: SUPPORT_PLAN_PAGE_SLUG,
    title: "通班学术交流项目支持方案",
    description: "学术交流项目的支持对象、支持范围、支持额度和评审流程。",
    category: ACADEMIC_EXCHANGE_MATERIAL_CATEGORY,
    sourceType: "PDF",
    sourceUpdatedAt: "2023/9/18",
    documentBlocks: [
      { type: "title", text: "通班学术交流项目支持方案（修订版）" },
      {
        type: "paragraph",
        text: "为扩大通班学生的学术视野，提高学生培养质量，推动学生教育国际化，人工智能研究院（下简称“研究院”）拟对通班学生对外学术交流给予支持，方案细则如下：",
      },
      { type: "heading", text: "第一条 资金来源" },
      { type: "paragraph", text: "资金拟从研究院机构建设费、“高精尖-人工智能”专项教学经费、黄奕聪基金等统筹支出。" },
      { type: "heading", text: "第二条 支持对象" },
      { type: "paragraph", text: "元培通班所有学生" },
      { type: "heading", text: "第三条 支持范围" },
      {
        type: "paragraph",
        text: "1.以作报告、发表论文方式参加的国内外学术会议（科研方向应与人工智能相关），支持会议注册费、相关差旅费。",
      },
      {
        type: "paragraph",
        text: "2.成功申请国际合作部的学生“海外学习”项目，支持出入境经济舱往返机票。",
      },
      { type: "paragraph", text: "3.其它评审工作组认为可支持的学术交流项目。" },
      { type: "heading", text: "第四条 支持额度" },
      {
        type: "paragraph",
        text: "国内（含港澳台）学术会议支持额度（含注册费和差旅费）不超过 1 万元/次，国际学术会议支持额度（含注册费和差旅费）不超过 3 万元/次，“海外学习”项目的出入境经济舱往返机票支持额度共不超过 2 万元/人次，超额部分自理。",
      },
      {
        type: "paragraph",
        text: "“海外学习”项目的出入境经济舱往返机票每个自然年度内支持上限为 15 人次，原则上以申请成功次序为准；如多个申请人同期申请成功，支持对象以评审工作委员会审定结果为准。",
      },
      {
        type: "paragraph",
        text: "每个自然年度内，研究院所支持的学术交流项目的总额度上限为 40 万元人民币，原则上当年度已通过支持总金额达到上限后不再接受新申请；如有特殊情况另行审议。",
      },
      { type: "paragraph", text: "支持金额应符合学校相关制度、以学校财务实际报销为准。" },
      { type: "heading", text: "第五条 评审程序" },
      { type: "paragraph", text: "研究院组织成立评审工作委员会，成员由研究院分管领导、通班管理委员会成员等组成。" },
      {
        type: "paragraph",
        text: "申请人本人填写《通班学术交流支持项目申请表》，提交至研究院，待评审工作委员会审议通过后给予支持。",
      },
      { type: "heading", text: "第六条 支持终止" },
      {
        type: "paragraph",
        text: "如因签证、项目变更等原因导致学术交流项目终止，该支持项目即随之终止。该学生后续如有其他学术交流项目需重新申请。",
      },
      {
        type: "paragraph",
        text: "本方案经研究院第一届第 73 次院务会审议通过，第一届第 76 次院务会修订。解释权归研究院院务会。",
      },
      { type: "signature", text: "人工智能研究院" },
      { type: "signature", text: "2023/9/18" },
    ],
  },
  {
    slug: OVERSEAS_REIMBURSEMENT_NOTES_PAGE_SLUG,
    title: "通班学生出国出境报销注意事项",
    description: "出国出境报销前需要准备的审批、批件、支付方式、出入境记录和票据材料。",
    category: ACADEMIC_EXCHANGE_MATERIAL_CATEGORY,
    sourceType: "DOCX",
    sourceUpdatedAt: "内部资料",
    documentBlocks: [
      { type: "title", text: "通班学生出国出境报销注意事项" },
      {
        type: "paragraph",
        text: "签字的《通班学术交流支持申请表》—需要提前经研究院审批同意，只需要申请表不需要文件附件。",
      },
      { type: "paragraph", text: "出国访问交流照片（请邮件发至yuyl@pku.edu.cn）。" },
      {
        type: "paragraph",
        text: "北京大学出国赴港澳任务通知批件（红头，北京大学国际合作部盖章）批件为报销的必要附件材料，请先下载并打印批件。",
      },
      {
        type: "paragraph",
        text: "确认支付方式，一般默认校内转卡，（应该对应的校内农行卡号），如有机票等对公转账需提前说明。",
      },
      {
        type: "image",
        src: "/intranet-materials/overseas-reimbursement-entry-exit-sample-main.png",
        alt: "通班学生出国出境报销注意事项原文图片 1",
        width: 556,
        height: 232,
      },
      { type: "paragraph", text: "出入境的记录（国家移民管理局出入境查询结果电子文件），以下为样式。" },
      {
        type: "image",
        src: "/intranet-materials/overseas-reimbursement-entry-exit-sample-detail.png",
        alt: "通班学生出国出境报销注意事项原文图片 2",
        width: 447,
        height: 129,
      },
      {
        type: "paragraph",
        text: "是否逾期：出入境的记录和以上批件时间是否对应，否的话，不论提前或者延后，都要提供： -因公临时出国（境）逾期情况说明（教学科研人员专用）此表需要学籍所在院系申请签章。",
      },
      { type: "paragraph", text: "提供发票：机票-住宿-及其他需要报销的发票。" },
      {
        type: "paragraph",
        text: "发票（2个人在发票上签字）+订单（机票显示经济舱）+银行支付记录截图（和订单发票金额对上，不能差一分钱）。",
      },
    ],
  },
  {
    slug: SCHOLARSHIP_RESEARCH_REVIEW_PAGE_SLUG,
    title: "关于通班奖学金科研成果的评审建议",
    description: "奖学金评选中科研成果状态、作者贡献、材料规范和口头汇报要求。",
    category: SCHOLARSHIP_REVIEW_MATERIAL_CATEGORY,
    sourceType: "PDF",
    sourceUpdatedAt: "2026/6/24",
    documentBlocks: [
      { type: "title", text: "关于通班奖学金科研成果的评审建议" },
      { type: "heading", text: "一、科研成果认定标准" },
      { type: "paragraph", text: "1.1 成果状态分类" },
      { type: "paragraph", text: "科研成果按投稿状态严格分为以下三类，不得使用其他表述：" },
      { type: "paragraph", text: "• 已接收：论文已被期刊或会议正式接收，需提供接收通知或邮件证明。" },
      { type: "paragraph", text: "• 已送审：论文正在同行评议。" },
      { type: "paragraph", text: "• 其他：论文仍在撰写、投稿准备或者投稿但并未送审阶段。" },
      { type: "paragraph", text: "1.2 作者贡献计算规则" },
      { type: "paragraph", text: "在已接收论文中：" },
      { type: "paragraph", text: "• 第一作者：贡献度按 100% 计算。" },
      { type: "paragraph", text: "• 共同第一作者：" },
      {
        type: "paragraph",
        text: "○ 排序第二：仅当论文作者总数超过 4 人时认定，贡献度按 50% 计算；否则算 0%。",
      },
      {
        type: "paragraph",
        text: "○ 排序第三：仅当论文作者总数超过 6 人时认定，贡献度按 33% 计算；否则算 0%。",
      },
      { type: "paragraph", text: "○ 以此类推，贡献度按 1/排序计算。" },
      { type: "heading", text: "二、材料使用规范" },
      { type: "paragraph", text: "2.1 成果使用限制" },
      {
        type: "paragraph",
        text: "科研成果材料和口头展示中，仅可使用未曾获奖的相关工作。已用于往年奖学金评选的工作严禁重复使用。",
      },
      { type: "paragraph", text: "2.2 违规处理" },
      { type: "paragraph", text: "发现重复使用科研成果者，暂停其奖学金评选资格两年（含当年）。" },
      { type: "heading", text: "三、材料真实性要求" },
      {
        type: "paragraph",
        text: "申请材料必须真实准确，经反复核验无误后提交。如发现材料造假（无论主观故意或客观疏忽），暂停申请人奖学金评选资格两年（含当年）。",
      },
      { type: "heading", text: "四、成果类型限制" },
      { type: "paragraph", text: "以下类型论文原则上不计入科研成果：" },
      { type: "paragraph", text: "• Sponsored Article、Advertisement 或类似性质的论文。" },
      { type: "paragraph", text: "• Workshop Paper。" },
      { type: "paragraph", text: "• 期刊或会议综述文章（Review 或 Survey）。" },
      { type: "paragraph", text: "• 观点性文章（Perspective、Opinion、Focus 等非研究性文章）。" },
      { type: "paragraph", text: "• 其他评审委员会认为不计入科研成果的情况。" },
      { type: "heading", text: "五、口头汇报要求" },
      {
        type: "paragraph",
        text: "• 口头汇报应重点展示申请人作为第一作者或共同第一作者的科研成果，列明个人贡献和创新点。",
      },
      { type: "paragraph", text: "• 重点介绍技术创新与技术细节。" },
    ],
  },
]

export function getReimbursementMaterialPage(slug: string) {
  return reimbursementMaterialPages.find((page) => page.slug === slug)
}

export type ReimbursementMaterialListItem = {
  text: string
  images: ReimbursementMaterialImageBlock[]
}

export type ReimbursementMaterialArticleSection = {
  heading: string
  paragraphs: string[]
}

export function buildReimbursementMaterialListItems(blocks: ReimbursementMaterialDocumentBlock[]) {
  const items: ReimbursementMaterialListItem[] = []

  blocks.forEach((block) => {
    if (block.type === "title" || block.type === "heading" || block.type === "signature") return

    if (block.type === "image") {
      const previousItem = items[items.length - 1]
      if (previousItem) previousItem.images.push(block)
      return
    }

    items.push({ text: block.text, images: [] })
  })

  return items
}

export function buildReimbursementMaterialArticleSections(blocks: ReimbursementMaterialDocumentBlock[]) {
  const sections: ReimbursementMaterialArticleSection[] = []
  let currentSection: ReimbursementMaterialArticleSection | null = null

  blocks.forEach((block) => {
    if (block.type === "title" || block.type === "image") return

    if (block.type === "heading") {
      currentSection = { heading: block.text, paragraphs: [] }
      sections.push(currentSection)
      return
    }

    if (block.type === "signature") {
      currentSection = null
      return
    }

    if (!currentSection) {
      currentSection = { heading: "", paragraphs: [] }
      sections.push(currentSection)
    }
    currentSection.paragraphs.push(block.text)
  })

  return sections
}
