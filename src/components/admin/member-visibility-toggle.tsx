"use client"

import { useRef, useState } from "react"
import { useUpdateUser } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"

export function MemberVisibilityToggle({ userId, name, enabled }: {
  userId: string
  name: string
  enabled: boolean
}) {
  const updateUser = useUpdateUser()
  const { isSuperAdmin } = useAuth()
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const toggle = async () => {
    if (!isSuperAdmin || !userId || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError("")
    try {
      await updateUser({ id: userId, isClassMember: !enabled })
    } catch (error) {
      setError(error instanceof Error ? error.message : "保存失败，请重试")
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${name}：在成员页展示`}
        aria-busy={saving}
        disabled={!isSuperAdmin || !userId || saving}
        title={!isSuperAdmin ? "仅超级管理员可以修改成员页展示状态" : undefined}
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-md py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden="true" className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 ${enabled ? "bg-blue-900" : "bg-gray-300"}`}>
          <span className={`h-4 w-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${enabled ? "translate-x-4" : "translate-x-0"}`} />
        </span>
        <span className="whitespace-nowrap text-gray-700">{saving ? "保存中…" : enabled ? "已启用" : "未启用"}</span>
      </button>
      {error && <p role="alert" className="max-w-56 text-xs text-red-600">{error}</p>}
    </div>
  )
}
