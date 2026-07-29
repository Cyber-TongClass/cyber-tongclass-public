"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  useAssignTeacherGroupStudent,
  useRemoveTeacherGroupStudent,
  useTeacherGroupRoster,
} from "@/lib/api"

type Roster = {
  canManage: boolean
  groups: Array<{ id: string; slug: string; name: string }>
  students: Array<{ id: string; username: string; name: string; identityType: string; researchGroupId?: string }>
}

export default function TeacherGroupManagementPage() {
  const roster = useTeacherGroupRoster() as Roster | undefined
  const assignStudent = useAssignTeacherGroupStudent()
  const removeStudent = useRemoveTeacherGroupStudent()
  const [studentUserId, setStudentUserId] = useState("")
  const [researchGroupId, setResearchGroupId] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedGroup = useMemo(
    () => roster?.groups.find((group) => group.id === researchGroupId),
    [researchGroupId, roster?.groups],
  )

  async function assign() {
    if (!studentUserId || !researchGroupId) return
    setSaving(true)
    setMessage(null)
    try {
      await assignStudent({ studentUserId, researchGroupId })
      setMessage("学生已加入课题组。若其原来属于其他课题组，归属已自动替换。")
      setStudentUserId("")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function remove(student: Roster["students"][number]) {
    setSaving(true)
    setMessage(null)
    try {
      await removeStudent(student.id)
      setMessage(`已将 ${student.name} 移出课题组。`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "移除失败")
    } finally {
      setSaving(false)
    }
  }

  if (roster === undefined) {
    return <main className="container-custom py-16"><p className="text-sm text-slate-600">正在加载课题组管理信息…</p></main>
  }

  if (!roster.canManage) {
    return <main className="container-custom max-w-3xl py-16"><h1 className="text-3xl font-semibold text-slate-950">课题组管理</h1><p className="mt-4 text-slate-600">课题组成员管理权限已被超级管理员关闭；你的课题组和已有成员信息保持不变。</p></main>
  }

  if (roster.groups.length === 0) {
    return <main className="container-custom max-w-3xl py-16"><h1 className="text-3xl font-semibold text-slate-950">课题组管理</h1><p className="mt-4 text-slate-600">当前账号未绑定为任何课题组的负责人，无法管理学生名单。</p></main>
  }

  const assignedStudents = roster.students.filter((student) => student.researchGroupId)
  return (
    <main className="container-custom max-w-4xl py-12 sm:py-16">
      <Link href="/portal" className="text-sm text-primary hover:underline">返回内网</Link>
      <h1 className="mt-5 text-3xl font-semibold text-slate-950">课题组管理</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">从学生账号中选择成员。每位学生只能归属一个课题组；该归属不会公开展示，仅用于内部筛选与审批范围。</p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-950">添加或调整学生归属</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={researchGroupId} onChange={(event) => setResearchGroupId(event.target.value)}>
            <option value="">选择课题组</option>
            {roster.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={studentUserId} onChange={(event) => setStudentUserId(event.target.value)}>
            <option value="">选择学生</option>
            {roster.students.map((student) => <option key={student.id} value={student.id}>{student.name}（{student.username}）{student.researchGroupId ? " · 已归属" : ""}</option>)}
          </select>
        </div>
        <Button className="mt-4" type="button" disabled={saving || !studentUserId || !selectedGroup} onClick={assign}>保存归属</Button>
        {message ? <p className="mt-3 text-sm text-slate-600" role="status">{message}</p> : null}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-950">当前学生名单</h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {assignedStudents.length === 0 ? <li className="py-3 text-sm text-slate-500">暂无已归属的学生。</li> : assignedStudents.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>{student.name}<span className="ml-2 text-slate-500">{roster.groups.find((group) => group.id === student.researchGroupId)?.name}</span></span>
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => remove(student)}>移除</Button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
