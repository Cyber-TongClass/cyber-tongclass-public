"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"

import {
  useManageableScopeOptions,
  type ManageableScopePurpose,
} from "@/lib/api"
import {
  normalizeOAUserScope,
  type OAIdentityType,
  type OAUserScope,
  type OAWorkflowRole,
} from "@/lib/oa-forms"
import { cn } from "@/lib/utils"

const identityOptions: Array<{ value: OAIdentityType; label: string }> = [
  { value: "undergrad", label: "本科生" },
  { value: "graduate", label: "研究生" },
  { value: "teacher", label: "教师" },
  { value: "other", label: "其他成员" },
]
const allIdentityTypes = identityOptions.map((option) => option.value)

const roleOptions: Array<{ value: OAWorkflowRole; label: string }> = [
  { value: "member", label: "普通用户" },
  { value: "admin", label: "管理员" },
  { value: "super_admin", label: "超级管理员" },
]

type ServerScopeOption = {
  kind: "identity" | "researchGroup" | "userGroup" | "user"
  value: string
  label: string
  meta?: string
  identityType?: string
}

type ScopeOptionKind = ServerScopeOption["kind"] | "role" | "all"

type ScopeOption = {
  key: string
  kind: ScopeOptionKind
  value: string
  label: string
  typeLabel: string
  sectionLabel: string
  meta?: string
}

type SelectedItem = Pick<ScopeOption, "key" | "kind" | "value" | "label" | "typeLabel">

const kindPresentation: Record<ServerScopeOption["kind"], { typeLabel: string; sectionLabel: string }> = {
  identity: { typeLabel: "资格组", sectionLabel: "资格组" },
  researchGroup: { typeLabel: "课题组", sectionLabel: "课题组" },
  userGroup: { typeLabel: "用户组", sectionLabel: "用户组" },
  user: { typeLabel: "账号", sectionLabel: "账号" },
}

function toggle(list: readonly string[] | undefined, value: string) {
  const current = list || []
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}

function isSelected(scope: OAUserScope, option: ScopeOption) {
  if (option.kind === "all") return isEveryoneScope(scope)
  if (option.kind === "identity") return scope.identityTypes?.includes(option.value as OAIdentityType)
  if (option.kind === "role") return scope.roles?.includes(option.value as OAWorkflowRole)
  if (option.kind === "researchGroup") return scope.researchGroupIds?.includes(option.value)
  if (option.kind === "userGroup") return scope.userGroupIds?.includes(option.value)
  return scope.userIds?.includes(option.value)
}

function isEveryoneScope(scope: OAUserScope) {
  return allIdentityTypes.every((identityType) => scope.identityTypes?.includes(identityType))
    && !scope.roles?.length
    && !scope.userIds?.length
    && !scope.researchGroupIds?.length
    && !scope.userGroupIds?.length
}

export type OaScopePickerProps = {
  scope: OAUserScope
  onChange: (scope: OAUserScope) => void
  idPrefix: string
  ariaLabel?: string
  showRoles?: boolean
  allowEmpty?: boolean
  includeEveryoneOption?: boolean
  purpose?: ManageableScopePurpose
}

/**
 * Shared union-semantics scope picker. The server is the authority for every
 * account/group result; the client only adds role options and presentation.
 */
