"use client"

import Link from "next/link"

import { AiaIndexRow } from "@/components/institute/editorial/index-row"
import { AiaKicker } from "@/components/institute/editorial/kicker"
import { AiaRule } from "@/components/institute/editorial/rule"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"
import { useMyPublicProfileDestination } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { withReturnTo } from "@/lib/safe-local-path"

type PortalModule = {
  href: string
  title: string
  description: string
  meta?: string
}

function PortalModuleList({ modules, startIndex }: { modules: PortalModule[]; startIndex: number }) {
  return (
    <ul className="border-t aia-border-rule">
      {modules.map((module, moduleIndex) => (
        <AiaIndexRow
          key={module.href}
          index={String(startIndex + moduleIndex + 1).padStart(2, "0")}
          href={module.href}
          title={module.title}
          description={module.description}
          meta={module.meta}
        />
      ))}
    </ul>
  )
}

export function PortalClient() {
  const { currentUser, isAdmin, isLoading, isAuthenticated } = useAuth()
  const profileDestination = useMyPublicProfileDestination()

  const loginHref = "/login?next=%2Fportal%2Flist"

  if (isLoading) {
    return (
      <div className="container-custom py-20">
        <AiaKicker>内网 · Intranet</AiaKicker>
        <h1 className="aia-serif mt-5 text-4xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
          内网
        </h1>
        <AiaRule className="mt-8 w-24" />
        <p className="aia-text-muted mt-6 text-sm leading-7">正在确认登录状态…</p>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="container-custom py-20">
        <AiaKicker>内网 · Intranet</AiaKicker>
        <h1 className="aia-serif mt-5 max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
          内网
        </h1>
        <AiaRule className="mt-8 w-24" />
        <p className="aia-text-muted mt-6 max-w-2xl text-base leading-8">
          内网在同一研究院外壳下，按你的账户身份呈现通知、Coffee Talk、通班与管理模块。请先登录以继续。
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            href={loginHref}
            className="aia-focus border aia-border-rule px-4 py-2.5 text-sm font-medium tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
          >
            登录并进入内网
          </Link>
          <Link href="/" className="aia-link aia-focus text-sm">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const displayName = currentUser.chineseName || currentUser.englishName || currentUser.username

  const isTeacher = currentUser.identityType === "teacher"
  const isGraduate = currentUser.identityType === "graduate"
  const isClassMember = currentUser.isClassMember === true
  const isCoffeeTalkApplicant = currentUser.isEmailVerified === true && (
    currentUser.identityType === "undergrad" || currentUser.identityType === "graduate"
  )
  const portalReturnTo = "/portal/list"

  const identityTags = [
    isClassMember ? "通班成员" : null,
    isTeacher ? "教师" : null,
    currentUser.role === "super_admin" ? "超级管理员" : currentUser.role === "admin" ? "管理员" : null,
  ].filter((tag): tag is string => tag !== null)

  const applicantCoffeeTalkModules: PortalModule[] = [
    {
      href: withReturnTo("/services/coffee-talk/my", portalReturnTo),
      title: "我的 Coffee Talk 申请",
      description: "查看已提交申请的状态与补充材料要求。",
    },
    {
      href: withReturnTo("/services/coffee-talk/apply", portalReturnTo),
      title: "申请 Coffee Talk",
      description: "向开放交流的教师提交新的研究交流申请。",
    },
  ]

  const commonModules: PortalModule[] = [
    {
      href: "/services/coffee-talk",
      title: "Coffee Talk",
      description: "申请教师交流并查看相关办理进度。",
    },
    ...(isCoffeeTalkApplicant ? applicantCoffeeTalkModules : []),
    {
      href: withReturnTo("/services/oa", portalReturnTo),
      title: "OA 与审批",
      description: "办理研究院表单、材料提交与审批事项。",
    },
    ...(isGraduate
      ? [{
          href: "/tong-class/intranet",
          title: "人工智能研究院研究生内网",
          description: "查看研究生成员、活动与专属内网工具。",
        }]
      : []),
    {
      href: "/my-publications",
      title: "个人学术",
      description: "维护你的公开学术成果与研究方向。",
    },
    ...(profileDestination
      ? [{
          href: withReturnTo(profileDestination.href, portalReturnTo),
          title: profileDestination.label,
          description: "查看你在平台中已公开且经过验证的个人页面。",
        }]
      : []),
    {
      href: "/settings",
      title: "账户设置",
      description: "管理账户资料、安全与偏好设置。",
    },
  ]

  const classModules: PortalModule[] = [
    {
      href: "/tong-class/intranet",
      title: "通班内网",
      description: "表单、报销、资料与树洞等班级内部事务。",
    },
    {
      href: "/tong-class/courses",
      title: "通班课程",
      description: "课程信息、讲义与课程评价。",
    },
    {
      href: "/tong-class/events",
      title: "通班活动",
      description: "班级活动安排与记录。",
    },
  ]

  const teacherModules: PortalModule[] = [
    {
      href: "/groups/manage",
      title: "课题组管理",
      description: "从学生账号中维护本课题组成员，用于内部筛选与审批范围。",
    },
  ]

  const adminModules: PortalModule[] = [
    {
      href: "/admin",
      title: "管理后台",
      description: "内容、账户与研究院目录的管理入口。",
    },
  ]

  const sections: { kicker: string; title: string; modules: PortalModule[] }[] = [
    { kicker: "通用", title: "与你相关", modules: commonModules },
    ...(isClassMember ? [{ kicker: "通班", title: "班级事务", modules: classModules }] : []),
    ...(isTeacher ? [{ kicker: "教师", title: "教学服务", modules: teacherModules }] : []),
    ...(isAdmin ? [{ kicker: "管理", title: "平台管理", modules: adminModules }] : []),
  ]

  let moduleOffset = 0

  return (
    <div className="container-custom py-16 sm:py-20">
      <AiaKicker>内网 · Intranet</AiaKicker>
      <h1 className="aia-serif mt-5 max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
        你好，{displayName}
      </h1>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {identityTags.length > 0 ? (
          identityTags.map((tag) => (
            <span
              key={tag}
              className="aia-mono aia-bg-tag px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="aia-mono aia-bg-tag px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[hsl(var(--aia-ink))]">
            研究院用户
          </span>
        )}
      </div>
      <AiaRule className="mt-8" />

      <div className="mt-12 flex flex-col gap-14">
        {sections.map((section) => {
          const startIndex = moduleOffset
          moduleOffset += section.modules.length
          return (
            <section key={section.kicker} aria-label={section.title}>
              <AiaSectionHeading kicker={section.kicker} title={section.title} />
              <div className="mt-2">
                <PortalModuleList modules={section.modules} startIndex={startIndex} />
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
