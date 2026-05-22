"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, MessageSquare, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ContentVoteButtons } from "@/components/content-vote-buttons"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  FIVE_POINT_HINTS,
  FIVE_POINT_OPTIONS,
  getCourseReviewYearOptions,
  getFivePointLabel,
  getRatingBadgeClass,
  getSemesterLabel,
  getSemesterShortLabel,
  SEMESTER_TERM_OPTIONS,
  STUDY_METHOD_OPTIONS,
} from "@/lib/course-review"
import {
  useCourseByName,
  useCourseReviews,
  useCourses,
  useCreateCourseReview,
  useDeleteCourseReview,
  useUpdateCourseReview,
  useUsers,
  useVoteCourseReview,
} from "@/lib/api"
import type { Course, CourseReview } from "@/types"

const MarkdownRenderer = dynamic(
  () => import("@/components/markdown/markdown-renderer").then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => <p className="text-sm text-slate-600">内容加载中...</p>,
  }
)

const MarkdownSplitEditor = dynamic(
  () => import("@/components/markdown/markdown-split-editor").then((mod) => mod.MarkdownSplitEditor),
  {
    ssr: false,
    loading: () => <p className="text-sm text-slate-600">编辑器加载中...</p>,
  }
)

type ReviewFormState = {
  instructor: string
  semesterYear: string
  semesterTerm: CourseReview["semesterTerm"]
  overallRating: number
  department: string
  attendanceRequired: "unknown" | "yes" | "no"
  workload: string
  pace: string
  gradingFairness: string
  courseAverageScore: string
  personalScore: string
  recommendedStudyMethod: "" | NonNullable<CourseReview["recommendedStudyMethod"]>
  content: string
  isAnonymous: boolean
}

const REVIEW_SORT_OPTIONS = [
  { value: "newest", label: "最新" },
  { value: "rating", label: "评分" },
  { value: "score-desc", label: "点赞数" },
] as const

function getStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => index < Math.round(rating / 2))
}

function decodeRouteName(raw: string) {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function normalizeCourseName(name: string) {
  return name.replace(/\s+/g, "").toLowerCase()
}

function createEmptyForm(currentYear: number): ReviewFormState {
  return {
    instructor: "",
    semesterYear: String(currentYear),
    semesterTerm: "spring",
    overallRating: 8,
    department: "",
    attendanceRequired: "unknown",
    workload: "",
    pace: "",
    gradingFairness: "",
    courseAverageScore: "",
    personalScore: "",
    recommendedStudyMethod: "",
    content: "",
    isAnonymous: false,
  }
}

function reviewToForm(review: CourseReview): ReviewFormState {
  return {
    instructor: review.instructor,
    semesterYear: String(review.semesterYear),
    semesterTerm: review.semesterTerm,
    overallRating: review.overallRating,
    department: review.department ?? "",
    attendanceRequired:
      review.attendanceRequired === undefined ? "unknown" : review.attendanceRequired ? "yes" : "no",
    workload: review.workload ? String(review.workload) : "",
    pace: review.pace ? String(review.pace) : "",
    gradingFairness: review.gradingFairness ? String(review.gradingFairness) : "",
    courseAverageScore: review.courseAverageScore !== undefined ? String(review.courseAverageScore) : "",
    personalScore: review.personalScore !== undefined ? String(review.personalScore) : "",
    recommendedStudyMethod: review.recommendedStudyMethod ?? "",
    content: review.content,
    isAnonymous: review.isAnonymous,
  }
}

function buildReviewPayload(form: ReviewFormState) {
  const toOptionalNumber = (value: string, { min, max }: { min?: number; max?: number } = {}) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) throw new Error("请填写有效数字")
    if (min !== undefined && parsed < min) throw new Error(`数值不能小于 ${min}`)
    if (max !== undefined && parsed > max) throw new Error(`数值不能大于 ${max}`)
    return parsed
  }

  const semesterYear = Number(form.semesterYear)
  if (Number.isNaN(semesterYear)) {
    throw new Error("请选择有效的年份")
  }

  return {
    instructor: form.instructor.trim(),
    semesterYear,
    semesterTerm: form.semesterTerm,
    overallRating: form.overallRating,
    department: form.department.trim() || undefined,
    attendanceRequired:
      form.attendanceRequired === "unknown" ? undefined : form.attendanceRequired === "yes",
    workload: toOptionalNumber(form.workload, { min: 1, max: 5 }),
    pace: toOptionalNumber(form.pace, { min: 1, max: 5 }),
    gradingFairness: toOptionalNumber(form.gradingFairness, { min: 1, max: 5 }),
    courseAverageScore: toOptionalNumber(form.courseAverageScore),
    personalScore: toOptionalNumber(form.personalScore),
    recommendedStudyMethod: form.recommendedStudyMethod || undefined,
    content: form.content.trim(),
    isAnonymous: form.isAnonymous,
  }
}