export function OaScopePicker({
  scope,
  onChange,
  idPrefix,
  ariaLabel = "查找人员或人员组",
  showRoles = false,
  allowEmpty = false,
  includeEveryoneOption = false,
  purpose,
}: OaScopePickerProps) {
  const [userQuery, setUserQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const serverOptions = useManageableScopeOptions(
    purpose || (showRoles ? "workflow_approver" : "form_audience"),
    userQuery,
    scope,
  ) as ServerScopeOption[] | undefined
  const pickerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef(new Map<string, HTMLButtonElement>())
  const labelCache = useRef(new Map<string, ScopeOption>())
  const apply = (next: OAUserScope) => onChange(normalizeOAUserScope(next) || {})
  const everyoneSelected = includeEveryoneOption && isEveryoneScope(scope)

  const allOptions = useMemo<ScopeOption[]>(() => {
    const serverRows = (serverOptions || []).map((option) => {
      const presentation = kindPresentation[option.kind]
      return {
        key: `${option.kind}:${option.value}`,
        kind: option.kind,
        value: option.value,
        label: option.label,
        typeLabel: presentation.typeLabel,
        sectionLabel: presentation.sectionLabel,
        meta: option.meta,
      }
    })
    const normalizedQuery = userQuery.trim().toLocaleLowerCase()
    const everyone: ScopeOption[] = includeEveryoneOption
      && (!normalizedQuery || "所有人".includes(normalizedQuery))
      ? [{
          key: "all:everyone",
          kind: "all",
          value: "everyone",
          label: "所有人",
          typeLabel: "范围",
          sectionLabel: "快捷选择",
          meta: "全部研究院成员",
        }]
      : []
    const roles: ScopeOption[] = showRoles
      ? roleOptions
          .filter((option) => !normalizedQuery || option.label.includes(normalizedQuery))
          .map((option) => ({
            key: `role:${option.value}`,
            kind: "role",
            value: option.value,
            label: option.label,
            typeLabel: "角色",
            sectionLabel: "管理角色",
          }))
      : []
    return [...everyone, ...serverRows, ...roles]
  }, [includeEveryoneOption, serverOptions, showRoles, userQuery])

  const availableOptions = useMemo(
    () => everyoneSelected ? [] : allOptions.filter((option) => !isSelected(scope, option)),
    [allOptions, everyoneSelected, scope],
  )

  for (const option of allOptions) labelCache.current.set(option.key, option)
  labelCache.current.set("all:everyone", {
    key: "all:everyone",
    kind: "all",
    value: "everyone",
    label: "所有人",
    typeLabel: "范围",
    sectionLabel: "快捷选择",
  })
  for (const option of identityOptions) {
    labelCache.current.set(`identity:${option.value}`, {
      key: `identity:${option.value}`,
      kind: "identity",
      value: option.value,
      label: option.label,
      typeLabel: "资格组",
      sectionLabel: "资格组",
    })
  }
  for (const option of roleOptions) {
    labelCache.current.set(`role:${option.value}`, {
      key: `role:${option.value}`,
      kind: "role",
      value: option.value,
      label: option.label,
      typeLabel: "角色",
      sectionLabel: "管理角色",
    })
  }

  const sections = useMemo(() => {
    const order = ["快捷选择", "资格组", "管理角色", "课题组", "用户组", "账号"]
    return order
      .map((label) => ({
        label,
        options: availableOptions.filter((option) => option.sectionLabel === label),
      }))
      .filter((section) => section.options.length > 0)
  }, [availableOptions])

  const flatOptions = useMemo(() => sections.flatMap((section) => section.options), [sections])

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, flatOptions.length - 1)))
  }, [flatOptions.length])

  useEffect(() => {
    const active = flatOptions[activeIndex]
    if (!isOpen || !active) return
    optionRefs.current.get(active.key)?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, flatOptions, isOpen])

  const selectedKeys = everyoneSelected
    ? ["all:everyone"]
    : [
        ...(scope.identityTypes || []).map((value) => `identity:${value}`),
        ...(scope.roles || []).map((value) => `role:${value}`),
        ...(scope.researchGroupIds || []).map((value) => `researchGroup:${value}`),
        ...(scope.userGroupIds || []).map((value) => `userGroup:${value}`),
        ...(scope.userIds || []).map((value) => `user:${value}`),
      ]
  const selectedItems: SelectedItem[] = selectedKeys.map((key) => {
    const cached = labelCache.current.get(key)
    if (cached) return cached
    const [kind, ...valueParts] = key.split(":")
    const value = valueParts.join(":")
    const typeLabel = kind === "all" ? "范围"
      : kind === "researchGroup" ? "课题组"
      : kind === "userGroup" ? "用户组"
        : kind === "user" ? "账号"
          : kind === "role" ? "角色"
            : "资格组"
    return { key, kind: kind as ScopeOptionKind, value, label: value, typeLabel }
  })

  function addOption(option: ScopeOption) {
    labelCache.current.set(option.key, option)
    if (option.kind === "all") {
      apply({ identityTypes: [...allIdentityTypes] })
    } else if (option.kind === "identity") {
      apply({ ...scope, identityTypes: toggle(scope.identityTypes, option.value) as OAIdentityType[] })
    } else if (option.kind === "role") {
      apply({ ...scope, roles: toggle(scope.roles, option.value) as OAWorkflowRole[] })
    } else if (option.kind === "researchGroup") {
      apply({ ...scope, researchGroupIds: toggle(scope.researchGroupIds, option.value) })
    } else if (option.kind === "userGroup") {
      apply({ ...scope, userGroupIds: toggle(scope.userGroupIds, option.value) })
    } else {
      apply({ ...scope, userIds: toggle(scope.userIds, option.value) })
    }
    setUserQuery("")
    setActiveIndex(0)
    setIsOpen(true)
    inputRef.current?.focus()
  }

  function removeItem(item: SelectedItem) {
    if (item.kind === "all") {
      apply({})
    } else if (item.kind === "identity") {
      apply({ ...scope, identityTypes: scope.identityTypes?.filter((value) => value !== item.value) })
    } else if (item.kind === "role") {
      apply({ ...scope, roles: scope.roles?.filter((value) => value !== item.value) })
    } else if (item.kind === "researchGroup") {
      apply({ ...scope, researchGroupIds: scope.researchGroupIds?.filter((value) => value !== item.value) })
    } else if (item.kind === "userGroup") {
      apply({ ...scope, userGroupIds: scope.userGroupIds?.filter((value) => value !== item.value) })
    } else {
      apply({ ...scope, userIds: scope.userIds?.filter((value) => value !== item.value) })
    }
  }

  const isEmpty = !scope.identityTypes?.length
    && !scope.roles?.length
    && !scope.userIds?.length
    && !scope.researchGroupIds?.length
    && !scope.userGroupIds?.length
  const activeOption = flatOptions[activeIndex]

  return (
    <div className="space-y-4">
      {selectedItems.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="已选择的范围条件">
          {selectedItems.map((item) => (
            <li key={item.key} className="aia-bg-tag flex items-center gap-2 px-2.5 py-1 text-sm text-[hsl(var(--aia-ink))]">
              <span>{item.label}</span>
              <span className="aia-mono text-xs aia-text-muted">{item.typeLabel}</span>
              <button
                type="button"
                aria-label={`移除 ${item.label}`}
                className="aia-focus -my-2 -mr-2 inline-flex min-h-11 min-w-11 items-center justify-center aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))]"
                onClick={() => removeItem(item)}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        ref={pickerRef}
        className="relative"
        onBlur={() => {
          window.setTimeout(() => {
            if (!pickerRef.current?.contains(document.activeElement)) setIsOpen(false)
          }, 0)
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[hsl(var(--aia-muted))]" aria-hidden="true" />
        <input
          ref={inputRef}
          id={`${idPrefix}-scope-search`}
          role="combobox"
          aria-autocomplete="list"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-controls={`${idPrefix}-scope-results`}
          aria-activedescendant={isOpen && activeOption ? `${idPrefix}-scope-option-${activeOption.key}` : undefined}
          value={userQuery}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(event) => {
            setUserQuery(event.target.value)
            setActiveIndex(0)
            setIsOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setIsOpen(true)
              setActiveIndex((current) => Math.min(current + 1, flatOptions.length - 1))
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setIsOpen(true)
              setActiveIndex((current) => Math.max(current - 1, 0))
            } else if (event.key === "Enter" && isOpen && activeOption) {
              event.preventDefault()
              addOption(activeOption)
            } else if (event.key === "Escape") {
              event.preventDefault()
              setIsOpen(false)
            }
          }}
          placeholder="搜索资格组、课题组、用户组或账号…"
          className="aia-focus min-h-11 w-full border aia-border-rule bg-transparent py-2 pl-9 pr-3 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"
        />

        {isOpen ? (
          <div
            id={`${idPrefix}-scope-results`}
            role="listbox"
            className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto border aia-border-rule bg-[hsl(var(--aia-paper))]"
          >
            {sections.map((section, sectionIndex) => (
              <section
                key={section.label}
                aria-labelledby={`${idPrefix}-scope-section-${sectionIndex}`}
                className={cn(sectionIndex > 0 && "border-t aia-border-rule")}
              >
                <h4
                  id={`${idPrefix}-scope-section-${sectionIndex}`}
                  className="aia-mono px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.12em] aia-text-muted"
                >
                  {section.label}
                </h4>
                <ul>
                  {section.options.map((option) => {
                    const optionIndex = flatOptions.findIndex((candidate) => candidate.key === option.key)
                    const isActive = optionIndex === activeIndex
                    return (
                      <li key={option.key}>
                        <button
                          ref={(node) => {
                            if (node) optionRefs.current.set(option.key, node)
                            else optionRefs.current.delete(option.key)
                          }}
                          id={`${idPrefix}-scope-option-${option.key}`}
                          type="button"
                          role="option"
                          tabIndex={-1}
                          aria-selected={isActive}
                          className={cn(
                            "aia-focus flex min-h-11 w-full items-baseline gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--aia-tag))]",
                            isActive && "bg-[hsl(var(--aia-tag))]",
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveIndex(optionIndex)}
                          onClick={() => addOption(option)}
                        >
                          <span className="min-w-0 truncate text-[hsl(var(--aia-ink))]">{option.label}</span>
                          {option.meta ? <span className="aia-mono ml-auto shrink-0 text-xs aia-text-muted">{option.meta}</span> : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}

            {serverOptions === undefined ? <p className="aia-text-muted px-3 py-3 text-sm">正在加载…</p> : null}
            {serverOptions !== undefined && flatOptions.length === 0 ? (
              <p className="aia-text-muted px-3 py-3 text-sm">
                {userQuery.trim() ? "没有匹配的选项。" : "没有更多可选条件。"}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className={cn("text-xs leading-5", isEmpty && !allowEmpty ? "text-[hsl(var(--aia-red))]" : "aia-text-muted")}>
        {isEmpty
          ? allowEmpty
            ? "未选择任何条件：所有已登录的研究院账号都在范围内。"
            : "请至少选择一个条件；以上任一条件匹配即纳入范围。"
          : "以上任一条件匹配即纳入范围（并集）。"}
      </p>
    </div>
  )
}
