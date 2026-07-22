"use client"

import Image from "next/image"
import { useState } from "react"
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Mail, 
  MapPin, 
  ExternalLink,
  Award,
  Group,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const thuDepartments = [
  {
    title: "通班文化建设委员会",
    desc: "班级文化建设与集体认同凝聚的重要力量，负责组织通班同学开展文体活动、学术交流与班级文化产品设计，营造积极向上、团结协作的班级氛围。",
    items: [
      "组织新生班会、破冰活动与班委选拔",
      "策划春游、体育联谊赛、清北通班联合团建等活动",
      "设计班级 LOGO、班服、鼠标垫等文创产品",
      "组织师生餐叙交流，促进师生深入沟通",
      "打造具有清华通班特色的文化品牌与集体记忆",
    ],
  },
  {
    title: "通班信息网络技术委员会",
    desc: "班级数字平台与科研技术支持的核心部门，负责官方网站、公众号、服务器与学生账号等信息化资源的维护管理，为同学们的科研学习和信息交流提供稳定可靠的技术保障。",
    items: [
      "维护和更新清华通班官方网站与公众号",
      "管理清华通班服务器及学生账号",
      "支撑同学们科研学习中的算力与信息化需求",
      "建设班级数字平台，服务学术发展与日常交流",
      "保障班级信息发布与技术资源运行稳定",
    ],
  },
  {
    title: "通班顾问委员会",
    desc: "由高年级同学和优秀毕业生组成的经验支持力量，为班级建设、学业发展、科研实践与活动组织提供建议和传承支持。",
    items: [
      "为班级组织建设提供经验传承",
      "为低年级同学提供学业、科研与发展建议",
      "支持小班主任制度与新生培养工作",
      "协助推动清华通班自治体系持续完善",
    ],
  },
]

const thuResearchCards = [
  {
    title: "清华通班学术发展与科研实践",
    desc: "学术氛围建设与科研能力培养的重要平台，依托清华大学与北京市通用人工智能研究院资源，组织讲座、培训、参观、暑期科研实践等活动，帮助同学们拓宽视野、启迪科研、深入课题。",
    items: [
      "组织 TongTalk 学术讲座，分享 PyTorch、Linux、服务器使用与机器学习前沿等内容",
      "参与通用人工智能研究院科研素养系列培训",
      "组织新生参观通用人工智能研究院展厅及机器人实验室",
      "开展暑期科研实践，参与多领域课题研究",
      "推动优秀项目继续孵化，已有成果转化为论文在投",
      "介绍实践基地重点课题与导师研究方向，衔接本研贯通培养",
    ],
  },
  {
    title: "通班科研成果",
    desc: "在教学资源、实践平台与科研训练的共同支撑下，清华通班学生在国际学术舞台上崭露头角，展现出扎实的科研能力与创新潜力。",
    items: [
      "清华通班学生已在国际顶级会议与期刊发表论文 50 余篇",
      "另有 10 余篇论文在审稿中",
      "多位同学在因材施教计划年会中获得“优秀成果奖”与“最佳成果奖”",
      "首届清华通班毕业成果展集中展示学生科研成果",
      "多位同学持续参与通用人工智能相关前沿课题研究",
    ],
  },
  {
    title: "通班小班主任制度",
    desc: "由高年级优秀学长担任小班主任，为低年级同学提供学业引导、科研启蒙与活动支持，帮助新同学更快融入清华通班集体。",
    items: [
      "设立“小班主任”岗位，传承高年级经验",
      "为低年级同学提供学业与生活支持",
      "协助开展新生班会、破冰活动与班级建设",
      "2023 级清华通班小班主任为刘宇学长",
      "2024 级清华通班小班主任为曹智昊学长",
    ],
  },
]

