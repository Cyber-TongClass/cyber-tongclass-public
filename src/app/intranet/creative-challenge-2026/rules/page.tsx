import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Code2,
  FileText,
  Gavel,
  Gift,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bountyTaskRequirements, challengeMilestones } from "@/lib/creative-challenge-2026"

const purposes = [
  "推动通班数字化系统建设，进一步丰富内部网站及相关实用功能，提升班级事务的信息化、智能化管理水平。",
  "鼓励同学将所学编程技术应用于真实工程开发场景，在实践中提升技术应用能力、问题解决能力和项目实现能力。",
  "在课内知识学习和科研训练之外，引导同学参与可落地、可维护、可持续迭代的工程项目开发，锻炼项目设计、协作开发与管理能力。",
  "调动同学参与班级建设的积极性，完善通班内部共建、共享、共用机制，增强集体参与感和责任感。",
  "打造具有通班特色的系统性学生创新实践活动品牌，形成可延续、可积累、可展示的班级技术建设成果。",
  "探索 AI 时代学生自主参与数字化建设的新形式，鼓励同学结合人工智能、大模型、网页系统和编程工具开发，服务班级实际需求。",
]

const submissionItems = [
  "作品名称。",
  "队伍信息，包括队员名单、队长及团队成员分工。",
  "参赛赛道，即悬赏任务赛道或自定义开发赛道。",
  "作品简介，简要说明作品背景、设计思路、目标用户、技术路线、应用场景与实际价值等内容。更详细内容请于 README 文档中阐明。",
  "源代码 GitHub 仓库链接与 README 文档。",
  "演示 Demo，可提交演示视频、功能截图、在线访问链接或可运行 Demo。",
  "算力使用说明报告。如使用研究院或组委会统一提供的算力资源，则须提交该报告。",
]

const readmeItems = [
  "功能说明与使用方法：说明项目主要功能、使用流程、部署或访问方式。",
  "作品 Motivation：说明项目提出的背景、要解决的问题，以及该作品对通班同学、班级建设或学习科研效率的实际意义。",
  "核心功能实现方式：说明作品的核心功能是如何通过算法、代码和系统设计实现的，采用了哪些关键技术、模型、框架或工程方案。",
  "自主研发贡献说明：参赛队伍可以使用 AI 辅助开发，也可以调用现有 API、开源模型或开源工具，但须明确说明团队自主设计、实现、修改或整合的核心代码与系统架构部分，避免仅对现有工具进行简单包装。",
  "技术亮点说明：说明团队在原创代码、系统设计、模型训练或微调、数据清洗处理、工程部署优化、交互设计等方面，哪些部分最能体现扎实的技术能力和创新水平。",
]

const customDirections = [
  "Skill 蒸馏类：围绕特定任务或使用场景，开发、优化或蒸馏可复用的 Skill，使其能够稳定完成具体任务，并具备较好的泛化能力和可维护性。",
  "内部系统功能类：围绕通班内部网站和管理系统，开发活动报名、信息发布、作品展示、内部投票、数据统计、权限管理、通知提醒等实用功能。",
  "学习与资源辅助类：开发面向学习、科研和日常工具使用的辅助系统。例如：基于 RAG 检索的个人知识仓库、集成语音识别模型的自动笔记生成软件、智能 LaTeX 格式匹配工具、Bash 命令自动补全与纠错工具等。",
  "通班特色创新娱乐应用类：结合通班文化和班级特色，开发具有趣味性、互动性和传播性的创意应用。例如：经过微调的 AI 人格对话系统、具有通班特色的多模态创意内容生成工具等。",
  "AI 创意应用类：鼓励同学探索大模型、生成式 AI 和多模态模型的实际应用。例如：智能表情包生成、语言风格智能转换、个性化文案生成、图像与文本创意生成等。相关项目可结合模型微调、提示词工程、RAG、Agent 等技术实现。",
  "数据展示与可视化类：开发用于数据展示、过程追踪和结果分析的可视化工具。例如：模型训练过程可视化、活动数据看板、作品投票数据展示、学习进度统计工具等。",
  "现有工具优化类：对通班已有工具或系统功能进行优化、重构或扩展。可以是树洞插件、内部网站功能、现有自动化工具，也可以是其他同学认为存在缺陷、值得改进的工具。",
  "其他自选方向：其他任何具有实际价值、技术含量和创新性的方向均可申报。项目应尽量体现原创代码能力、工程实现能力、AI 应用能力和实际落地价值。",
]

