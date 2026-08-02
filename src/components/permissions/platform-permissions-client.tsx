"use client"

import { useState } from "react"
import { Loader2, ShieldCheck, Trash2 } from "lucide-react"

import { PermissionSubjectPicker } from "@/components/permissions/permission-subject-picker"
import {
  useContentPermissions,
  useRemoveContentPermission,
  useSetContentPermission,
  useSetContentPermissionsForScope,
  type ContentPermissionEntry,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OAUserScope } from "@/lib/oa-forms"
import { cn } from "@/lib/utils"

type PermissionCategory = "news" | "events" | "reimbursement"

type PermissionTab = {
  category: PermissionCategory
  kicker: string
  label: string
  description: string
  createLabel: string
  manageLabel: string
}

const permissionTabs: PermissionTab[] = [
  {
    category: "news",
    kicker: "News",
    label: "新闻",
    description: "控制新闻稿件的创建、审核与发布管理。",
    createLabel: "创建权",
    manageLabel: "审核与管理权",
  },
  {
    category: "events",
    kicker: "Events",
    label: "活动",
    description: "控制活动信息的创建、审核与发布管理。",
    createLabel: "创建权",
    manageLabel: "审核与管理权",
  },
  {
    category: "reimbursement",
    kicker: "Reimbursement",
    label: "报销",
    description: "分别控制自定义报销表单的创建和报销事项审批。",
    createLabel: "创建报销表单",
    manageLabel: "审批报销",
  },
]

const identityLabels: Record<string, string> = {
  undergrad: "本科生",
  graduate: "研究生",
  teacher: "教师",
  other: "其他成员",
}

function PermissionRow({
  category,
  entry,
  tab,
  onError,
}: {
  category: PermissionCategory
  entry: ContentPermissionEntry
  tab: PermissionTab
  onError: (message: string) => void
}) {
  const setPermission = useSetContentPermission()
  const removePermission = useRemoveContentPermission()
  const [isSaving, setIsSaving] = useState(false)

  async function update(next: { canCreate: boolean; canManage: boolean }) {
    setIsSaving(true)
    onError("")
    try {
      if (!next.canCreate && !next.canManage) {
        await removePermission({ category: category as never, userId: entry.userId })
      } else {
        await setPermission({
          category: category as never,
          userId: entry.userId,
          ...next,
        })
      }
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "权限更新失败，请稍后重试。")
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    setIsSaving(true)
    onError("")
    try {
      await removePermission({ category: category as never, userId: entry.userId })
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "权限移除失败，请稍后重试。")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <li className="grid gap-4 border-b aia-border-rule py-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[hsl(var(--aia-ink))]">{entry.name}</p>
        <p className="aia-mono mt-1 truncate text-xs aia-text-muted">
          {entry.username} · {identityLabels[entry.identityType] || "其他成员"}
        </p>
      </div>

      <fieldset disabled={isSaving} className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">{entry.name} 的权限</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={entry.canManage}
            onChange={(event) => update({ canManage: event.target.checked, canCreate: entry.canCreate })}
            className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]"
          />
          {tab.manageLabel}
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={entry.canCreate}
            onChange={(event) => update({ canCreate: event.target.checked, canManage: entry.canManage })}
            className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]"
          />
          {tab.createLabel}
        </label>
      </fieldset>

      <button
        type="button"
        disabled={isSaving}
        onClick={remove}
        className="aia-focus aia-mono inline-flex min-h-11 w-fit items-center gap-1.5 px-2 text-xs uppercase tracking-[0.1em] aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))] disabled:cursor-wait disabled:opacity-50"
        aria-label={`移除 ${entry.name} 的${tab.label}权限`}
      >
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
        移除
      </button>
    </li>
  )
}

