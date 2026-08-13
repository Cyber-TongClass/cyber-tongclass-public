"use client"

import { useState } from "react"

import { OaScopePicker } from "@/components/oa/oa-scope-picker"
import type { OAUserScope } from "@/lib/oa-forms"

type PermissionSubjectPickerProps = {
  categoryLabel: string
  createLabel: string
  reviewLabel?: string
  manageLabel: string
  onAssign: (input: {
    scope: OAUserScope
    canCreate: boolean
    canReview?: boolean
    canManage: boolean
  }) => Promise<unknown>
  canAssignScope?: (scope: OAUserScope) => boolean
  unsupportedScopeMessage?: string
}

function hasScopeValue(scope: OAUserScope) {
  return Boolean(
    scope.identityTypes?.length
      || scope.roles?.length
      || scope.userIds?.length
      || scope.researchGroupIds?.length
      || scope.userGroupIds?.length,
  )
}

export function PermissionSubjectPicker({
  categoryLabel,
  createLabel,
  reviewLabel,
  manageLabel,
  onAssign,
  canAssignScope = () => true,
  unsupportedScopeMessage = "当前选择暂时无法授权。",
}: PermissionSubjectPickerProps) {
  const [scope, setScope] = useState<OAUserScope>({})
  const [canCreate, setCanCreate] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const isScopeSupported = canAssignScope(scope)
  const canSubmit = hasScopeValue(scope) && isScopeSupported && (canCreate || canReview || canManage) && !isSaving

  async function assign() {
    if (!canSubmit) return
    setError("")
    setIsSaving(true)
    try {
      await onAssign({ scope, canCreate, canReview, canManage })
      setScope({})
      setCanCreate(false)
      setCanReview(false)
      setCanManage(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "权限添加失败，请稍后重试。")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section aria-labelledby="permission-subject-picker-title" className="border-b aia-border-rule pb-8">
      <div className="mb-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="aia-kicker">查找人员 · Subjects</p>
          <h2 id="permission-subject-picker-title" className="aia-serif mt-1 text-xl font-semibold tracking-tight">
            添加{categoryLabel}权限人员
          </h2>
        </div>
        <p className="aia-mono text-xs aia-text-muted">资格组、课题组、用户组与账号均可选择</p>
      </div>

      <OaScopePicker
        scope={scope}
        onChange={setScope}
        idPrefix={`platform-permission-${categoryLabel}`}
        ariaLabel="查找要授权的人员或人员组"
        allowEmpty={false}
      />

      <fieldset className="mt-5 border-y aia-border-rule">
        <legend className="sr-only">为选中人员授予的权限</legend>
        <label className="flex cursor-pointer items-center gap-3 border-b aia-border-rule py-3 text-sm">
          <input
            type="checkbox"
            checked={canManage}
            onChange={(event) => setCanManage(event.target.checked)}
            className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]"
          />
          <span className="min-w-0 flex-1">{manageLabel}</span>
          <span className="aia-mono text-xs aia-text-muted">Manage</span>
        </label>
        {reviewLabel ? (
          <label className="flex cursor-pointer items-center gap-3 border-b aia-border-rule py-3 text-sm">
            <input
              type="checkbox"
              checked={canReview}
              onChange={(event) => setCanReview(event.target.checked)}
              className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]"
            />
            <span className="min-w-0 flex-1">{reviewLabel}</span>
            <span className="aia-mono text-xs aia-text-muted">Review</span>
          </label>
        ) : null}
        <label className="flex cursor-pointer items-center gap-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={canCreate}
            onChange={(event) => setCanCreate(event.target.checked)}
            className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]"
          />
          <span className="min-w-0 flex-1">{createLabel}</span>
          <span className="aia-mono text-xs aia-text-muted">Create</span>
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[hsl(var(--aia-red))]">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 aia-text-muted">
          {!hasScopeValue(scope)
            ? "先选择需要授权的人员或人员组。"
            : !isScopeSupported
              ? unsupportedScopeMessage
            : !canCreate && !canReview && !canManage
              ? "至少选择一项权限。"
              : "同一账号已有的权限将被本次设置更新。"}
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={assign}
          className="aia-focus min-h-11 border border-[hsl(var(--aia-red))] bg-[hsl(var(--aia-red))] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--aia-red-deep))] disabled:cursor-not-allowed disabled:border-[hsl(var(--aia-rule))] disabled:bg-transparent disabled:text-[hsl(var(--aia-muted))]"
        >
          {isSaving ? "正在添加…" : "添加到权限列表"}
        </button>
      </div>
    </section>
  )
}
