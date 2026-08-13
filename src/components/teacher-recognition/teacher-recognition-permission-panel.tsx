"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, ShieldCheck } from "lucide-react"

import { useSetTeacherRecognitionReviewerGroups, useTeacherRecognitionConfiguration, useUserGroups } from "@/lib/api"

type UserGroupsData = { groups: Array<{ id: string; name: string; description?: string; members: unknown[] }> }

export function TeacherRecognitionPermissionPanel() {
  const data = useUserGroups() as UserGroupsData | undefined
  const configuration = useTeacherRecognitionConfiguration() as { initialized: boolean; reviewerUserGroupIds: string[] } | undefined
  const save = useSetTeacherRecognitionReviewerGroups()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  useEffect(() => { if (configuration) setSelected(configuration.reviewerUserGroupIds) }, [configuration])
  const loading = data === undefined || configuration === undefined
  async function persist() { setSaving(true); setMessage(""); try { if (!selected.length) throw new Error("请至少选择一个审核用户组"); await save({ reviewerUserGroupIds: selected }); setMessage("教师奖励审核用户组已更新。") } catch (e) { setMessage(e instanceof Error ? e.message : "保存失败") } finally { setSaving(false) } }
  return <div id="permission-panel-teacher-recognition" role="tabpanel" aria-labelledby="permission-tab-teacher-recognition" className="pt-8"><div className="mb-8 max-w-2xl"><p className="aia-kicker">教师奖励 · Recognition</p><h2 className="aia-serif mt-2 text-2xl font-semibold">教师奖励管理</h2><p className="aia-text-muted mt-2 text-sm leading-6">这里只配置审核用户组。申请资格固定由教师身份决定，不能额外授予其他账户。</p></div>{loading ? <p className="flex items-center gap-2 py-6 text-sm aia-text-muted"><Loader2 className="h-4 w-4 animate-spin" />正在读取用户组…</p> : <><fieldset className="border-y aia-border-rule"><legend className="sr-only">教师奖励审核用户组</legend>{data.groups.length ? data.groups.map((group) => <label key={group.id} className="flex cursor-pointer items-center gap-4 border-b aia-border-rule py-4 last:border-b-0"><input type="checkbox" checked={selected.includes(group.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))} className="aia-focus h-4 w-4 accent-[hsl(var(--aia-red))]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{group.name}</span><span className="aia-text-muted mt-1 block text-xs">{group.description || "无说明"} · {group.members.length} 人</span></span></label>) : <p className="aia-text-muted py-6 text-sm">尚无用户组。请先在<Link href="/organization/manage" className="aia-link mx-1">组织管理</Link>中创建。</p>}</fieldset><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="aia-text-muted flex items-center gap-2 text-xs"><ShieldCheck className="h-4 w-4 text-[hsl(var(--aia-red))]" />采用任一审核人通过即完成的审核规则。</p><button type="button" disabled={saving || !selected.length} onClick={persist} className="aia-focus min-h-11 bg-[hsl(var(--aia-red))] px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? "正在保存…" : "保存审核用户组"}</button></div>{message ? <p role="status" className="mt-4 text-sm text-[hsl(var(--aia-red))]">{message}</p> : null}</>}</div>
}
