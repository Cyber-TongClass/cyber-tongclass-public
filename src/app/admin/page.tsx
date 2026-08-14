"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Clock3,
  FileText,
  LayoutGrid,
  MessageSquare,
  Star,
  TableProperties,
  Trophy,
  Users,
} from "lucide-react"
import {
  useAdminEvents,
  useAdminUsers,
  useCourseListWithReviews,
  useMyContentPermissions,
  useNews,
  usePendingReviews,
} from "@/lib/api"

type Activity = {
  key: string
  action: string
  user: string
  timestamp: number
}

function formatRelativeTime(timestamp: number) {
  const delta = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (delta < minute) return "刚刚"
  if (delta < hour) return `${Math.floor(delta / minute)} 分钟前`
  if (delta < day) return `${Math.floor(delta / hour)} 小时前`
  return `${Math.floor(delta / day)} 天前`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, news: 0, events: 0, pendingReviews: 0, courses: 0 })
  const [activities, setActivities] = useState<Activity[]>([])
  const permissions = useMyContentPermissions()
  const usersData = useAdminUsers({ limit: 1000 })
  const newsData = useNews()
  const eventsData = useAdminEvents({ disabled: permissions?.events.canManage !== true })
  const coursesData = useCourseListWithReviews()
  const pendingReviewsData = usePendingReviews()

  useEffect(() => {
    const users = usersData || []
    const news = newsData || []
    const events = eventsData || []
    const courses = coursesData || []
    const pendingReviews = pendingReviewsData || []

    setStats({ users: users.length, news: news.length, events: events.length, pendingReviews: pendingReviews.length, courses: courses.length })

    const nextActivities: Activity[] = []
    users.slice(-5).forEach((user: any) => nextActivities.push({
      key: `user-${user._id}`,
      action: "用户注册",
      user: user.englishName || user.username,
      timestamp: user.createdAt,
    }))
    news.slice(0, 8).forEach((item: any) => nextActivities.push({
      key: `news-${item._id}`,
      action: item.isPublished ? "发布新闻" : "保存新闻草稿",
      user: "管理员",
      timestamp: item.updatedAt,
    }))
    events.slice(0, 8).forEach((item: any) => nextActivities.push({
      key: `event-${item._id}`,
      action: "创建或更新活动",
      user: "管理员",
      timestamp: item.updatedAt,
    }))
    pendingReviews.slice(0, 10).forEach((review: any) => nextActivities.push({
      key: `review-${review._id}`,
      action: "提交课程测评",
      user: review.isAnonymous ? "匿名用户" : review.authorId || "用户",
      timestamp: review.createdAt,
    }))
    courses.slice(-8).forEach((course: any) => nextActivities.push({
      key: `course-${course.name}`,
      action: "创建或更新课程",
      user: "管理员",
      timestamp: course.updatedAt || Date.now(),
    }))

    setActivities(nextActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8))
  }, [usersData, newsData, eventsData, coursesData, pendingReviewsData])

  const quickActions = useMemo(() => [
    { href: "/admin/users", label: "用户管理", description: "账户、身份与研究院绑定", icon: Users },
    { href: "/admin/news", label: "新闻管理", description: "审核与发布研究院动态", icon: FileText },
    { href: "/admin/events", label: "活动管理", description: "维护活动和公开日程", icon: Calendar },
    { href: "/admin/reviews", label: "课程测评", description: "审核课程评价与课程库", icon: Star },
    { href: "/admin/reimbursements", label: "报销管理", description: "处理申请与导出材料", icon: TableProperties },
    { href: "/forms/manage", label: "表单管理", description: "创建表单与配置审批", icon: ClipboardList },
    { href: "/admin/intranet", label: "内网模块", description: "配置成员可见服务入口", icon: LayoutGrid },
    { href: "/admin/treehole", label: "树洞管理", description: "处理内容与社区秩序", icon: MessageSquare },
    { href: "/admin/feedback", label: "反馈管理", description: "归集成员意见与建议", icon: FileText },
    { href: "/admin/creative-challenge-2026", label: "挑战赛", description: "管理专项赛事与报名", icon: Trophy },
  ], [])

  const summary = [
    { label: "平台账户", value: stats.users, hint: "已录入" },
    { label: "公开动态", value: stats.news, hint: "条记录" },
    { label: "活动", value: stats.events, hint: "条记录" },
    { label: "课程", value: stats.courses, hint: "门课程" },
  ]

  return (
    <div>
      <header className="flex flex-col gap-4 border-b aia-border-rule pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[hsl(var(--aia-ink))] sm:text-3xl">运营概览</h1>
          <p className="aia-text-muted mt-1 max-w-3xl text-sm leading-6">查看待处理事项，快速进入常用管理模块。</p>
        </div>
        <Link href="/admin/reviews" className="aia-focus inline-flex min-h-11 items-center gap-3 self-start bg-[hsl(var(--aia-red))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--aia-red-deep))] sm:self-auto">
          <span>{stats.pendingReviews > 0 ? `${stats.pendingReviews} 条测评待审核` : "暂无待审核测评"}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      <section className="mt-6 grid overflow-hidden border aia-border-rule bg-white sm:grid-cols-2 xl:grid-cols-4" aria-label="站点数据概览">
        {summary.map((item, index) => (
          <div key={item.label} className={`px-5 py-5 sm:px-6 ${index > 0 ? "border-t aia-border-rule sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""}`}>
            <p className="aia-text-muted text-sm font-medium">{item.label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-[-0.035em] text-[hsl(var(--aia-ink))]">{item.value}</span>
              <span className="aia-text-muted text-xs">{item.hint}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <section className="overflow-hidden border aia-border-rule bg-white">
          <div className="border-b aia-border-rule px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold tracking-[-0.015em] text-[hsl(var(--aia-ink))]">常用模块</h2>
            <p className="aia-text-muted mt-1 text-sm">按任务进入管理区域，而不是从菜单中寻找功能。</p>
          </div>
          <div className="grid sm:grid-cols-2">
            {quickActions.map((action, index) => (
              <Link key={action.href} href={action.href} className={`aia-focus group flex min-h-28 items-start gap-4 p-5 transition-colors hover:bg-[hsl(var(--aia-warm))] sm:p-6 ${index % 2 === 1 ? "sm:border-l aia-border-rule" : ""} ${index >= 2 ? "border-t aia-border-rule" : ""}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[hsl(var(--aia-tag))] text-[hsl(var(--aia-red))]">
                  <action.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3 text-[15px] font-semibold text-[hsl(var(--aia-ink))]">
                    {action.label}
                    <ArrowRight className="h-4 w-4 text-[hsl(var(--aia-muted))] transition-transform group-hover:translate-x-0.5 group-hover:text-[hsl(var(--aia-red))]" aria-hidden="true" />
                  </span>
                  <span className="aia-text-muted mt-1.5 block text-sm leading-6">{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="overflow-hidden border aia-border-rule bg-white">
          <div className="flex items-center justify-between border-b aia-border-rule px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.015em] text-[hsl(var(--aia-ink))]">最近动态</h2>
              <p className="aia-text-muted mt-1 text-sm">最新 8 条站点活动</p>
            </div>
            <Clock3 className="aia-text-muted h-5 w-5" aria-hidden="true" />
          </div>
          {activities.length > 0 ? (
            <div className="divide-y divide-[hsl(var(--aia-rule))]">
              {activities.map((activity) => (
                <div key={activity.key} className="flex items-start gap-3 px-5 py-4 sm:px-6">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--aia-red))]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[hsl(var(--aia-ink))]">{activity.action}</p>
                    <p className="aia-text-muted mt-1 truncate text-xs">{activity.user}</p>
                  </div>
                  <time className="aia-text-muted shrink-0 text-xs">{formatRelativeTime(activity.timestamp)}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Clock3 className="aia-text-muted mx-auto h-5 w-5" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-[hsl(var(--aia-ink))]">尚无动态</p>
              <p className="aia-text-muted mt-1 text-xs">有新的内容或用户活动后会显示在这里。</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
