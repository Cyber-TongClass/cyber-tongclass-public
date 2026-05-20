"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Mail, 
  MapPin, 
  ExternalLink,
  ArrowRight,
  Clock,
  Award,
  Group
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AboutPage() {
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
            了解北京大学与清华大学联合培养人工智能创新人才项目的更多信息。
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <Tabs defaultValue="introduction" className="w-full">
          <TabsList className="flex w-full border-b border-slate-200 bg-transparent h-auto p-0">
            <TabsTrigger value="introduction" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">项目介绍</TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">官方账号</TabsTrigger>
            <TabsTrigger value="campus" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">校园生活</TabsTrigger>
            <TabsTrigger value="council" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">学生组织</TabsTrigger>
            <TabsTrigger value="merchandise" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">周边</TabsTrigger>
            <TabsTrigger value="contact" className="flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-slate-500 hover:text-slate-900 rounded-none bg-transparent font-medium text-sm transition-colors text-center">联系</TabsTrigger>
          </TabsList>

          {/* Introduction */}
          <TabsContent value="introduction" className="mt-8">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-8">项目介绍</h2>

              {/* Overview */}
              <h3 className="text-2xl font-extrabold text-slate-900 mb-4">关于我们</h3>
              <div className="space-y-3 text-slate-600 leading-loose text-base mb-12">
                <p>
                   北京大学与清华大学联合培养人工智能创新人才项目——通用人工智能实验班（以下简称&ldquo;通班&rdquo;）于2021年启动，旨在培养具有国际视野、创新能力的人工智能领域领军人才。
                </p>
                <p>
                  项目汇聚两校优质教学资源，由顶尖学者指导，学生可在北大和清华两所顶尖学府完成学业，享受丰富的学术资源和实践机会。
                </p>
              </div>
            </div>

            {/* Statistics — Full-bleed */}
            <div className="w-screen relative left-1/2 -translate-x-1/2 bg-[hsl(20,20%,85%)] py-14 mb-12">
              <div className="max-w-4xl mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div className="space-y-2">
                    <div className="text-4xl md:text-5xl font-extrabold text-slate-800">300+</div>
                    <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">北清成员</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl md:text-5xl font-extrabold text-slate-800">40+</div>
                    <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">顶会论文</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl md:text-5xl font-extrabold text-slate-800">70+</div>
                    <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">科研课题</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl md:text-5xl font-extrabold text-slate-800">80+</div>
                    <div className="text-[hsl(15,15%,50%)] text-sm font-medium uppercase tracking-wider">奖项荣誉</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-4xl">
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
                    <h3 className="text-left text-xl font-extrabold text-slate-900 mb-3">六大核心领域</h3>
                    <p className="text-left text-slate-600 leading-relaxed text-sm">
                      课程涵盖计算机视觉、自然语言处理、认知推理、机器学习、机器人学、多智能体，全方向覆盖。
                    </p>
                  </div>
                  <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="text-left text-xl font-extrabold text-slate-900 mb-3">前沿科研实践</h3>
                    <p className="text-left text-slate-600 leading-relaxed text-sm">
                      深度参与 70+ 前沿课题，发表 40+ 顶会论文，斩获 80+ 奖项荣誉，成果应用于真实产业场景。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Official Accounts */}
          <TabsContent value="accounts" className="mt-8">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">官方账号</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">微信公众号</h3>
                  <p className="text-slate-500 text-sm mb-2">关注获取最新动态、通知公告和活动信息</p>
                  <p className="text-sm font-medium text-slate-900">公众号：PKU通班</p>
                </div>
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">小红书</h3>
                  <p className="text-slate-500 text-sm mb-2">关注获取最新动态、活动照片和日常分享</p>
                  <p className="text-sm font-medium text-slate-900">PKU通班 · ID: pkutongclass</p>
                </div>
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">微信视频号</h3>
                  <p className="text-slate-500 text-sm mb-2">观看通班精彩影音内容</p>
                  <p className="text-sm font-medium text-slate-900">视频号：PKU通班</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Campus Life */}
          <TabsContent value="campus" className="mt-8">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">校园生活</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-4">北大校区</h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>燕园校区：北京大学校本部，北大通班隶属元培学院，配备现代化教学楼和实验室</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>学习时间：周一至周五课程，周末可预约实验室</span>
                    </li>
                  </ul>
                </div>
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-3">清华校区</h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>清华大学校内，由自动化系负责教学安排</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>课程安排：与北大通班联合教学，定期交流访问</span>
                    </li>
                  </ul>
                </div>
                <div className="group bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-300 md:col-span-2">
                  <h3 className="text-lg font-extrabold text-slate-900 mb-4">学生活动</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[hsl(211,40%,97%)]">
                      <h4 className="font-extrabold text-slate-900 mb-1">学术沙龙</h4>
                      <p className="text-sm text-slate-500">不定期举办 Tong Zhi Talk，分享最新研究成果</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[hsl(211,40%,97%)]">
                      <h4 className="font-extrabold text-slate-900 mb-1">体育活动</h4>
                      <p className="text-sm text-slate-500">一年一度的AI杯羽毛球赛</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[hsl(211,40%,97%)]">
                      <h4 className="font-extrabold text-slate-900 mb-1">团建活动</h4>
                      <p className="text-sm text-slate-500">春秋季出游、节日聚会</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Student Council */}
          <TabsContent value="council" className="mt-8">
            <div className="max-w-4xl">
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

              <h3 className="text-lg font-extrabold text-slate-900 mb-3 mt-10">清华通班</h3>
              <p className="text-sm text-slate-500">暂无详细组织信息。</p>
            </div>
          </TabsContent>

          {/* Merchandise */}
          <TabsContent value="merchandise" className="mt-8">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">周边产品</h2>
              <p className="text-slate-500 mb-8">
                通班文创持续更新中，由宣传部设计制作，已陆续推出多种周边产品。如有好的建议，欢迎联系我们。
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { name: "文化衫", src: "/wenchuang/IMG_1255.JPG" },
                  { name: "帆布袋", src: "/wenchuang/IMG_1257.JPG" },
                  { name: "马克杯", src: "/wenchuang/IMG_1258.JPG" },
                  { name: "棒球帽", src: "/wenchuang/IMG_1075.JPG" },
                  { name: "卡套", src: "/wenchuang/IMG_1077.JPG" },
                  { name: "徽章", src: "/wenchuang/IMG_0048.JPG" },
                ].map((item) => (
                  <div key={item.name} className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                    <div className="aspect-square bg-slate-100 relative">
                      <Image
                        src={item.src}
                        alt={item.name}
                        fill
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
            <div className="max-w-4xl">
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
                        <p className="text-sm text-slate-500">待补充</p>
                      </div>
                    </li>
<li className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[hsl(211,50%,93%)] text-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">地址</p>
                        <p className="text-sm text-slate-500">
                          北京大学燕园校区<br />
                          清华大学校内
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
