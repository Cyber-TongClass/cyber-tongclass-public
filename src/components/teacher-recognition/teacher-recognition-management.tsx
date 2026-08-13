"use client"

import { useMemo, useState } from "react"

import { useTeacherRecognitionCategories, useTeacherRecognitionManagement } from "@/lib/api"
import { getTeacherRecognitionStatusLabel } from "@/lib/teacher-recognition"

export function TeacherRecognitionManagement() {
  const categories = useTeacherRecognitionCategories(true) as Array<{ id: string; label: string }> | undefined
  const [year, setYear] = useState("")
  const [teacherQuery, setTeacherQuery] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [status, setStatus] = useState("")
  const filters = useMemo(() => ({
    ...(year ? { year: Number(year) } : {}),
    ...(teacherQuery.trim() ? { teacherQuery: teacherQuery.trim() } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
  }), [year, teacherQuery, categoryId, status])
  const data = useTeacherRecognitionManagement(filters) as any

  return <div>
    <div className="border-b aia-border-rule pb-5"><p className="aia-kicker">Management · Annual</p><h2 className="aia-serif mt-2 text-2xl font-semibold">年度统计</h2></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs aia-text-muted">年度<input value={year} onChange={(e) => setYear(e.target.value)} type="number" placeholder="全部" className="aia-focus mt-1 w-full border aia-border-rule bg-transparent px-3 py-2 text-sm" /></label>
      <label className="text-xs aia-text-muted">教师<input value={teacherQuery} onChange={(e) => setTeacherQuery(e.target.value)} placeholder="姓名 / 邮箱" className="aia-focus mt-1 w-full border aia-border-rule bg-transparent px-3 py-2 text-sm" /></label>
      <label className="text-xs aia-text-muted">类别<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="aia-focus mt-1 w-full border aia-border-rule bg-transparent px-3 py-2 text-sm"><option value="">全部</option>{categories?.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="text-xs aia-text-muted">状态<select value={status} onChange={(e) => setStatus(e.target.value)} className="aia-focus mt-1 w-full border aia-border-rule bg-transparent px-3 py-2 text-sm"><option value="">全部</option><option value="pending">待审核</option><option value="needs_changes">需补材料</option><option value="approved">已通过</option><option value="rejected">已驳回</option></select></label>
    </div>
    {data === undefined ? <p className="aia-text-muted py-8 text-sm">正在统计…</p> : <>
      <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="border-t-2 border-[hsl(var(--aia-red))] pt-3"><p className="aia-kicker">Records</p><p className="aia-serif mt-1 text-3xl font-semibold">{data.rows.length}</p><p className="aia-text-muted text-xs">当前筛选记录</p></div><div className="border-t aia-border-rule pt-3"><p className="aia-kicker">Approved</p><p className="aia-serif mt-1 text-3xl font-semibold">{data.rows.filter((r: any) => r.reviewStatus === "approved").length}</p><p className="aia-text-muted text-xs">已通过</p></div><div className="border-t aia-border-rule pt-3"><p className="aia-kicker">Teachers</p><p className="aia-serif mt-1 text-3xl font-semibold">{new Set(data.rows.map((r: any) => r.teacherName)).size}</p><p className="aia-text-muted text-xs">涉及教师</p></div></div>
      <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="border-y aia-border-rule aia-text-muted"><tr><th className="py-3 pr-4 font-medium">年度</th><th className="py-3 pr-4 font-medium">教师</th><th className="py-3 pr-4 font-medium">类别</th><th className="py-3 pr-4 font-medium">荣誉 / 专业服务</th><th className="py-3 pr-4 font-medium">机构</th><th className="py-3 font-medium">状态</th></tr></thead><tbody className="divide-y divide-[hsl(var(--aia-rule))]">{data.rows.map((row: any) => <tr key={row.id}><td className="py-3 pr-4">{row.reportingYear}</td><td className="py-3 pr-4 font-medium">{row.teacherName}</td><td className="py-3 pr-4">{row.categoryLabel}</td><td className="py-3 pr-4">{row.name}</td><td className="py-3 pr-4">{row.organization}</td><td className="py-3">{getTeacherRecognitionStatusLabel(row.reviewStatus)}</td></tr>)}</tbody></table>{data.rows.length === 0 ? <p className="aia-text-muted py-8 text-center text-sm">没有符合条件的记录。</p> : null}</div>
    </>}
  </div>
}