export default function AboutPage() {
  const [isThuResearchOpen, setIsThuResearchOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">
            ABOUT US
          </div>
          <div className="mb-4 relative">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
              关于通班
            </h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative">
            了解北京大学与清华大学通用人工智能实验班的更多信息。
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <Tabs defaultValue="introduction" className="w-full">
          <TabsList className="flex w-full border-b border-slate-200 bg-transparent h-auto p-0">
            <TabsTrigger value="introduction" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">项目介绍</TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">官方账号</TabsTrigger>
            <TabsTrigger value="council" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">学生组织</TabsTrigger>
            <TabsTrigger value="merchandise" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">周边文创</TabsTrigger>
            <TabsTrigger value="contact" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">联系方式</TabsTrigger>
            <TabsTrigger value="changelog" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">更新日志</TabsTrigger>
            <TabsTrigger value="credits" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">致谢</TabsTrigger>
          </TabsList>

          {/* Introduction */}
          <TabsContent value="introduction" className="mt-8">
            <div className="w-full">
              {/* Overview */}
              <h3 className="text-2xl font-extrabold text-slate-900 mb-4">关于我们</h3>
              <div className="space-y-3 text-slate-600 leading-loose text-base mb-12">
                <p>
                  通用人工智能实验班（简称&ldquo;通班&rdquo;）是北京大学与清华大学于2021年联合启动的人工智能创新人才培养项目，分别设立于北大元培学院与清华自动化系，旨在回应国家人工智能战略需求，锻造通用人工智能领域的&ldquo;科技王牌军&rdquo;。
                </p>
                <p>
                  通班秉持&ldquo;通识、通智、通用&rdquo;的培养理念，旨在锻造兼具人文底蕴与科学精神、能够引领行业变革的世界顶尖复合型领军人才。依托两校顶尖学科资源与科研平台，通班构建了本博贯通、学研产用融合的培养体系，为国家人工智能战略需求提供坚实的人才支撑。
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-[hsl(20,20%,85%)] py-14 mb-12 shadow-[0_0_0_100vmax_hsl(20,20%,85%)] [clip-path:inset(0_-100vmax)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-extrabold text-slate-800">359</div>
                  <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">北清成员</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-extrabold text-slate-800">104</div>
                  <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">顶会论文</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-extrabold text-slate-800">130</div>
                  <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">科研课题</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-extrabold text-slate-800">169</div>
                  <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">奖项荣誉</div>
                </div>
              </div>
            </div>

            <div className="w-full">
              {/* Features */}
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-6">项目特色</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <h3 className="text-left text-xl font-extrabold text-slate-900 mb-3">通识·通智·通用</h3>
                    <p className="text-left text-slate-600 leading-relaxed text-sm">
                      交叉人文社科的「通识」、融会六大核心领域的「通智」、融入各行各业的「通用」，培养世界顶尖复合型人才。
                    </p>
                  </div>
                  <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-left text-xl font-extrabold text-slate-900 mb-3">前沿课程体系</h3>
                    <p className="text-left text-slate-600 leading-relaxed text-sm">
                      打破了传统学科边界，为本科生量身定制了与世界前沿接轨的专属培养方案，覆盖了具身智能、机器学习、通用视觉、自然语言、认知推理和多智能体等六大AI核心领域，同时注重AI与其他学科的交叉融合。
                    </p>
                  </div>
                  <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="text-left text-xl font-extrabold text-slate-900 mb-3">顶尖科研实践</h3>
                    <p className="text-left text-slate-600 leading-relaxed text-sm">
                      构建从人工智能初级研讨班、人工智能引论、人工智能系统实践到毕业设计的完整科研训练路径，聚焦 AI 领域，着力培养创新型、复合型通才。
                    </p>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-6">
                  <div className="w-full md:w-[calc(33.333%-1rem)] group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-left text-xl font-extrabold text-slate-900 mb-3">立体化的学术交流网络</h3>
                    <p className="text-left text-slate-600 leading-relaxed text-sm">
                      与MIT、CMU、Harvard、UCLA等世界顶尖学府保持紧密交流，定期举办国际学术论坛，并有学生自主创办的&ldquo;Tong Talk&rdquo;学术沙龙和以学生为主体参展的学术交流活动&ldquo;AI TechDay&rdquo;。
                    </p>
                  </div>
                  <div className="w-full md:w-[calc(33.333%-1rem)] group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Group className="w-6 h-6" />
                    </div>
                    <h3 className="text-left text-xl font-extrabold text-slate-900 mb-3">顶尖的师资力量</h3>
                    <p className="text-left text-slate-600 leading-relaxed text-sm">
                      融合北大、清华人工智能领域的顶尖教研力量，汇聚 IEEE Fellow、长江学者等高水平师资，依托两校深厚的学科积淀，打造国内一流的 AI 人才培养平台。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Official Accounts */}
          <TabsContent value="accounts" className="mt-8">
            <div className="w-full">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">官方账号</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">微信公众号</h3>
                  <p className="text-slate-500 text-sm mb-2">关注获取最新动态、通知公告和活动信息</p>
                  <p className="text-sm font-medium text-slate-900">公众号：PKU通班 / THU通班</p>
                </div>
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">微信视频号</h3>
                  <p className="text-slate-500 text-sm mb-2">观看通班精彩影音内容</p>
                  <p className="text-sm font-medium text-slate-900">视频号：PKU通班</p>
                </div>
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">小红书</h3>
                  <p className="text-slate-500 text-sm mb-2">关注获取最新动态、活动照片和日常分享</p>
                  <p className="text-sm font-medium text-slate-900">PKU通班 · ID: pkutongclass</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                {[
                  {
                    name: "通小喵表情包第1弹",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/%E8%A1%A8%E6%83%85%E5%8C%851.jpg",
                  },
                  {
                    name: "通小喵表情包第2弹",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/%E8%A1%A8%E6%83%85%E5%8C%852.png",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden  w-[88%] mx-auto"
                  >
                    <div className="aspect-square bg-slate-100 relative">
                      <Image
                        src={item.src}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="px-4 py-3 text-center">
                      <h4 className="font-extrabold text-slate-900">{item.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Student Council */}
          <TabsContent value="council" className="mt-8">
            <div className="w-full">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">学生组织</h2>
              <p className="text-slate-600 mb-8">
                北大和清华通班分别形成了学生自发组织的服务团体，致力于完善班级建设、宣传班级形象、促进学术交流、丰富同学们的学习生活。
              </p>

              <h3 className="text-lg font-extrabold text-slate-900 mb-5">北大通班</h3>
              <div className="grid md:grid-cols-[1fr_2fr] gap-5">
                {/* 自治委员会 — 大卡片 */}
                <div className="bg-white p-6 shadow-sm relative border-l-[4px] border-[hsl(350,55%,40%)]">
                  <h4 className="text-base font-extrabold text-[hsl(350,55%,40%)] mb-3">通班自治委员会</h4>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    班级的核心统筹与执行机构，负责贯彻落实校、院政策与决议，协调和规划重要班级事务，领导并监督各职能部门的工作，保障班级运行的高效与有序。
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>与校、院级领导和老师沟通协调，承接并推动班级相关决议和工作的落实</li>
                    <li>统筹规划重要班级事务，组织班级阶段重点工作的推进</li>
                    <li>领导并监督各职能部门，明确任务分工，跟进工作进展</li>
                    <li>发扬民主精神，定期组织完善班级组织架构和章程</li>
                    <li>代表通班学生对外发声，展现通班形象</li>
                  </ul>
                </div>

                {/* 其余5个部门 — 2列网格 */}
                <div className="grid grid-cols-2 gap-5">
                  {[
                    {
                      title: "通班组织部",
                      desc: "负责班级对内组织、筹办活动的部门，是维系通班组织架构和班级凝聚力的中坚力量。",
                      items: ["统筹组织各种丰富多彩的班级团建活动", "定期更新完善班级组织架构和章程", "参与组织AI院各项大型活动", "联络兄弟友好班级共同组织活动", "统筹组织新年晚会"],
                    },
                    {
                      title: "通班宣传部",
                      desc: "班级对外展示的窗口与文化输出的桥梁，负责新媒体运营、宣传内容设计与制作。",
                      items: ["运营公众号\"PKU通班\"及视频号", "设计吉祥物\"通小喵\"及文创产品", "导演拍摄宣传片、MV、微电影", "制作招生宣传册、《通班生存指南》"],
                    },
                    {
                      title: "通班学术部",
                      desc: "学术氛围建设与科研助力的加油站，是通班丰富学术资源的集中体现。",
                      items: ["组织Tong Zhi Talk邀请全球研究者分享", "组织数学讨论与论文导读", "采访优秀学长学姐分享经验", "维护通班官网及课程测评平台"],
                    },
                    {
                      title: "通班体育部",
                      desc: "\"完全人格，首在体育。\"负责班级体育活动组织，保障身心健康。",
                      items: ["组织班级和AI院体育赛事", "参与组织登山、趣味运动会", "组织校运动会入场式方阵"],
                    },
                    {
                      title: "通班顾问委员会",
                      desc: "由高年级同学组成的智囊团，为班级建设提供经验传承与事务建议。",
                      items: [],
                    },
                  ].map((dept) => (
                    <div key={dept.title} className="group bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300 relative">
                      <div className="absolute top-0 left-0 w-8 h-1 bg-[hsl(350,55%,40%)]"></div>
                      <h4 className="text-sm font-extrabold text-slate-900 mb-2 mt-1">{dept.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{dept.desc}</p>
                      {dept.items.length > 0 && (
                        <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc pl-3.5 leading-relaxed">
                          {dept.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 mb-5 mt-10">清华通班</h3>
              <div className="grid md:grid-cols-[1fr_2fr] gap-5">
                <div className="bg-white p-6 shadow-sm relative border-l-[4px] border-[hsl(350,55%,40%)]">
                  <h4 className="text-base font-extrabold text-[hsl(350,55%,40%)] mb-3">通班自治委员会</h4>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    清华通班学生组织的统筹与执行机构，负责班级文化建设、技术支持、学术交流与学生活动的组织协调，保障班级运行高效有序，形成自主、成熟、富有特色的学生自治体系。
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>统筹班级年度活动规划，定期召开委员会议与班委会议</li>
                    <li>协调文化建设委员会与信息网络技术委员会开展工作</li>
                    <li>推动新生融入、师生交流、科研实践与班级团建等重点事务</li>
                    <li>传承高年级经验，完善“小班主任”支持机制</li>
                    <li>凝聚班级认同，展示清华通班学生风貌</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {thuDepartments.map((dept) => (
                    <div key={dept.title} className="group bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300 relative">
                      <div className="absolute top-0 left-0 w-8 h-1 bg-[hsl(350,55%,40%)]"></div>
                      <h4 className="text-sm font-extrabold text-slate-900 mb-2 mt-1">{dept.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{dept.desc}</p>
                      <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc pl-3.5 leading-relaxed">
                        {dept.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setIsThuResearchOpen((isOpen) => !isOpen)}
                  aria-expanded={isThuResearchOpen}
                  aria-controls="thu-research-details"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isThuResearchOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  清华通班学术发展与科研实践
                </button>

                {isThuResearchOpen && (
                  <div id="thu-research-details" className="grid md:grid-cols-3 gap-5 mt-4">
                    {thuResearchCards.map((card) => (
                      <div key={card.title} className="group bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300 relative">
                        <div className="absolute top-0 left-0 w-8 h-1 bg-[hsl(350,55%,40%)]"></div>
                        <h4 className="text-sm font-extrabold text-slate-900 mb-2 mt-1">{card.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mb-2">{card.desc}</p>
                        <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc pl-3.5 leading-relaxed">
                          {card.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Merchandise */}
          <TabsContent value="merchandise" className="mt-8">
            <div className="w-full">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">周边产品</h2>
              <p className="text-slate-500 mb-8">
                通班文创持续更新中，由宣传部设计制作，已陆续推出多种周边产品。如有好的建议，欢迎联系我们。
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 第一张大图：全屏时占前两列、前两行 */}
                <div className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden sm:col-span-2 sm:row-span-2">
                  <div className="aspect-square bg-slate-100 relative">
                    <Image
                      src="https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_0803.JPG"
                      alt="通班文创"
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, 66vw"
                    />
                  </div>
                  <div className="px-4 py-3 text-center">
                    <h4 className="font-extrabold text-slate-900">徽章</h4>
                  </div>
                </div>

                {/* 第一行第三列、第二行第三列 */}
                {[
                  {
                    name: "班服熊",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/%E7%8F%AD%E6%9C%8D%E5%B0%8F%E7%86%8A.pic.jpg",
                  },
                  {
                    name: "日历",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/%E6%97%A5%E5%8E%86.JPG",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                  >
                    <div className="aspect-square bg-slate-100 relative">
                      <Image
                        src={item.src}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                    <div className="px-4 py-3 text-center">
                      <h4 className="font-extrabold text-slate-900">{item.name}</h4>
                    </div>
                  </div>
                ))}

                {/* 接下来两行：小图，一行三列 */}
                {[
                  {
                    name: "卡套",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_7735.PNG",
                  },
                  {
                    name: "卡套",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_7734.PNG",
                  },
                  {
                    name: "笔记本",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/RMYFE3938.JPG",
                  },
                  {
                    name: "布袋",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_1075.JPG",
                  },
                  {
                    name: "棒球帽",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_0051.JPG",
                  },
                  {
                    name: "鼠标垫",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_0041.JPG",
                  },
                ].map((item, index) => (
                  <div
                    key={`${item.src}-${index}`}
                    className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                  >
                    <div className="aspect-square bg-slate-100 relative">
                      <Image
                        src={item.src}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                    <div className="px-4 py-3 text-center">
                      <h4 className="font-extrabold text-slate-900">{item.name}</h4>
                    </div>
                  </div>
                ))}

                {/* 横跨三列的大图：不显示标题 */}
                <div className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden lg:col-span-3">
                  <div className="aspect-[1.6/1] bg-slate-100 relative">
                    <Image
                      src="https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_1257.JPG"
                      alt="通班文创展示图"
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="100vw"
                    />
                  </div>
                </div>

                {/* 后面的图：继续小图，一行三个 */}
                {[
                  {
                    name: "钥匙链",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/MKQLE2438.JPG",
                  },
                  {
                    name: "透卡",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_7598.JPG",
                  },
                  {
                    name: "书签",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_7753.jpg",
                  },
                  {
                    name: "日历",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/IMG_E7752.JPG",
                  },
                  {
                    name: "徽章",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/FQTP5338.JPG",
                  },
                  {
                    name: "衬衫",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/BJYH6766.JPG",
                  },
                  {
                    name: "文化衫",
                    src: "https://raw.githubusercontent.com/Cyber-TongClass/merch-images/main/GZMH0661.JPG",
                  },
                ].map((item, index) => (
                  <div
                    key={`${item.src}-${index}`}
                    className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                  >
                    <div className="aspect-square bg-slate-100 relative">
                      <Image
                        src={item.src}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                    <div className="px-4 py-3 text-center">
                      <h4 className="font-extrabold text-slate-900">{item.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact" className="mt-8">
            <div className="w-full">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">联系我们</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-lg font-extrabold text-slate-900 mb-4">联系信息</h3>
                  <ul className="space-y-5">
<li className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
<p className="font-medium text-slate-900">邮箱</p>
                        <p className="text-sm text-slate-500">pkuypzhb@163.com</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">地址</p>
                        <p className="text-sm text-slate-500">
                          北京大学俄文楼 100871<br />
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-lg font-extrabold text-slate-900 mb-4">快速链接</h3>
                  <ul className="space-y-3">
                    <li>
                      <a href="https://www.ai.pku.edu.cn/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm">
                        <ExternalLink className="h-4 w-4" />
                        北京大学人工智能研究院
                      </a>
                    </li>
                    <li>
                      <a href="https://yuanpei.pku.edu.cn/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm">
                        <ExternalLink className="h-4 w-4" />
                        北京大学元培学院
                      </a>
                    </li>
                    <li>
                      <a href="https://www.pku.edu.cn/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm">
                        <ExternalLink className="h-4 w-4" />
                        北京大学
                      </a>
                    </li>
                    <li>
                      <a href="https://www.tsinghua.edu.cn/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm">
                        <ExternalLink className="h-4 w-4" />
                        清华大学
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Changelog */}
          <TabsContent value="changelog" className="mt-8">
            <div className="w-full">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">更新日志</h2>
                <div className="space-y-4">
                    {[
                      { date: "2026-06", text: "内网新增「资料下载」板块，提供学术交流、学生活动报销等内部文件下载" },
                      { date: "2026-05", text: "前端视觉全面升级：深蓝 Hero、酒红与靛蓝配色、直角卡片、年份水印、册别分组与半遮挡数字等" },
                      { date: "2026-05", text: "成果页面重构：移除 Latest/Archive 切换，改为按年份侧栏展示；论文详情页去胶囊化" },
                      { date: "2026-05", text: "课程测评卡片紧凑化，新增评分色块（绿/黄/红/灰），支持升序排序" },
                      { date: "2026-05", text: "成员页按届别分组，大水印年份数字 + 横线分隔" },
                      { date: "2026-05", text: "活动列表仅显示近期活动，日历保留全部" },
                      { date: "2026-05", text: "树洞默认匿名；密码字段改为暗码" },
                      { date: "2026-05", text: "新增自学资源链接页、文创周边展示页" },
                    ].map((entry) => (
                  <div key={entry.text} className="flex gap-4">
                    <span className="text-xs font-bold text-slate-400 w-16 shrink-0 mt-0.5">{entry.date}</span>
                    <p className="text-sm text-slate-600">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Credits */}
          <TabsContent value="credits" className="mt-8">
            <div className="w-full">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">致谢</h2>
              <p className="text-slate-600 mb-8">
                本网站由通班学术部开发与维护。感谢每一位参与者和贡献者的努力与奉献！（致谢名单按姓名字母顺序排列）
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-3">核心开发者</h3>
                  <div className="flex flex-wrap gap-2">
                    {["陈应涵", "田希尧", "严绍恒", "曾姜月", "张峻硕"].map((name) => (
                      <span key={name} className="px-3 py-1 text-sm font-medium bg-primary text-white">{name}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-3">开发者</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-sm font-medium bg-primary text-white">通班学术部</span>
                    {["蔡博丞", "陈勇整", "崔续衡", "代易瓒", "郭柯言", "刘昌宁", "魏欣元", "杨恩华", "杨天琢", "赵思齐"].map((name) => (
                      <span key={name} className="px-3 py-1 text-sm font-medium bg-[hsl(211,50%,93%)] text-primary">{name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Back to old version */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <p className="text-slate-500 mb-4">想要查看旧版网站？</p>
          <a href="https://nostalgic.tongclass.ac.cn/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              访问旧版网站
            </Button>
          </a>
        </div>
      </section>
    </div>
  )
}