const awardItems = [
  "自定义开发赛道拟设置一等奖 1 名，奖品或奖金价值约 6000 元/名；二等奖 2 名，奖品或奖金价值约 5000 元/名；三等奖 3 名，奖品或奖金价值约 3000 元/名。",
  "悬赏任务赛道原则上每个悬赏任务设置 1 个获奖名额，奖品或奖金价值约 5000 - 6000 元/项。若某一任务没有达到基本完成要求，组委会可决定该任务奖项空缺；若多个作品均表现突出，也可根据经费情况酌情增设奖励。",
  "上述方案按约 5 万元预算进行初步设计，后续可根据实际经费情况对获奖名额、奖品金额或奖品形式进行调整。",
  "奖励在各队内部由队长组织自行分配，鼓励均分；如确有分工比例上的不均，可根据实际情况具体分配。",
]

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
        {children}
      </CardContent>
    </Card>
  )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

export default function CreativeChallengeRulesPage() {
  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/intranet/creative-challenge-2026"
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回挑战赛
          </Link>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md border-blue-200 bg-blue-50 text-blue-800">
                  活动规则
                </Badge>
                <Badge variant="secondary" className="rounded-md bg-slate-100 text-slate-700">
                  2026 年暑期
                </Badge>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                智慧通班创意开发挑战赛2026
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                面向通班同学征集具有实际使用价值的编程工具、内部系统功能和创意应用。优秀作品将获得奖励，并在通过安全审查后，有机会纳入通班内部系统长期使用。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/intranet/creative-challenge-2026">
                  <Rocket className="mr-2 h-4 w-4" />
                  前往报名
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/intranet/creative-challenge-2026/projects">
                  <FileText className="mr-2 h-4 w-4" />
                  编辑材料
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <SectionCard title="活动背景" icon={<BookOpen className="h-5 w-5 text-primary" />}>
          <p>
            经过至少一年的系统学习，同学们在小型工具开发、网页功能设计和 AI 模型开发等方面的能力已有显著提升。通班目前已具备内部网站和系统基础，能够支持活动报名、作品展示、内部投票、工具发布等功能的建设与应用。
          </p>
          <p>
            为进一步提升同学们的创新能力和工程开发水平，推动通班数字化建设，激发同学们参与班级公共事务和技术实践落地的积极性，拟举办“智慧通班创意开发挑战赛”，面向通班同学征集具有实际使用价值的编程工具、内部系统功能和创意应用。优秀作品将获得奖励，并在通过安全审查后，有机会纳入通班内部系统长期使用。
          </p>
          <p>
            本活动旨在充分体现同学们的原创代码能力、创新设计能力，以及扎实过硬的编程技术和大模型训练能力，集中展示通班学子的专业素养与卓越潜力，进一步激发同学们自主学习、主动探索和实践创新的动力。
          </p>
        </SectionCard>

        <SectionCard title="活动目的" icon={<Sparkles className="h-5 w-5 text-primary" />}>
          <CheckList items={purposes} />
        </SectionCard>

        <SectionCard title="参赛人员" icon={<Users className="h-5 w-5 text-primary" />}>
          <p>
            参赛人员范围包括北大通班在读本科生、通班毕业生，以及元培学院 2026 级有意选择通班方向的新大一学生。
          </p>
          <p>
            为鼓励新大一学生尽早融入通班集体，增进彼此之间的熟悉程度，并与学长学姐建立联系，本次比赛允许新大一学生积极参与各项目，在假期中提前接触工程开发实践，学习编程工具、系统开发和 AI 应用等相关技能。
          </p>
          <p>
            每支队伍原有核心成员人数不超过 3 人；在此基础上可额外吸纳 1-2 名新大一学生参与开发，且新大一学生名额不占用原有队伍人数上限。新大一学生须加入由通班在读学生或毕业生领队的项目组，不单独组队参赛。
          </p>
          <p>
            项目组应尽可能为新生安排明确、实际的参与任务，帮助其深入参与项目开发过程，而非仅作为挂名成员。凡招收新大一学生且能够体现其实际参与贡献的项目组，可在最终评审中获得一定加分优势，具体加分标准可由组委会确定，例如最高加 5 分。
          </p>
          <p>
            所有实际参与本次比赛的新大一学生，无论其所在项目最终成绩如何，均可获得精美通班文创一份，以鼓励其积极参与通班集体建设和技术实践活动。
          </p>
          <p>
            本次比赛经历可作为学生后续发展材料的一部分。对于新大一学生，实际参与项目开发、展示个人贡献的经历，可作为后续申请通班时体现 AI 兴趣基础、实践能力和集体参与意识的参考内容之一。对于通班在读本科生，参赛及获奖经历可作为后续奖学金申请中“社会工作”或相关实践经历部分的支撑材料，用于体现其参与班级建设、服务集体事务和开展技术实践的情况。相关经历的具体认定方式以通班及研究院后续实际要求为准。
          </p>
        </SectionCard>

        <SectionCard title="活动时间线" icon={<CalendarDays className="h-5 w-5 text-primary" />}>
          <div className="grid gap-3 md:grid-cols-2">
            {challengeMilestones.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-slate-950">{item.label}</h2>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {item.date}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            8 月 23 日为材料提交截止日期。截止后，评审组将对作品材料进行初步审阅，并酌情给出修改意见。符合展示要求的作品将在通班内部网站中进行公开展示，并进入后续初步投票与答辩筛选环节。
          </div>
        </SectionCard>

        <SectionCard title="提交材料" icon={<FileText className="h-5 w-5 text-primary" />}>
          <CheckList items={submissionItems} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-950">README 文档应重点说明</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {readmeItems.map((item) => (
                <div key={item} className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="作品方向" icon={<Code2 className="h-5 w-5 text-primary" />}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <Badge variant="success" className="rounded-md">自定义开发赛道</Badge>
              <p className="mt-3">
                鼓励同学围绕通班学习生活工作中的实际需求，自主提出项目创意并完成开发。作品应具有明确的使用场景，能够服务通班同学、提升学习效率、优化学生工作流程，或丰富通班内部数字化系统功能。
              </p>
              <div className="mt-4 space-y-2">
                {customDirections.map((item) => (
                  <div key={item} className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <Badge variant="warning" className="rounded-md">悬赏任务赛道</Badge>
              <p className="mt-3">
                由组委会结合通班数字化建设需求，提前发布若干具有明确目标、应用价值和一定挑战性的开发任务。该赛道更强调任务完成度、系统稳定性、实际可用性和后续接入通班内部系统的可能性。
              </p>
              <div className="mt-4 space-y-3">
                {bountyTaskRequirements.map((item) => (
                  <div key={item.title} className="rounded-md bg-slate-50 px-3 py-2">
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p>
            两个赛道分别组织评审、分别设置奖项，暂定奖金额度分配为 1:1。参赛同学可根据项目需要进行模型训练或对专用大模型进行微调，以实现更好的应用效果；研究院将为符合条件的项目提供免费算力支持，支持同学开展模型训练、模型微调、数据处理和系统开发等工作。
          </p>
        </SectionCard>

        <SectionCard title="工作人员与评审机制" icon={<Gavel className="h-5 w-5 text-primary" />}>
          <p>
            本次比赛拟由研究院老师与志愿报名的博士生、高年级本科生共同组成裁判组，预计人数为 10-15 人。裁判组负责作品材料审核、技术评审、答辩提问、评分汇总及获奖名单建议等工作。
          </p>
          <p>
            为保证比赛公平性，裁判组成员不得以任何身份参与本次比赛报名，也不得参与与本人存在直接利益关系作品的评审工作。
          </p>
          <p>
            本次比赛评分由大众评审的公开投票分数与裁判组评审分数两部分组成，二者均按满分 100 分计。整个评分环节，无论公示投票还是交由裁判组评审，均需全程匿名以表公正。
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-950">公开投票分数</h2>
              <p className="mt-2">
                作品在通班内部网站公示后，由全体同学进行公开投票。投票结果将根据各作品获得的有效票数进行归一化折算，形成公开投票分数，满分 100 分。具体折算方式可采用 Softmax 归一化后放大至百分制，以体现票数排名和相对支持度。
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-950">裁判组评审分数</h2>
              <p className="mt-2">
                裁判组根据作品完成度、创新性、技术难度、实际应用价值、系统稳定性、原创贡献、展示效果等维度进行综合评分，满分 100 分。裁判组可结合材料审核、代码仓库、演示 Demo 和线上答辩情况酌情给分。
              </p>
            </div>
          </div>
          <p>
            最终成绩可由公开投票分数与裁判组评审分数按一定比例综合计算，具体权重由组委会根据实际情况确定，并在评审前统一公布。
          </p>
        </SectionCard>

        <SectionCard title="经费与奖项设置" icon={<Award className="h-5 w-5 text-primary" />}>
          <CheckList items={awardItems} />
          <p>
            除等级奖外，可为完成有效作品提交的参赛队伍设置参与奖。
          </p>
        </SectionCard>

        <SectionCard title="报销与证书" icon={<Gift className="h-5 w-5 text-primary" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-950">项目开发费用报销</h2>
              <p className="mt-2">
                若开发过程中需使用算力，由组委会统一安排提供，具体流程后发。申请报销的队伍需提前说明资源用途、预计金额和与项目开发的对应关系，并在作品提交时提供相关使用说明及费用凭证。报销范围和上限由组委会结合预算统一确定。
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-950">获奖证书制作</h2>
              <p className="mt-2">
                本次比赛将为获奖队伍制作获奖证书。证书内容包括比赛名称、获奖赛道、获奖等级、作品名称、团队成员姓名及颁发单位等信息，用于表彰同学在创新开发和工程实践中的优秀表现。
              </p>
            </div>
          </div>
        </SectionCard>
      </main>
    </div>
  )
}
