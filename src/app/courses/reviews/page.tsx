"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAllCourseReviews, useCreateCourseReview, useVoteCourseReview } from "@/lib/api"
import { ContentVoteButtons } from "@/components/content-vote-buttons"
import { Star, Plus, Search } from "lucide-react"

export default function CourseReviewsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const allReviews = useAllCourseReviews({ status: "approved" }) || []
  const voteReview = useVoteCourseReview()
  const [mode, setMode] = React.useState("latest") // latest | top
  const [query, setQuery] = React.useState("")
  const [selectedInstructor, setSelectedInstructor] = React.useState<string | "">("")
  const [selectedTag, setSelectedTag] = React.useState<string | "">("")

  // extract tag list from reviews (#tag)
  const tags = React.useMemo(() => {
    const s = new Set<string>()
    const tagRe = /#([a-zA-Z0-9_-]+)/g
    for (const r of allReviews) {
      const m = String(r.content).matchAll(tagRe)
      for (const it of m) s.add(it[1])
    }
    return Array.from(s)
  }, [allReviews])

  const instructors = React.useMemo(() => {
    const s = new Set<string>()
    for (const r of allReviews) if (r.instructor) s.add(r.instructor)
    return Array.from(s)
  }, [allReviews])

  const filtered = React.useMemo(() => {
    let list = [...allReviews]
    if (mode === "latest") {
      list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
    } else if (mode === "top") {
      list.sort((a: any, b: any) => (b.overallRating || 0) - (a.overallRating || 0))
    } else if (mode === "score-desc") {
      list.sort((a: any, b: any) => (b.voteScore || 0) - (a.voteScore || 0))
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((r: any) => {
        return (
          (r.content || "").toLowerCase().includes(q) ||
          (r.courseName || "").toLowerCase().includes(q) ||
          (r.instructor || "").toLowerCase().includes(q)
        )
      })
    }

    if (selectedInstructor) {
      list = list.filter((r: any) => r.instructor === selectedInstructor)
    }

    if (selectedTag) {
      const tag = `#${selectedTag}`
      list = list.filter((r: any) => (r.content || "").includes(tag))
    }

    return list
  }, [allReviews, mode, query, selectedInstructor, selectedTag])

  const handleVoteReview = async (reviewId: string, value?: 1 | -1) => {
    await voteReview({ id: reviewId, value })
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white border-b">
        <div className="container-custom py-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">课程测评</h1>
            <p className="text-sm text-slate-600">默认显示最新/热门评测。可搜索、按教师筛选或按标签过滤，也可发布新评测。</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
                <DialogTrigger asChild>
                <Button variant="default" size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> 发布评测
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>发布课程测评</DialogTitle>
                </DialogHeader>
                <CreateReviewForm />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <Input className="pl-10" placeholder="搜索课程名、教师或评测内容" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div>
            <select className="h-9 rounded-md border px-2" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="latest">最新</option>
              <option value="top">评分最高</option>
              <option value="score-desc">点赞数</option>
            </select>
          </div>
          <div>
            <select className="h-9 rounded-md border px-2" value={selectedInstructor} onChange={(e) => setSelectedInstructor(e.target.value)}>
              <option value="">全部教师</option>
              {instructors.map((ins) => <option key={ins} value={ins}>{ins}</option>)}
            </select>
          </div>
          <div>
            <select className="h-9 rounded-md border px-2" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="">全部标签</option>
              {tags.map((t) => <option key={t} value={t}>#{t}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-slate-600">当前暂无符合条件的评测。</p>
          ) : (
            filtered.map((r: any) => (
              <Card key={r._id} className="border">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-extrabold">{r.courseName} · {r.instructor}</div>
                      <div className="text-sm text-slate-600">评分: {r.overallRating} · {new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Star className="h-4 w-4 text-amber-500" /> {r.overallRating}
                      </div>
                      <ContentVoteButtons
                        likes={r.likes}
                        dislikes={r.dislikes}
                        currentUserVote={r.currentUserVote}
                        disabled={!isAuthenticated || isLoading}
                        onVote={(value) => handleVoteReview(r._id, value)}
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: (r.content || "").slice(0, 1000).replace(/\n/g, "<br />") }} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function CreateReviewForm() {
  const { isAuthenticated, currentUser } = useAuth()
  const create = useCreateCourseReview()
  const [courseName, setCourseName] = React.useState("")
  const [instructor, setInstructor] = React.useState("")
  const [semesterYear, setSemesterYear] = React.useState(new Date().getFullYear())
  const [semesterTerm, setSemesterTerm] = React.useState<"spring" | "fall">("fall")
  const [overallRating, setOverallRating] = React.useState(8)
  const [content, setContent] = React.useState("")
  const [error, setError] = React.useState("")

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError("")
    if (!isAuthenticated) {
      setError("请先登录后再发布评测。")
      return
    }
    if (!currentUser) {
      setError("登录状态正在加载，请稍后再试。")
      return
    }
    if (!courseName || !instructor || !content) {
      setError("请填写课程、教师和评测内容。")
      return
    }

    try {
      await create({
        courseName,
        instructor,
        semesterYear,
        semesterTerm,
        overallRating,
        content,
        isAnonymous: false,
        authorId: currentUser._id as any,
      } as any)
      // simple success behavior: reload page
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div>
        <Label>课程名称</Label>
        <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} />
      </div>
      <div>
        <Label>教师</Label>
        <Input value={instructor} onChange={(e) => setInstructor(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>学年</Label>
          <Input type="number" value={String(semesterYear)} onChange={(e) => setSemesterYear(Number(e.target.value))} />
        </div>
        <div>
          <Label>学期</Label>
          <select className="h-9 rounded-md border px-2 w-full" value={semesterTerm} onChange={(e) => setSemesterTerm(e.target.value as any)}>
            <option value="fall">秋季</option>
            <option value="spring">春季</option>
          </select>
        </div>
      </div>
      <div>
        <Label>总体评分 (1-10)</Label>
        <Input type="number" min={1} max={10} value={String(overallRating)} onChange={(e) => setOverallRating(Number(e.target.value))} />
      </div>
      <div>
        <Label>评测正文（支持 Markdown）</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">取消</Button>
        </DialogClose>
        <Button type="submit">提交评测</Button>
      </div>
    </form>
  )
}
