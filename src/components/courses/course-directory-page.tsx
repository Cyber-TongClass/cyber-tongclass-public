"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, Search, MessageSquare, Plus, ChevronRight, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/hooks/use-auth"
import { useCourses, useCreateCourse } from "@/lib/api"
import type { Course } from "@/types"

export default function CourseDirectoryPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState("rating")
  const [sortOrder, setSortOrder] = React.useState<"desc"|"asc">("desc")

  // Fetch courses from Convex
  const coursesData = useCourses()
  const courses: Course[] = coursesData || []

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createError, setCreateError] = React.useState("")
  const [courseName, setCourseName] = React.useState("")

  const createCourse = useCreateCourse()

  const resetForm = () => {
    setCourseName("")
    setCreateError("")
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError("")

    if (!isAuthenticated) {
      setCreateError("Please sign in before creating a course.")
      return
    }

    try {
      await createCourse({
        name: courseName,
      })
      setCreateOpen(false)
      resetForm()
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "创建课程失败")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  const filteredCourses = courses
    .filter((course) => course.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const desc = sortOrder === "desc" ? -1 : 1
      if (sortBy === "rating") {
        if (b.averageRating !== a.averageRating) return (b.averageRating - a.averageRating) * desc
        return a.createdAt - b.createdAt
      }
      if (sortBy === "reviews") {
        if (b.reviewCount !== a.reviewCount) return (b.reviewCount - a.reviewCount) * desc
        return a.createdAt - b.createdAt
      }
      return a.name.localeCompare(b.name, "zh-CN") * desc
    })

  const tongClassCourses = filteredCourses.filter((course) => course.isTongClassCourse)
  const otherCourses = filteredCourses.filter((course) => !course.isTongClassCourse)

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">COURSES</div>
          <div className="mb-4 relative">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">课程测评</h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative">通班内部的课程测评系统，汇集了历年来同学们的课程评价与反馈。欢迎同学们积极分享自己的课程体验，提交测评或按要求创建课程，但请不要将此网页内的内部资源分享到公开渠道哦～</p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white sticky top-16 z-40">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <Input
                type="search"
                placeholder="搜索课程名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">按评分</SelectItem>
                <SelectItem value="reviews">按评测数量</SelectItem>
                <SelectItem value="name">按名称</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")} title={sortOrder === "desc" ? "降序" : "升序"}>
              <ArrowUpDown className="h-4 w-4" />
            </Button>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              {isAuthenticated ? (
                <DialogTrigger asChild>
                  <Button className="md:ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    添加课程
                  </Button>
                </DialogTrigger>
              ) : (
                <Button asChild className="md:ml-auto">
                  <Link href={`/login?next=${encodeURIComponent("/courses")}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加课程
                  </Link>
                </Button>
              )}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加课程</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleCreateCourse}>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    同学们可以且仅可补充通班培养方案以外的课程。请务必认真、如实填写，仅添加北京大学真实开设的课程；如存在不准确、不恰当或不符合要求的内容，管理员保留修改或删除的权利。
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-name">课程名称</Label>
                    <Input id="course-name" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
                  </div>
                  <p className="text-sm text-slate-600">课程创建后，任意成员可在课程详情页补充不同教师、不同学期的具体评测。</p>
                  {createError && <p className="text-sm text-red-600">{createError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>
                      取消
                    </Button>
                    <Button type="submit">创建</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">未找到相关课程</h3>
            <p className="text-slate-600">可点击“添加课程”创建后再发布评测</p>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">通班培养方案课程</h2>
                  <p className="text-sm text-slate-600 mt-1">通班核心课程仅由管理员维护，包含专业基础课、专业核心课、专业选修课、公共必修课等。</p>
                </div>
                <span className="text-sm text-slate-600">{tongClassCourses.length} 门</span>
              </div>

              {tongClassCourses.length === 0 ? (
                <Card className="border-dashed border-slate-200/70 bg-slate-100/20">
                  <CardContent className="py-8 text-sm text-slate-600">
                    当前没有匹配的通班培养方案课程。
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {tongClassCourses.map((course) => (
                    <CourseListCard key={course._id} course={course} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">其他课程</h2>
                  <p className="text-sm text-slate-600 mt-1">用户可自行补充和讨论的其他课程。</p>
                </div>
                <span className="text-sm text-slate-600">{otherCourses.length} 门</span>
              </div>

              {otherCourses.length === 0 ? (
                <Card className="border-dashed border-slate-200/70 bg-slate-100/20">
                  <CardContent className="py-8 text-sm text-slate-600">
                    当前没有匹配的其他课程。
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {otherCourses.map((course) => (
                    <CourseListCard key={course._id} course={course} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  )
}

function CourseListCard({ course }: { course: Course }) {
  const r = course.averageRating ?? 0
  const colorClass = r === 0 ? "bg-slate-300" : r >= 8 ? "bg-green-600" : r >= 6 ? "bg-amber-500" : "bg-red-500"

  return (
    <Link href={`/courses/${encodeURIComponent(course.name)}`} className="block h-full">
      <Card className="group h-full border-0 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer">
        <CardContent className="flex items-center gap-4 px-4 py-3">
          <div className={`w-10 h-10 shrink-0 rounded flex items-center justify-center text-white font-extrabold text-lg ${colorClass}`}>
            {r.toFixed(1)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-slate-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {course.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {course.reviewCount} 条评测
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
        </CardContent>
      </Card>
    </Link>
  )
}
