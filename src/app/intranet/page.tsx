"use client"

import { CalendarDays, FileText, Link as LinkIcon, MessageSquare } from "lucide-react"
import { IntranetSectionCard } from "@/components/intranet/intranet-section-card"

const intranetSections = [
  {
    title: "通班树洞",
    description: "面向通班成员的内部讨论区。可以实名或匿名发帖、回复，交流学习生活中的想法、困惑......",
    icon: MessageSquare,
    href: "/intranet/treehole",
  },
  {
    title: "意见反馈",
    description: "用于收集同学们对通班学习、科研、课程、活动、组织运行等方面的建议，管理员会定期收集整理并向院办/管委会汇报。",
    icon: FileText,
    href: "/intranet/feedback",
  },
  {
    title: "通班工作 WPS",
    description: "想参与通班自治委员会工作的同学，可在这里申请加入通班 WPS workspace，获得历年学生工作材料资源。",
    icon: LinkIcon,
    href: "/intranet/wps",
  },
  {
    title: "TechDay 科技节平台",
    description: "科技节成果展示、投稿管理、评奖、报销和外部作者/志愿者注册入口。内部成员可直接使用通班账号进入。",
    icon: CalendarDays,
    href: "/techday",
  },
]

export default function IntranetPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">INTRANET</div>
          <div className="mb-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">内部网站</h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative">
            这是一个仅面向通班成员的内部网站，包含内部论坛、意见反馈、内部工具和协作入口等内容。请不要将此网页的内部资源分享到公开渠道哦～
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {intranetSections.map((section) => (
              <IntranetSectionCard
                key={section.title}
                href={section.href}
                title={section.title}
                description={section.description}
                icon={section.icon}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
