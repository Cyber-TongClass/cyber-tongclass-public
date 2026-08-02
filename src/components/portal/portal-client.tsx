"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { AiaKicker } from "@/components/institute/editorial/kicker"
import { AiaRule } from "@/components/institute/editorial/rule"
import { getAccountRoleLabel } from "@/lib/account-role"
import { useMyContentPermissions, useMyPublicProfileDestination } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { withReturnTo } from "@/lib/safe-local-path"
import { cn } from "@/lib/utils"
import { siteCopy } from "@/config/site-copy"

type PortalModule = {
  href: string
  title: string
  description: string
}

type PortalSection = {
  kicker: string
  title: string
  blurb: string
  modules: PortalModule[]
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function isDesktopLastGridRow(index: number, total: number) {
  const lastRowSize = total % 2 === 0 ? 2 : 1
  return index >= total - lastRowSize
}

export function PortalClient() {
  const copy = siteCopy.portal
  const { currentUser, isAdmin, isLoading, isAuthenticated } = useAuth()
  const profileDestination = useMyPublicProfileDestination({ enabled: isAuthenticated })
  const contentPermissions = useMyContentPermissions()

  const loginHref = "/login?next=%2Fportal%2Flist"

  if (isLoading) {
    return (
      <div className="container-custom py-20">
        <AiaKicker>{copy.kicker}</AiaKicker>
        <h1 className="aia-serif mt-5 text-4xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
          {copy.title}
        </h1>
        <AiaRule className="mt-8 w-24" />
        <p className="aia-text-muted mt-6 text-sm leading-7">{copy.loadingLogin}</p>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="container-custom py-20">
        <AiaKicker>{copy.kicker}</AiaKicker>
        <h1 className="aia-serif mt-5 max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
          {copy.title}
        </h1>
        <AiaRule className="mt-8 w-24" />
        <p className="aia-text-muted mt-6 max-w-2xl text-base leading-8">
          {copy.signedOutDescription}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            href={loginHref}
            className="aia-focus border aia-border-rule px-4 py-2.5 text-sm font-medium tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
          >
            {copy.loginAction}
          </Link>
          <Link href="/" className="aia-link aia-focus text-sm">
            {siteCopy.common.returnHome}
          </Link>
        </div>
      </div>
    )
  }

  if (contentPermissions === undefined) {
    return (
      <div className="container-custom py-20">
        <AiaKicker>{copy.kicker}</AiaKicker>
        <h1 className="aia-serif mt-5 text-4xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
          {copy.title}
        </h1>
        <AiaRule className="mt-8 w-24" />
        <p className="aia-text-muted mt-6 text-sm leading-7" role="status">{copy.loadingPermissions}</p>
      </div>
    )
  }

  const displayName = currentUser.chineseName || currentUser.englishName || currentUser.username

  const isTeacher = currentUser.identityType === "teacher"
  const canManageForms = currentUser.identityType === "teacher" || currentUser.role === "super_admin"
  const canManageResearchGroups = isTeacher || currentUser.role === "super_admin"
  const isGraduate = currentUser.identityType === "graduate"
  const isClassMember = currentUser.isClassMember === true
  const portalReturnTo = "/portal/list"

  const identityTags = [
    isClassMember ? copy.identity.classMember : null,
    isTeacher ? copy.identity.teacher : null,
    getAccountRoleLabel(currentUser.role),
  ].filter((tag): tag is string => tag !== null)

  const commonModules: PortalModule[] = [
    {
      href: "/services/coffee-talk",
      ...copy.modules.coffeeTalk,
    },
    {
      href: withReturnTo("/services/oa", portalReturnTo),
      ...copy.modules.oa,
    },
    ...(isGraduate
      ? [{
          href: "/tong-class/intranet",
          ...copy.modules.graduateIntranet,
        }]
      : []),
    {
      href: "/my-publications",
      ...copy.modules.publications,
    },
    ...(profileDestination
      ? [{
          href: withReturnTo(profileDestination.href, portalReturnTo),
          title: profileDestination.label,
          description: copy.modules.publicProfile.description,
        }]
      : []),
    {
      href: "/settings",
      ...copy.modules.settings,
    },
  ]

  const classModules: PortalModule[] = [
    {
      href: "/tong-class/intranet",
      ...copy.modules.classIntranet,
    },
    {
      href: "/tong-class/courses",
      ...copy.modules.courses,
    },
    {
      href: "/tong-class/events",
      ...copy.modules.events,
    },
  ]

  const classWorkModules: PortalModule[] = [
    ...(contentPermissions.news.canCreate
      ? [{
          href: "/class-work/news/new",
          ...copy.modules.createNews,
        }]
      : []),
    ...(contentPermissions.news.canManage
      ? [{
          href: "/class-work/news/manage",
          ...copy.modules.manageNews,
        }]
      : []),
    ...(contentPermissions.events.canCreate
      ? [{
          href: "/class-work/events/new",
          ...copy.modules.createEvent,
        }]
      : []),
    ...(contentPermissions.events.canManage
      ? [{
          href: "/class-work/events/manage",
          ...copy.modules.manageEvent,
        }]
      : []),
    ...(contentPermissions.reimbursement.canCreate
      ? [{
          href: "/forms/manage/reimbursements/new",
          ...copy.modules.createReimbursement,
        }]
      : []),
    ...(contentPermissions.reimbursement.canManage
      ? [{
          href: "/services/oa/approvals",
          ...copy.modules.reviewReimbursement,
        }]
      : []),
  ]

  const teacherModules: PortalModule[] = [
    {
      href: "/forms/manage",
      ...copy.modules.forms,
    },
    ...(canManageResearchGroups
      ? [{
          href: "/groups/manage",
          title: copy.modules.researchGroupsTeacher.title,
          description: isTeacher
            ? copy.modules.researchGroupsTeacher.description
            : copy.modules.researchGroupsAdmin.description,
        }]
      : []),
  ]

  const adminModules: PortalModule[] = [
    {
      href: "/admin",
      ...copy.modules.admin,
    },
    ...(currentUser.role === "super_admin"
      ? [
          {
            href: "/platform/permissions",
            ...copy.modules.permissions,
          },
          {
            href: "/organization/manage",
            ...copy.modules.organization,
          },
        ]
      : []),
  ]

  const sections: PortalSection[] = [
    {
      ...copy.sections.common,
      modules: commonModules,
    },
    ...(isClassMember
      ? [{
          ...copy.sections.class,
          modules: classModules,
        }]
      : []),
    ...(classWorkModules.length > 0
      ? [{
          ...copy.sections.classWork,
          modules: classWorkModules,
        }]
      : []),
    ...(canManageForms
      ? [{
          kicker: copy.sections.teacher.kicker,
          title: copy.sections.teacher.title,
          blurb: isTeacher ? copy.sections.teacher.teacherBlurb : copy.sections.teacher.adminBlurb,
          modules: teacherModules,
        }]
      : []),
    ...(isAdmin
      ? [{
          ...copy.sections.admin,
          modules: adminModules,
        }]
      : []),
  ]

  let moduleOffset = 0

  return (
    <div className="container-custom py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <AiaKicker>{copy.kicker}</AiaKicker>
          <h1 className="aia-serif mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl">
            {copy.greetingPrefix}{displayName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              {copy.defaultIdentity}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:mt-10">
        {sections.map((section, sectionIndex) => {
          const startIndex = moduleOffset
          moduleOffset += section.modules.length
          const isLast = sectionIndex === sections.length - 1
          return (
            <section
              key={section.kicker}
              aria-label={section.title}
              className={cn(
                "grid gap-8 border-t aia-border-rule py-8 sm:py-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14",
                sectionIndex % 2 === 1 && "-mx-4 bg-[hsl(var(--aia-warm))] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
                isLast && "border-b",
              )}
            >
              <div>
                <AiaKicker>{section.kicker}</AiaKicker>
                <h2 className="aia-serif mt-3 text-2xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
                  {section.title}
                </h2>
                <p className="aia-text-muted mt-3 text-sm leading-6">{section.blurb}</p>
                <p className="aia-mono mt-4 text-xs aia-text-muted">
                  {pad(startIndex + 1)} — {pad(startIndex + section.modules.length)}
                </p>
              </div>
              <ul className="grid content-center gap-x-10 sm:grid-cols-2">
                {section.modules.map((module, moduleIndex) => (
                  <li
                    key={module.href}
                    className={cn(
                      "group border-b aia-border-rule",
                      moduleIndex === section.modules.length - 1 && "border-b-0",
                      isDesktopLastGridRow(moduleIndex, section.modules.length) && "sm:border-b-0",
                    )}
                  >
                    <Link href={module.href} className="aia-focus flex items-baseline gap-4 py-3.5">
                      <span className="aia-mono text-xs aia-text-muted transition-colors group-hover:text-[hsl(var(--aia-red))]">
                        {pad(startIndex + moduleIndex + 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="aia-serif block text-base font-semibold leading-snug text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                          {module.title}
                        </span>
                        <span className="aia-text-muted mt-1 block text-sm leading-6">
                          {module.description}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="ml-auto h-4 w-4 shrink-0 self-center text-[hsl(var(--aia-red))] opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