export default function CourseDetailPage() {
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth()
  const params = useParams<{ name: string | string[] }>()
  const rawRouteName = Array.isArray(params.name) ? (params.name[0] ?? "") : (params.name ?? "")
  const courseName = React.useMemo(() => decodeRouteName(rawRouteName), [rawRouteName])

  const currentYear = new Date().getFullYear()
  const yearOptions = React.useMemo(() => getCourseReviewYearOptions(2020, currentYear), [currentYear])

  const [sortBy, setSortBy] = React.useState<(typeof REVIEW_SORT_OPTIONS)[number]["value"]>("newest")
  const [teacherFilter, setTeacherFilter] = React.useState("all")
  const [yearFilter, setYearFilter] = React.useState("all")
  const [termFilter, setTermFilter] = React.useState<"all" | CourseReview["semesterTerm"]>("all")
  const [formError, setFormError] = React.useState("")
  const [submissionMessage, setSubmissionMessage] = React.useState("")
  const [showForm, setShowForm] = React.useState(false)
  const [editingReviewId, setEditingReviewId] = React.useState<string | null>(null)
  const [formState, setFormState] = React.useState<ReviewFormState>(() => createEmptyForm(currentYear))

  const coursesData = useCourses()
  const courses: Course[] = React.useMemo(() => (coursesData || []) as Course[], [coursesData])
  const usersData = useUsers({ limit: 1000 })
  const courseData = useCourseByName(courseName)
  const fallbackCourse = React.useMemo(() => {
    const target = normalizeCourseName(courseName)
    if (!target || courses.length === 0) return null

    return (
      courses.find((item) => {
        const current = normalizeCourseName(item.name)
        return current === target || current.includes(target) || target.includes(current)
      }) || null
    )
  }, [courseName, courses])
  const course: Course | null = courseData || fallbackCourse || null
  const reviewsData = useCourseReviews(course?.name || courseName)
  const reviews = React.useMemo(() => (reviewsData || []) as unknown as CourseReview[], [reviewsData])
  const usersById = React.useMemo(() => {
    const entries = (usersData || []).map((user) => [String(user._id), user] as const)
    return new Map(entries)
  }, [usersData])

  const createReview = useCreateCourseReview()
  const updateReview = useUpdateCourseReview()
  const deleteReview = useDeleteCourseReview()
  const voteReview = useVoteCourseReview()

  const userReview = React.useMemo(() => {
    if (!currentUser) return null
    return reviews.find((review) => review.authorId === currentUser._id) || null
  }, [reviews, currentUser])

  const teacherOptions = React.useMemo(
    () => Array.from(new Set(reviews.map((review) => review.instructor))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [reviews]
  )

  const yearFilterOptions = React.useMemo(
    () => Array.from(new Set(reviews.map((review) => review.semesterYear))).sort((a, b) => b - a),
    [reviews]
  )

  const filteredReviews = React.useMemo(() => {
    return reviews.filter((review) => {
      if (teacherFilter !== "all" && review.instructor !== teacherFilter) return false
      if (yearFilter !== "all" && review.semesterYear !== Number(yearFilter)) return false
      if (termFilter !== "all" && review.semesterTerm !== termFilter) return false
      return true
    })
  }, [reviews, teacherFilter, yearFilter, termFilter])

  const sortedReviews = React.useMemo(() => {
    return [...filteredReviews].sort((a, b) => {
      if (sortBy === "rating") return b.overallRating - a.overallRating
      if (sortBy === "score-desc") return (b.voteScore || 0) - (a.voteScore || 0)
      return b.createdAt - a.createdAt
    })
  }, [filteredReviews, sortBy])

  const startCreate = () => {
    setEditingReviewId(null)
    setFormState(createEmptyForm(currentYear))
    setFormError("")
    setSubmissionMessage("")
    setShowForm(true)
  }

  const startEdit = (review: CourseReview) => {
    setEditingReviewId(review._id)
    setFormState(reviewToForm(review))
    setFormError("")
    setSubmissionMessage("")
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingReviewId(null)
    setFormState(createEmptyForm(currentYear))
    setFormError("")
  }

  const handleSubmitReview = async () => {
    setFormError("")
    setSubmissionMessage("")

    if (!course || !currentUser) {
      setFormError("登录状态正在加载，请稍后再试。")
      return
    }

    try {
      const payload = buildReviewPayload(formState)
      if (!payload.instructor || !payload.content) {
        setFormError("请填写教师、学期、总体评价和评测正文。")
        return
      }

      if (editingReviewId) {
        await updateReview({
          id: editingReviewId as any,
          ...payload,
        })
        closeForm()
        return
      }

      await createReview({
        courseName: course.name,
        ...payload,
        authorId: currentUser._id as any,
      })

      closeForm()
      setSubmissionMessage("评测已发布，感谢您对通班可持续发展的贡献！")
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "提交评测失败")
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReview({ id: reviewId as any })
      if (editingReviewId === reviewId) {
        closeForm()
      }
    } catch (error) {
      console.error("Failed to delete review:", error)
    }
  }

  const handleVoteReview = async (reviewId: string, value?: 1 | -1) => {
    await voteReview({ id: reviewId, value })
  }

  const reviewAuthor = (review: CourseReview) => {
    if (review.isAnonymous) return "匿名"
    if (review.authorId && review.authorId === currentUser?._id) return "我"
    const author = review.authorId ? usersById.get(String(review.authorId)) : null
    return author?.chineseName || author?.englishName || "用户"
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>课程测评需登录后访问</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">请先登录后再查看课程测评与发帖。</p>
            <Button asChild className="w-full">
              <Link href={`/login?next=${encodeURIComponent(`/courses/${encodeURIComponent(courseName)}`)}`}>
                前往登录
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">课程不存在</h2>
          <p className="text-slate-600 mb-4">该课程可能已被删除或不存在</p>
          <Link href="/courses">
            <Button>返回课程列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <Button variant="ghost" asChild className="mb-6 -ml-3">
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回课程列表
          </Link>
        </Button>

        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">{course.name}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                同一门课程不同教师、不同学期的体验可能差异很大。建议先按教师或学期筛选，再结合结构化指标和长评测综合判断。
              </p>
            </div>
            {userReview ? (
              <Button variant="outline" onClick={() => startEdit(userReview)}>
                <Pencil className="h-4 w-4 mr-2" />
                修改我的评测
              </Button>
            ) : (
              <Button onClick={startCreate}>
                <Plus className="h-4 w-4 mr-2" />
                撰写评测
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {getStars(course.averageRating).map((filled, index) => (
                      <Star key={index} className={filled ? "h-5 w-5 fill-amber-500 text-amber-500" : "h-5 w-5 text-muted"} />
                    ))}
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold">{course.averageRating.toFixed(1)}</p>
                    <p className="text-sm text-slate-600">总体评价均分（1-10）</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{course.reviewCount}</p>
                <p className="text-sm text-slate-600">已通过审核的评测数量</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{teacherOptions.length}</p>
                <p className="text-sm text-slate-600">已收录教师数量</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {submissionMessage && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6 text-sm text-green-800">{submissionMessage}</CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingReviewId ? "修改评测" : "撰写评测"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="review-instructor">开课教师</Label>
                  <Input
                    id="review-instructor"
                    value={formState.instructor}
                    onChange={(event) => setFormState((previous) => ({ ...previous, instructor: event.target.value }))}
                    placeholder="请填写老师全名，例如：朱松纯"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-department">开课院系</Label>
                  <Input
                    id="review-department"
                    value={formState.department}
                    onChange={(event) => setFormState((previous) => ({ ...previous, department: event.target.value }))}
                    placeholder="选填，例如：人工智能研究院"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>选课学期</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formState.semesterYear}
                      onValueChange={(value) => setFormState((previous) => ({ ...previous, semesterYear: value }))}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="年份" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={formState.semesterTerm}
                      onValueChange={(value: CourseReview["semesterTerm"]) =>
                        setFormState((previous) => ({ ...previous, semesterTerm: value }))
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="学期" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEMESTER_TERM_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>总体评价（1-10，10 为非常推荐，1 为非常不推荐）</Label>
                  <div className="rounded-lg border border-slate-200/70 px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge className={getRatingBadgeClass(formState.overallRating)}>{formState.overallRating}/10</Badge>
                      <span className="text-sm text-slate-600">
                        {formState.overallRating >= 8 ? "非常推荐" : formState.overallRating >= 6 ? "可以考虑" : "谨慎选择"}
                      </span>
                    </div>
                    <Slider
                      value={formState.overallRating}
                      onChange={(value) => setFormState((previous) => ({ ...previous, overallRating: value }))}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="attendance-required">是否签到</Label>
                  <select
                    id="attendance-required"
                    className="w-full h-10 rounded-md border border-input bg-white px-3"
                    value={formState.attendanceRequired}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        attendanceRequired: event.target.value as ReviewFormState["attendanceRequired"],
                      }))
                    }
                  >
                    <option value="unknown">暂不填写</option>
                    <option value="yes">是</option>
                    <option value="no">否</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workload">任务量</Label>
                  <select
                    id="workload"
                    className="w-full h-10 rounded-md border border-input bg-white px-3"
                    value={formState.workload}
                    onChange={(event) => setFormState((previous) => ({ ...previous, workload: event.target.value }))}
                  >
                    <option value="">暂不填写</option>
                    {FIVE_POINT_OPTIONS.workload.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600">{FIVE_POINT_HINTS.workload}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pace">授课进度</Label>
                  <select
                    id="pace"
                    className="w-full h-10 rounded-md border border-input bg-white px-3"
                    value={formState.pace}
                    onChange={(event) => setFormState((previous) => ({ ...previous, pace: event.target.value }))}
                  >
                    <option value="">暂不填写</option>
                    {FIVE_POINT_OPTIONS.pace.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600">{FIVE_POINT_HINTS.pace}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grading-fairness">给分情况</Label>
                  <select
                    id="grading-fairness"
                    className="w-full h-10 rounded-md border border-input bg-white px-3"
                    value={formState.gradingFairness}
                    onChange={(event) => setFormState((previous) => ({ ...previous, gradingFairness: event.target.value }))}
                  >
                    <option value="">暂不填写</option>
                    {FIVE_POINT_OPTIONS.gradingFairness.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600">{FIVE_POINT_HINTS.gradingFairness}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="course-average-score">课程平均分</Label>
                  <Input
                    id="course-average-score"
                    type="number"
                    value={formState.courseAverageScore}
                    onChange={(event) => setFormState((previous) => ({ ...previous, courseAverageScore: event.target.value }))}
                    placeholder="选填"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personal-score">本人得分</Label>
                  <Input
                    id="personal-score"
                    type="number"
                    value={formState.personalScore}
                    onChange={(event) => setFormState((previous) => ({ ...previous, personalScore: event.target.value }))}
                    placeholder="选填"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommended-study-method">推荐学习方法</Label>
                  <select
                    id="recommended-study-method"
                    className="w-full h-10 rounded-md border border-input bg-white px-3"
                    value={formState.recommendedStudyMethod}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        recommendedStudyMethod: event.target.value as ReviewFormState["recommendedStudyMethod"],
                      }))
                    }
                  >
                    <option value="">暂不填写</option>
                    {STUDY_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Markdown 长评测</Label>
                <p className="text-sm text-slate-600">
                  可自由写教学方式、学习方法、考试形式、选课建议、给学弟学妹的话等。
                </p>
                <MarkdownSplitEditor
                  id={editingReviewId ? "edit-review-content" : "new-review-content"}
                  value={formState.content}
                  onChange={(value) => setFormState((previous) => ({ ...previous, content: value }))}
                  placeholder="分享你的课程体验，支持 Markdown..."
                  minHeightClassName="min-h-[220px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="review-anonymous"
                  type="checkbox"
                  checked={formState.isAnonymous}
                  onChange={(event) => setFormState((previous) => ({ ...previous, isAnonymous: event.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="review-anonymous">匿名发布</Label>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-2">
                <Button onClick={handleSubmitReview}>{editingReviewId ? "保存修改" : "提交评测"}</Button>
                <Button variant="outline" onClick={closeForm}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">课程测评</h2>
            <p className="text-sm text-slate-600">支持按教师和学期筛选，方便查看不同开课版本的差异。</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-600">教师</p>
              <select
                className="h-10 rounded-md border border-input bg-white px-3"
                value={teacherFilter}
                onChange={(event) => setTeacherFilter(event.target.value)}
              >
                <option value="all">全部教师</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher} value={teacher}>
                    {teacher}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600">年份</p>
              <select
                className="h-10 rounded-md border border-input bg-white px-3"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
              >
                <option value="all">全部年份</option>
                {yearFilterOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600">学期</p>
              <select
                className="h-10 rounded-md border border-input bg-white px-3"
                value={termFilter}
                onChange={(event) => setTermFilter(event.target.value as typeof termFilter)}
              >
                <option value="all">全部学期</option>
                {SEMESTER_TERM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600">排序</p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {sortedReviews.length === 0 ? (
          <div className="py-12 text-center text-slate-600">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>当前筛选条件下还没有评测。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((review) => {
              const isOwnReview = currentUser && review.authorId === currentUser._id
              return (
                <Card key={review._id}>
                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-extrabold text-slate-900">{review.instructor}</span>
                          <Badge variant="outline">{getSemesterLabel(review.semesterYear, review.semesterTerm)}</Badge>
                          <Badge className={getRatingBadgeClass(review.overallRating)}>{review.overallRating}/10</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          {review.department && <Badge variant="secondary">{review.department}</Badge>}
                          {review.attendanceRequired !== undefined && (
                            <Badge variant="secondary">{review.attendanceRequired ? "需要签到" : "不签到"}</Badge>
                          )}
                          {review.workload !== undefined && (
                            <Badge variant="secondary">任务量：{getFivePointLabel("workload", review.workload)}</Badge>
                          )}
                          {review.pace !== undefined && (
                            <Badge variant="secondary">进度：{getFivePointLabel("pace", review.pace)}</Badge>
                          )}
                          {review.gradingFairness !== undefined && (
                            <Badge variant="secondary">给分情况：{getFivePointLabel("gradingFairness", review.gradingFairness)}</Badge>
                          )}
                          {review.courseAverageScore !== undefined && (
                            <Badge variant="secondary">课程均分 {review.courseAverageScore}</Badge>
                          )}
                          {review.personalScore !== undefined && (
                            <Badge variant="secondary">本人得分 {review.personalScore}</Badge>
                          )}
                          {review.recommendedStudyMethod && (
                            <Badge variant="secondary">
                              推荐学习方法{" "}
                              {STUDY_METHOD_OPTIONS.find((option) => option.value === review.recommendedStudyMethod)?.label}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <ContentVoteButtons
                          likes={review.likes}
                          dislikes={review.dislikes}
                          currentUserVote={review.currentUserVote}
                          onVote={(value) => handleVoteReview(review._id, value)}
                        />
                        {isOwnReview && (
                          <>
                            <Button variant="outline" size="icon" onClick={() => startEdit(review)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteReview(review._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <div className="text-sm text-slate-600">
                          {getSemesterShortLabel(review.semesterYear, review.semesterTerm)} · {reviewAuthor(review)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200/60 bg-slate-100/10 p-4">
                      <MarkdownRenderer content={review.content} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
