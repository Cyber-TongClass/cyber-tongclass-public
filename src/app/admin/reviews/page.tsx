"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import { MarkdownSplitEditor } from "@/components/markdown/markdown-split-editor"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Check, Eye, Filter, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react"
import {
  FIVE_POINT_HINTS,
  getCourseReviewYearOptions,
  getRatingBadgeClass,
  getSemesterLabel,
  SEMESTER_TERM_OPTIONS,
  STUDY_METHOD_OPTIONS,
} from "@/lib/course-review"
import {
  useAllCourseReviews,
  useApproveCourseReview,
  useCourses,
  useCreateCourse,
  useCreateCourseReview,
  useDeleteCourseReview,
  useDeleteCourse,
  useRejectCourseReview,
  useUpdateCourse,
  useAssignReviewsByTags,
  useCommonReviewTags,
  useEditReviewTag,
  useReviewTags,
  useSetReviewTagColor,
  useUpdateCourseReview,
  useUsers,
} from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import type { Course, CourseReview, User } from "@/types"

type ReviewFormState = {
  courseName: string
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
  status: CourseReview["status"]
  isAnonymous: boolean
}

const statusLabels: Record<CourseReview["status"], string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
}

const statusColors: Record<CourseReview["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

const TAG_PALETTE = [
  { bg: "#E8F5E9", text: "#1B5E20", border: "#C8E6C9" },
  { bg: "#E3F2FD", text: "#0D47A1", border: "#BBDEFB" },
  { bg: "#FFF3E0", text: "#E65100", border: "#FFE0B2" },
  { bg: "#F3E5F5", text: "#4A148C", border: "#E1BEE7" },
  { bg: "#E0F7FA", text: "#006064", border: "#B2EBF2" },
  { bg: "#FFFDE7", text: "#827717", border: "#FFF9C4" },
  { bg: "#FBE9E7", text: "#BF360C", border: "#FFCCBC" },
  { bg: "#ECEFF1", text: "#263238", border: "#CFD8DC" },
] as const

const hashTag = (tag: string) => {
  const bytes = new TextEncoder().encode(tag)
  let hash = 0
  for (const b of bytes) {
    hash = (hash * 31 + b) % 1_000_000
  }
  return hash
}

const getReadableTextColor = (hexColor: string) => {
  const hex = hexColor.replace("#", "")
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.6 ? "#1F2937" : "#FFFFFF"
}

function createEmptyReviewForm(currentYear: number, defaultCourseName = ""): ReviewFormState {
  return {
    courseName: defaultCourseName,
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
    status: "approved",
    isAnonymous: true,
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
    throw new Error("请选择有效年份")
  }

  const content = form.content.trim()
  if (!content) {
    throw new Error("请填写评价内容")
  }

  return {
    courseName: form.courseName,
    instructor: form.instructor.trim(),
    semesterYear,
    semesterTerm: form.semesterTerm,
    overallRating: form.overallRating,
    department: form.department.trim() || undefined,
    attendanceRequired: form.attendanceRequired === "unknown" ? undefined : form.attendanceRequired === "yes",
    workload: toOptionalNumber(form.workload, { min: 1, max: 5 }),
    pace: toOptionalNumber(form.pace, { min: 1, max: 5 }),
    gradingFairness: toOptionalNumber(form.gradingFairness, { min: 1, max: 5 }),
    courseAverageScore: toOptionalNumber(form.courseAverageScore),
    personalScore: toOptionalNumber(form.personalScore),
    recommendedStudyMethod: form.recommendedStudyMethod || undefined,
    content,
    status: form.status,
    isAnonymous: form.isAnonymous,
  }
}

export default function ReviewsPage() {
  const currentYear = new Date().getFullYear()
  const yearOptions = getCourseReviewYearOptions(2020, currentYear)
  const { isSuperAdmin } = useAuth()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [reviewSortBy, setReviewSortBy] = useState("latest")
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [manualAddError, setManualAddError] = useState("")
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [courseDialogMode, setCourseDialogMode] = useState<"create" | "edit">("create")
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [courseError, setCourseError] = useState("")
  const [courseName, setCourseName] = useState("")
  const [courseIsTongClass, setCourseIsTongClass] = useState(false)
  const [tagEditMode, setTagEditMode] = useState(false)
  const [tagEditValue, setTagEditValue] = useState("")
  const [assignTagsInput, setAssignTagsInput] = useState("")
  const [assignTargetCourse, setAssignTargetCourse] = useState<string | "">("")
  const [tagEditFrom, setTagEditFrom] = useState("")
  const [tagEditTo, setTagEditTo] = useState("")
  const [tagEditAction, setTagEditAction] = useState<"rename" | "delete" | "setColor">("setColor")
  const [tagEditColor, setTagEditColor] = useState("#2563EB")

  const coursesData = useCourses()
  const courses: Course[] = coursesData || []
  const tongClassCourses = courses.filter((course) => course.isTongClassCourse)
  const otherCourses = courses.filter((course) => !course.isTongClassCourse)
  const allReviewsData = useAllCourseReviews()
  const allReviews: CourseReview[] = allReviewsData || []
  const reviews = [...allReviews].sort((a, b) => b.createdAt - a.createdAt)
  const usersData = useUsers({ limit: 1000, skip: !isSuperAdmin })
  const usersById = useMemo(() => {
    const entries = ((usersData || []) as User[]).map((user) => [String(user._id), user] as const)
    return new Map(entries)
  }, [usersData])

  const createReview = useCreateCourseReview()
  const approveReview = useApproveCourseReview()
  const rejectReview = useRejectCourseReview()
  const deleteReview = useDeleteCourseReview()
  const deleteCourse = useDeleteCourse()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const assignByTags = useAssignReviewsByTags()
  const commonTagList = useCommonReviewTags() || []
  const reviewTags = useReviewTags() || []
  const editTag = useEditReviewTag()
  const setTagColor = useSetReviewTagColor()
  const updateReview = useUpdateCourseReview()

  const [reviewForm, setReviewForm] = useState<ReviewFormState>(() =>
    createEmptyReviewForm(currentYear, courses[0]?.name ?? "")
  )

  useEffect(() => {
    if (!reviewForm.courseName && courses.length > 0) {
      setReviewForm((previous) => ({ ...previous, courseName: courses[0].name }))
    }
  }, [courses, reviewForm.courseName])

  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState("")
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info")
  const toastTimer = useRef<number | null>(null)
  const showAdminToast = (type: "success" | "error" | "info", msg: string, duration = 2000) => {
    setToastType(type)
    setToastMsg(msg)
    setShowToast(true)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setShowToast(false), duration)
  }

  const getReviewAuthorName = (review: CourseReview) => {
    if (!isSuperAdmin) return "匿名"
    if (!review.authorId) return "无记录"
    const user = usersById.get(String(review.authorId))
    return user?.chineseName || user?.englishName || user?.username || String(review.authorId)
  }

  const filteredReviews = reviews.filter((review) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      review.courseName.toLowerCase().includes(query) ||
      review.instructor.toLowerCase().includes(query) ||
      review.content.toLowerCase().includes(query) ||
      (isSuperAdmin && getReviewAuthorName(review).toLowerCase().includes(query))
    const matchesStatus = !statusFilter || review.status === statusFilter
    return matchesSearch && matchesStatus
  })
  const sortedFilteredReviews = [...filteredReviews].sort((a, b) => {
    if (reviewSortBy === "score-desc") return (b.voteScore || 0) - (a.voteScore || 0)
    return b.createdAt - a.createdAt
  })

  const selectedReview = useMemo(
    () => reviews.find((review) => review._id === selectedReviewId) ?? null,
    [reviews, selectedReviewId]
  )

  const tagColorMap = useMemo(() => {
    return new Map(reviewTags.map((item: { name: string; color?: string }) => [item.name, item.color]))
  }, [reviewTags])

  const getHashedTagColor = (tag: string) => {
    return TAG_PALETTE[hashTag(tag) % TAG_PALETTE.length].bg
  }

  const tagChoices = useMemo(() => {
    if (reviewTags.length > 0) {
      return reviewTags
    }
    return commonTagList.map((name: string) => ({ name }))
  }, [reviewTags, commonTagList])

  const getTagStyle = (tag: string) => {
    const override = tagColorMap.get(tag)
    if (override) {
      return {
        backgroundColor: override,
        borderColor: override,
        color: getReadableTextColor(override),
      }
    }
    const palette = TAG_PALETTE[hashTag(tag) % TAG_PALETTE.length]
    return {
      backgroundColor: palette.bg,
      borderColor: palette.border,
      color: palette.text,
    }
  }

  useEffect(() => {
    setTagEditValue(selectedReview?.tags?.join(", ") || "")
    setTagEditMode(false)
  }, [selectedReview])

  useEffect(() => {
    if (!tagEditFrom.trim()) return
    const nextColor = tagColorMap.get(tagEditFrom)
    if (nextColor) {
      setTagEditColor(nextColor)
      return
    }
    setTagEditColor(getHashedTagColor(tagEditFrom))
  }, [tagEditFrom, tagColorMap])

  const resetManualForm = () => {
    setManualAddError("")
    setReviewForm(createEmptyReviewForm(currentYear, courses[0]?.name ?? ""))
  }

  const resetCourseForm = () => {
    setEditingCourseId(null)
    setCourseName("")
    setCourseIsTongClass(false)
    setCourseError("")
  }

  const openCreateCourseDialog = () => {
    setCourseDialogMode("create")
    resetCourseForm()
    setCourseDialogOpen(true)
  }

  const openEditCourseDialog = (course: Course) => {
    setCourseDialogMode("edit")
    setEditingCourseId(course._id)
    setCourseName(course.name)
    setCourseIsTongClass(!!course.isTongClassCourse)
    setCourseError("")
    setCourseDialogOpen(true)
  }

  const handleStatusChange = async (id: string, status: CourseReview["status"]) => {
    const label = status === "approved" ? "通过" : "拒绝"
    await confirm({
      title: `确认${label}评测`,
      description: `确定要${label}这条课程测评吗？`,
      confirmLabel: label,
      onConfirm: async () => {
        if (status === "approved") {
          await approveReview({ id: id as any })
        } else {
          await rejectReview({ id: id as any })
        }
      },
    })
  }

  const handleDelete = async (id: string, courseNameValue: string) => {
    await confirm({
      title: "确认删除评测",
      description: `将删除课程「${courseNameValue}」的一条评测记录，此操作不可撤销。`,
      confirmLabel: "删除",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteReview({ id: id as any })
          if (selectedReviewId === id) {
            setSelectedReviewId(null)
          }
          showAdminToast("success", "评测已删除")
        } catch (error) {
          showAdminToast("error", `删除失败：${error instanceof Error ? error.message : String(error)}`)
          throw error
        }
      },
    })
  }

  const handleManualAddReview = async (event: React.FormEvent) => {
    event.preventDefault()
    setManualAddError("")

    try {
      const payload = buildReviewPayload(reviewForm)
      if (!payload.courseName || !payload.instructor || !payload.content) {
        setManualAddError("请填写课程、教师、学期、总体评价和评测正文。")
        return
      }

      await createReview(payload)
      setManualAddOpen(false)
      resetManualForm()
    } catch (error) {
      setManualAddError(error instanceof Error ? error.message : "添加评测失败")
    }
  }

  const handleSaveCourse = async (event: React.FormEvent) => {
    event.preventDefault()
    setCourseError("")

    try {
      if (courseDialogMode === "create") {
        await createCourse({
          name: courseName,
          isTongClassCourse: courseIsTongClass,
        })
      } else if (editingCourseId) {
        await updateCourse({
          id: editingCourseId as any,
          name: courseName,
          isTongClassCourse: courseIsTongClass,
        })
      }

      setCourseDialogOpen(false)
      resetCourseForm()
    } catch (error) {
      setCourseError(error instanceof Error ? error.message : "保存课程失败")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">课程测评</h1>
          <p className="mt-1 text-gray-500">管理课程目录与课程测评内容</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                导入数据
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>导入课程测评数据</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">点击或拖拽文件到此处上传</p>
                  <p className="mt-1 text-xs text-gray-400">支持 CSV, Excel 格式</p>
                </div>
                <Button className="w-full" disabled>
                  选择文件
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={manualAddOpen}
            onOpenChange={(open) => {
              setManualAddOpen(open)
              if (!open) resetManualForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-blue-900 hover:bg-blue-800">
                <Plus className="mr-2 h-4 w-4" />
                手动添加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>手动添加课程测评</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleManualAddReview}>
                <div className="space-y-2">
                  <Label htmlFor="manual-course">课程</Label>
                  <select
                    id="manual-course"
                    className="h-10 w-full rounded-md border border-input bg-white px-3"
                    value={reviewForm.courseName}
                    onChange={(event) =>
                      setReviewForm((previous) => ({ ...previous, courseName: event.target.value }))
                    }
                  >
                    {courses.map((course) => (
                      <option key={course._id} value={course.name}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manual-instructor">开课教师</Label>
                    <Input
                      id="manual-instructor"
                      value={reviewForm.instructor}
                      onChange={(event) =>
                        setReviewForm((previous) => ({ ...previous, instructor: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-department">开课院系</Label>
                    <Input
                      id="manual-department"
                      value={reviewForm.department}
                      onChange={(event) =>
                        setReviewForm((previous) => ({ ...previous, department: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>年份</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-white px-3"
                      value={reviewForm.semesterYear}
                      onChange={(event) =>
                        setReviewForm((previous) => ({ ...previous, semesterYear: event.target.value }))
                      }
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={String(year)}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>学期</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-white px-3"
                      value={reviewForm.semesterTerm}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
                          ...previous,
                          semesterTerm: event.target.value as CourseReview["semesterTerm"],
                        }))
                      }
                    >
                      {SEMESTER_TERM_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-status">状态</Label>
                    <select
                      id="manual-status"
                      className="h-10 w-full rounded-md border border-input bg-white px-3"
                      value={reviewForm.status}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
                          ...previous,
                          status: event.target.value as CourseReview["status"],
                        }))
                      }
                    >
                      <option value="pending">待审核</option>
                      <option value="approved">已通过</option>
                      <option value="rejected">已拒绝</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>总体评价（1-10，10 为非常推荐）</Label>
                  <div className="rounded-lg border border-slate-200/70 px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge className={getRatingBadgeClass(reviewForm.overallRating)}>{reviewForm.overallRating}/10</Badge>
                      <span className="text-sm text-slate-600">
                        {reviewForm.overallRating >= 8 ? "非常推荐" : reviewForm.overallRating >= 6 ? "可以考虑" : "谨慎选择"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={reviewForm.overallRating}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
                          ...previous,
                          overallRating: Number(event.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-attendance">是否签到</Label>
                    <select
                      id="manual-attendance"
                      className="h-10 w-full rounded-md border border-input bg-white px-3"
                      value={reviewForm.attendanceRequired}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
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
                    <Label htmlFor="manual-workload">任务量</Label>
                    <Input
                      id="manual-workload"
                      type="number"
                      min={1}
                      max={5}
                      value={reviewForm.workload}
                      onChange={(event) =>
                        setReviewForm((previous) => ({ ...previous, workload: event.target.value }))
                      }
                      placeholder="1-5"
                    />
                    <p className="text-xs text-slate-600">{FIVE_POINT_HINTS.workload}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-pace">授课进度</Label>
                    <Input
                      id="manual-pace"
                      type="number"
                      min={1}
                      max={5}
                      value={reviewForm.pace}
                      onChange={(event) => setReviewForm((previous) => ({ ...previous, pace: event.target.value }))}
                      placeholder="1-5"
                    />
                    <p className="text-xs text-slate-600">{FIVE_POINT_HINTS.pace}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-grading">给分情况</Label>
                    <Input
                      id="manual-grading"
                      type="number"
                      min={1}
                      max={5}
                      value={reviewForm.gradingFairness}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
                          ...previous,
                          gradingFairness: event.target.value,
                        }))
                      }
                      placeholder="1-5"
                    />
                    <p className="text-xs text-slate-600">{FIVE_POINT_HINTS.gradingFairness}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="manual-course-average">课程平均分</Label>
                    <Input
                      id="manual-course-average"
                      type="number"
                      value={reviewForm.courseAverageScore}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
                          ...previous,
                          courseAverageScore: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-personal-score">本人得分</Label>
                    <Input
                      id="manual-personal-score"
                      type="number"
                      value={reviewForm.personalScore}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
                          ...previous,
                          personalScore: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-study-method">推荐学习方法</Label>
                    <select
                      id="manual-study-method"
                      className="h-10 w-full rounded-md border border-input bg-white px-3"
                      value={reviewForm.recommendedStudyMethod}
                      onChange={(event) =>
                        setReviewForm((previous) => ({
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
                  <Label htmlFor="manual-content">Markdown 长评测</Label>
                  <MarkdownSplitEditor
                    id="manual-content"
                    value={reviewForm.content}
                    onChange={(value) =>
                      setReviewForm((previous) => ({ ...previous, content: value }))
                    }
                    placeholder="可写教学方式、学习方法、考试形式、给学弟学妹的建议等..."
                    minHeightClassName="min-h-[220px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="manual-anonymous"
                    type="checkbox"
                    checked={reviewForm.isAnonymous}
                    onChange={(event) =>
                      setReviewForm((previous) => ({ ...previous, isAnonymous: event.target.checked }))
                    }
                  />
                  <Label htmlFor="manual-anonymous">匿名发布</Label>
                </div>

                {manualAddError && <p className="text-sm text-red-600">{manualAddError}</p>}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setManualAddOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">保存</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待审核</p>
                <p className="text-2xl font-extrabold text-yellow-600">
                  {reviews.filter((review) => review.status === "pending").length}
                </p>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800">需处理</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已通过</p>
                <p className="text-2xl font-bold text-green-600">
                  {reviews.filter((review) => review.status === "approved").length}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">总计</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">课程总数</p>
                <p className="text-2xl font-bold text-blue-600">{courses.length}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">课程</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">课程信息管理</CardTitle>
          <Button size="sm" onClick={openCreateCourseDialog}>
            <Plus className="mr-1 h-4 w-4" />
            添加课程
          </Button>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">通班培养方案课程</h3>
                <p className="text-sm text-gray-500 mt-1">由管理员维护的培养方案课程列表。</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">{tongClassCourses.length} 门</Badge>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>课程名称</TableHead>
                    <TableHead>评测数</TableHead>
                    <TableHead>平均分</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tongClassCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                        暂无通班培养方案课程
                      </TableCell>
                    </TableRow>
                  ) : (
                    tongClassCourses.map((course) => (
                      <TableRow key={course._id}>
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell>{course.reviewCount}</TableCell>
                        <TableCell>{course.averageRating.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditCourseDialog(course)}>
                              <Pencil className="mr-1 h-4 w-4" />
                              编辑
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                confirm({
                                  title: "确认删除课程",
                                  description: `你确定要删除“${course.name}”这门课程吗？删除后，该课程及其全部关联评测将从后台和课程测评页面中移除，且无法恢复。`,
                                  confirmLabel: "确定删除",
                                  variant: "danger",
                                  onConfirm: async () => {
                                    try {
                                      await deleteCourse({ id: course._id as any })
                                      showAdminToast("success", `已删除课程：${course.name}`)
                                    } catch (err) {
                                      showAdminToast("error", `删除失败：${err instanceof Error ? err.message : String(err)}`)
                                    }
                                  },
                                })
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">其他课程</h3>
                <p className="text-sm text-gray-500 mt-1">由成员补充、可供讨论和评测的其他课程。</p>
              </div>
              <Badge className="bg-slate-100 text-slate-700">{otherCourses.length} 门</Badge>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>课程名称</TableHead>
                    <TableHead>评测数</TableHead>
                    <TableHead>平均分</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                        暂无其他课程
                      </TableCell>
                    </TableRow>
                  ) : (
                    otherCourses.map((course) => (
                      <TableRow key={course._id}>
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell>{course.reviewCount}</TableCell>
                        <TableCell>{course.averageRating.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditCourseDialog(course)}>
                              <Pencil className="mr-1 h-4 w-4" />
                              编辑
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                confirm({
                                  title: "确认删除课程",
                                  description: `你确定要删除“${course.name}”这门课程吗？删除后，该课程及其全部关联评测将从后台和课程测评页面中移除，且无法恢复。`,
                                  confirmLabel: "确定删除",
                                  variant: "danger",
                                  onConfirm: async () => {
                                    try {
                                      await deleteCourse({ id: course._id as any })
                                      showAdminToast("success", `已删除课程：${course.name}`)
                                    } catch (err) {
                                      showAdminToast("error", `删除失败：${err instanceof Error ? err.message : String(err)}`)
                                    }
                                  },
                                })
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{courseDialogMode === "create" ? "添加课程" : "编辑课程信息"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveCourse}>
            <div className="space-y-2">
              <Label htmlFor="course-name">课程名称</Label>
              <Input id="course-name" value={courseName} onChange={(event) => setCourseName(event.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="course-is-tong-class"
                type="checkbox"
                checked={courseIsTongClass}
                onChange={(event) => setCourseIsTongClass(event.target.checked)}
              />
              <Label htmlFor="course-is-tong-class">标记为通班培养方案课程</Label>
            </div>
            {courseError && <p className="text-sm text-red-600">{courseError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">按标签批量归类评测</CardTitle>
          </CardHeader>
          <CardContent className="h-full flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-start">
              <div>
                <Label>标签（逗号分隔）</Label>
                <Input value={assignTagsInput} onChange={(e) => setAssignTagsInput(e.target.value)} placeholder="例如: shuike, haoke" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {tagChoices.map((item: { name: string }) => (
                    <Button
                      key={item.name}
                      size="sm"
                      variant="outline"
                      style={getTagStyle(item.name)}
                      onClick={() => setAssignTagsInput((prev) => (prev ? prev + ", " + item.name : item.name))}
                    >
                      {item.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>目标课程</Label>
                <select className="h-10 rounded-md border border-input bg-white px-3 w-full" value={assignTargetCourse} onChange={(e) => setAssignTargetCourse(e.target.value)}>
                  <option value="">请选择课程</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-end mt-2">
                  <Button onClick={async () => {
                    const tags = assignTagsInput.split(",").map(s => s.trim()).filter(Boolean)
                    if (tags.length === 0) { showAdminToast("error", "请填写至少一个标签"); return }
                    if (!assignTargetCourse) { showAdminToast("error", "请选择目标课程"); return }
                    try {
                      const count = await assignByTags({ tags, targetCourseName: assignTargetCourse })
                      showAdminToast("success", `已分配 ${count} 条评测到 ${assignTargetCourse}`)
                    } catch (err) {
                      showAdminToast("error", `分配失败：${err instanceof Error ? err.message : String(err)}`)
                    }
                  }}>
                    批量归类
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">标签编辑</CardTitle>
          </CardHeader>
          <CardContent className="h-full flex flex-col gap-4">
            <div className="space-y-3">
              <div>
                <Label>要编辑的标签</Label>
                <Input
                  value={tagEditFrom}
                  onChange={(e) => setTagEditFrom(e.target.value)}
                  placeholder="例如: shuike（输入并保存即可创建新标签）"
                />
                <p className="text-xs text-slate-600 mt-1">填写新标签名并保存，即可创建新的标签。</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tagChoices.map((item: { name: string }) => (
                    <Button
                      key={item.name}
                      size="sm"
                      variant="outline"
                      style={getTagStyle(item.name)}
                      onClick={() => setTagEditFrom(item.name)}
                    >
                      {item.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>操作</Label>
                <select
                  className="h-10 rounded-md border border-input bg-white px-3 w-full"
                  value={tagEditAction}
                  onChange={(e) => setTagEditAction(e.target.value as "rename" | "delete" | "setColor")}
                >
                  <option value="setColor">设置颜色 / 创建</option>
                  <option value="rename">重命名</option>
                  <option value="delete">删除</option>
                </select>
              </div>

              {(tagEditAction === "rename" || tagEditAction === "setColor") && (
                <div>
                  <Label>标签颜色</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={tagEditColor}
                      onChange={(e) => setTagEditColor(e.target.value)}
                      className="h-10 w-12 rounded border border-input bg-white"
                    />
                    <Input value={tagEditColor} onChange={(e) => setTagEditColor(e.target.value)} />
                  </div>
                </div>
              )}

              {tagEditAction === "rename" && (
                <div>
                  <Label>新的标签名</Label>
                  <Input value={tagEditTo} onChange={(e) => setTagEditTo(e.target.value)} placeholder="例如: haoke" />
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={async () => {
                  const oldTag = tagEditFrom.trim()
                  const newTag = tagEditTo.trim()
                  if (!oldTag) {
                    showAdminToast("error", "请填写要编辑的标签")
                    return
                  }
                  if (tagEditAction === "rename" && !newTag) {
                    showAdminToast("error", "请填写新的标签名")
                    return
                  }
                  try {
                    if (tagEditAction === "setColor") {
                      await setTagColor({ tag: oldTag, color: tagEditColor })
                      showAdminToast("success", "标签颜色已更新")
                      return
                    }

                    const count = await editTag({
                      oldTag,
                      action: tagEditAction === "rename" ? "rename" : "delete",
                      newTag: tagEditAction === "rename" ? newTag : undefined,
                    })

                    if (tagEditAction === "rename") {
                      await setTagColor({ tag: newTag, color: tagEditColor })
                    }

                    showAdminToast("success", `已更新 ${count} 条评测标签`)
                  } catch (err) {
                    showAdminToast("error", `更新失败：${err instanceof Error ? err.message : String(err)}`)
                  }
                }}
              >
                保存更改
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索课程名称、教师或内容..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  {statusFilter ? statusLabels[statusFilter as CourseReview["status"]] : "全部状态"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>全部状态</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>待审核</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("approved")}>已通过</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>已拒绝</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
              value={reviewSortBy}
              onChange={(event) => setReviewSortBy(event.target.value)}
            >
              <option value="latest">最新提交</option>
              <option value="score-desc">点赞数</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>课程名称</TableHead>
                <TableHead>教师</TableHead>
                <TableHead>学期</TableHead>
                <TableHead>总体评价</TableHead>
                <TableHead>点赞数</TableHead>
                {isSuperAdmin ? <TableHead>实际提交者</TableHead> : null}
                <TableHead>评价内容</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFilteredReviews.map((review) => (
                <TableRow key={review._id}>
                  <TableCell className="font-medium">{review.courseName}</TableCell>
                  <TableCell>{review.instructor}</TableCell>
                  <TableCell className="text-gray-500">{getSemesterLabel(review.semesterYear, review.semesterTerm)}</TableCell>
                  <TableCell>
                    <Badge className={getRatingBadgeClass(review.overallRating)}>{review.overallRating}/10</Badge>
                  </TableCell>
                  <TableCell>{review.voteScore || 0}</TableCell>
                  {isSuperAdmin ? <TableCell>{getReviewAuthorName(review)}</TableCell> : null}
                  <TableCell className="max-w-xs truncate text-gray-500">{review.content}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[review.status]}>{statusLabels[review.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedReviewId(review._id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          查看详情
                        </DropdownMenuItem>
                        {review.status === "pending" && (
                          <>
                            <DropdownMenuItem className="text-green-600" onSelect={(event) => { event.preventDefault(); void handleStatusChange(review._id, "approved") }}>
                              <Check className="mr-2 h-4 w-4" />
                              通过
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onSelect={(event) => { event.preventDefault(); void handleStatusChange(review._id, "rejected") }}>
                              <X className="mr-2 h-4 w-4" />
                              拒绝
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem className="text-red-600" onSelect={(event) => { event.preventDefault(); void handleDelete(review._id, review.courseName) }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReviewId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>评测详情</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">课程名称</p>
                  <p className="font-medium">{selectedReview.courseName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">开课教师</p>
                  <p className="font-medium">{selectedReview.instructor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">学期</p>
                  <p className="font-medium">{getSemesterLabel(selectedReview.semesterYear, selectedReview.semesterTerm)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">总体评价</p>
                  <Badge className={getRatingBadgeClass(selectedReview.overallRating)}>{selectedReview.overallRating}/10</Badge>
                </div>
                {isSuperAdmin ? (
                  <div>
                    <p className="text-sm text-gray-500">实际提交者</p>
                    <p className="font-medium">{getReviewAuthorName(selectedReview)}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedReview.department && <Badge variant="secondary">{selectedReview.department}</Badge>}
                {selectedReview.attendanceRequired !== undefined && (
                  <Badge variant="secondary">{selectedReview.attendanceRequired ? "需要签到" : "不签到"}</Badge>
                )}
                {selectedReview.workload !== undefined && <Badge variant="secondary">任务量 {selectedReview.workload}/5</Badge>}
                {selectedReview.pace !== undefined && <Badge variant="secondary">进度 {selectedReview.pace}/5</Badge>}
                {selectedReview.gradingFairness !== undefined && (
                  <Badge variant="secondary">给分 {selectedReview.gradingFairness}/5</Badge>
                )}
                {selectedReview.courseAverageScore !== undefined && (
                  <Badge variant="secondary">课程均分 {selectedReview.courseAverageScore}</Badge>
                )}
                {selectedReview.personalScore !== undefined && (
                  <Badge variant="secondary">本人得分 {selectedReview.personalScore}</Badge>
                )}
                {selectedReview.recommendedStudyMethod && (
                  <Badge variant="secondary">
                    推荐学习方法{" "}
                    {STUDY_METHOD_OPTIONS.find((option) => option.value === selectedReview.recommendedStudyMethod)?.label}
                  </Badge>
                )}
              </div>

              <div className="mt-3">
                <p className="text-sm text-gray-500">标签</p>
                {!tagEditMode ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex flex-wrap gap-2">
                      {(selectedReview.tags || []).map((t: string) => (
                        <span
                          key={t}
                          className="rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={getTagStyle(t)}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setTagEditMode(true)}>
                      <Pencil className="mr-2 h-4 w-4" /> 编辑
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <Input value={tagEditValue} onChange={(e) => setTagEditValue(e.target.value)} placeholder="用逗号分隔标签" />
                    <div className="flex gap-2 flex-wrap">
                      {tagChoices.map((item: { name: string }) => (
                        <Button
                          key={item.name}
                          size="sm"
                          variant="outline"
                          style={getTagStyle(item.name)}
                          onClick={() => setTagEditValue((prev) => (prev ? prev + ", " + item.name : item.name))}
                        >
                          {item.name}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          const tags = tagEditValue.split(",").map((s) => s.trim()).filter(Boolean)
                          try {
                            await updateReview({ id: selectedReview._id as any, tags })
                            showAdminToast("success", "标签已保存")
                            setTagEditMode(false)
                          } catch (error) {
                            console.error(error)
                            showAdminToast("error", "保存标签失败")
                          }
                        }}
                      >
                        保存
                      </Button>
                      <Button variant="outline" onClick={() => { setTagEditMode(false); setTagEditValue((selectedReview?.tags || []).join(", ")) }}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">评价内容</p>
                <div className="mt-1 rounded-md border border-slate-200/60 bg-slate-50/60 p-4">
                  <MarkdownRenderer content={selectedReview.content} />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {selectedReview.status === "pending" ? (
                  <>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(selectedReview._id, "approved")}>
                      <Check className="mr-2 h-4 w-4" />
                      通过
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleStatusChange(selectedReview._id, "rejected")}
                    >
                      <X className="mr-2 h-4 w-4" />
                      拒绝
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setSelectedReviewId(null)}>
                    关闭
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">共 {filteredReviews.length} 条记录</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            上一页
          </Button>
          <Button variant="outline" size="sm" disabled>
            下一页
          </Button>
        </div>
      </div>

      <ConfirmDialog />
      {showToast && (
        <div className={`fixed right-6 bottom-6 z-50 rounded-md px-4 py-3 text-white ${toastType === "success" ? "bg-green-600" : toastType === "error" ? "bg-red-600" : "bg-black/80"}`} style={{ transition: "opacity 200ms" }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