function PermissionCategoryPanel({ tab }: { tab: PermissionTab }) {
  const permissions = useContentPermissions(tab.category as never)
  const setPermissionsForScope = useSetContentPermissionsForScope()
  const [error, setError] = useState("")

  async function assign(input: {
    scope: OAUserScope
    canCreate: boolean
    canManage: boolean
  }) {
    setError("")
    try {
      await setPermissionsForScope({
        category: tab.category as never,
        scope: input.scope,
        canCreate: input.canCreate,
        canManage: input.canManage,
      })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "权限添加失败，请稍后重试。"
      setError(message)
      throw cause
    }
  }

  return (
    <div
      id={`permission-panel-${tab.category}`}
      role="tabpanel"
      aria-labelledby={`permission-tab-${tab.category}`}
      className="pt-8"
    >
      <div className="mb-8 max-w-2xl">
        <p className="aia-kicker">{tab.label}权限 · {tab.kicker}</p>
        <h2 className="aia-serif mt-2 text-2xl font-semibold tracking-tight">{tab.label}权限配置</h2>
        <p className="mt-2 text-sm leading-6 aia-text-muted">{tab.description}</p>
      </div>

      <PermissionSubjectPicker
        categoryLabel={tab.label}
        createLabel={tab.createLabel}
        manageLabel={tab.manageLabel}
        onAssign={assign}
      />

      <section aria-labelledby={`${tab.category}-authorized-title`} className="pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b aia-border-rule pb-3">
          <h3 id={`${tab.category}-authorized-title`} className="aia-serif text-xl font-semibold tracking-tight">
            有权限人员列表
          </h3>
          <span className="aia-mono text-xs aia-text-muted">
            {permissions === undefined ? "—" : `${permissions.length} 人`}
          </span>
        </div>

        {error ? (
          <p role="alert" className="border-b aia-border-rule py-4 text-sm text-[hsl(var(--aia-red))]">
            {error}
          </p>
        ) : null}

        {permissions === undefined ? (
          <p role="status" className="flex items-center gap-2 border-b aia-border-rule py-6 text-sm aia-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            正在读取权限配置…
          </p>
        ) : permissions.length === 0 ? (
          <p className="border-b aia-border-rule py-6 text-sm aia-text-muted">
            尚未配置{tab.label}权限人员。超级管理员如需参与也必须显式添加。
          </p>
        ) : (
          <ul>
            {permissions.map((entry) => (
              <PermissionRow
                key={entry.userId}
                category={tab.category}
                entry={entry}
                tab={tab}
                onError={setError}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function PermissionWorkspace() {
  const [activeCategory, setActiveCategory] = useState<PermissionCategory>("news")
  const activeTab = permissionTabs.find((tab) => tab.category === activeCategory) || permissionTabs[0]
  const focusTab = (category: PermissionCategory) => {
    setActiveCategory(category)
    window.requestAnimationFrame(() => {
      document.getElementById(`permission-tab-${category}`)?.focus()
    })
  }

  return (
    <>
      <div role="tablist" aria-label="平台权限类别" className="flex flex-wrap gap-x-8 gap-y-1 border-b aia-border-rule">
        {permissionTabs.map((tab) => {
          const isActive = tab.category === activeCategory
          return (
            <button
              key={tab.category}
              type="button"
              role="tab"
              id={`permission-tab-${tab.category}`}
              aria-selected={isActive}
              aria-controls={`permission-panel-${tab.category}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveCategory(tab.category)}
              onKeyDown={(event) => {
                const currentIndex = permissionTabs.findIndex((candidate) => candidate.category === tab.category)
                let nextIndex = currentIndex
                if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % permissionTabs.length
                else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + permissionTabs.length) % permissionTabs.length
                else if (event.key === "Home") nextIndex = 0
                else if (event.key === "End") nextIndex = permissionTabs.length - 1
                else return
                event.preventDefault()
                focusTab(permissionTabs[nextIndex].category)
              }}
              className={cn(
                "aia-focus relative flex min-h-11 items-center gap-2 pb-2.5 pt-1 text-sm transition-colors",
                isActive
                  ? "font-semibold text-[hsl(var(--aia-ink))]"
                  : "aia-text-muted hover:text-[hsl(var(--aia-ink))]",
              )}
            >
              <span className="aia-kicker">{tab.kicker}</span>
              {tab.label}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 -bottom-px h-0.5",
                  isActive ? "bg-[hsl(var(--aia-red))]" : "bg-transparent",
                )}
              />
            </button>
          )
        })}
      </div>
      <PermissionCategoryPanel key={activeTab.category} tab={activeTab} />
    </>
  )
}

export function PlatformPermissionsClient() {
  const { isLoading, isSuperAdmin } = useAuth()

  if (isLoading) {
    return (
      <p role="status" className="flex items-center gap-2 border-y aia-border-rule py-6 text-sm aia-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        正在确认管理权限…
      </p>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div role="alert" className="border-y aia-border-rule py-8">
        <ShieldCheck className="mb-3 h-5 w-5 text-[hsl(var(--aia-red))]" aria-hidden="true" />
        <h2 className="aia-serif text-xl font-semibold">只有超级管理员可以管理平台权限</h2>
        <p className="mt-2 text-sm aia-text-muted">当前账号无法读取或修改新闻、活动与报销的授权配置。</p>
      </div>
    )
  }

  return <PermissionWorkspace />
}
