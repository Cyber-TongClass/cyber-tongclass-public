"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, Calendar, Star, BarChart3, BookOpen, MessageSquare, TableProperties, ClipboardList, Trophy, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { useUsers, useNews, useEvents, useCourseListWithReviews, usePendingReviews } from "@/lib/api"

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
  const [stats, setStats] = useState({
    users: 0,
    news: 0,
    events: 0,
    pendingReviews: 0,
    courses: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])

  // Fetch data from Convex
  const usersData = useUsers({ limit: 1000 })
  const newsData = useNews()
  const eventsData = useEvents()
  const coursesData = useCourseListWithReviews()
  const pendingReviewsData = usePendingReviews()

  useEffect(() => {
    const users = usersData || []
    const news = newsData || []
    const events = eventsData || []
    const courses = coursesData || []
    const pendingReviews = pendingReviewsData || []

    setStats({
      users: users.length,
      news: news.length,
      events: events.length,
      pendingReviews: pendingReviews.length,
      courses: courses.length,
    })

    const nextActivities: Activity[] = []

    users.slice(-5).forEach((user: any) => {
      nextActivities.push({
        key: `user-${user._id}`,
        action: "用户注册",
        user: user.englishName || user.username,
        timestamp: user.createdAt,
      })
    })

    news.slice(0, 8).forEach((item: any) => {
      nextActivities.push({
        key: `news-${item._id}`,
        action: item.isPublished ? "发布新闻" : "保存新闻草稿",
        user: "管理员",
        timestamp: item.updatedAt,
      })
    })

    events.slice(0, 8).forEach((item: any) => {
      nextActivities.push({
        key: `event-${item._id}`,
        action: "创建/更新活动",
        user: "管理员",
        timestamp: item.updatedAt,
      })
    })

    pendingReviews.slice(0, 10).forEach((review: any) => {
      nextActivities.push({
        key: `review-${review._id}`,
        action: "提交课程测评",
        user: review.isAnonymous ? "匿名用户" : review.authorId || "用户",
        timestamp: review.createdAt,
      })
    })

    courses.slice(-8).forEach((course: any) => {
      nextActivities.push({
        key: `course-${course._id}`,
        action: "创建/更新课程",
        user: "管理员",
        timestamp: course.updatedAt || Date.now(),
      })
    })

    setActivities(nextActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8))
  }, [usersData, newsData, eventsData, coursesData, pendingReviewsData])

  const quickActions = useMemo(
    () => [
      { href: "/admin/users", label: "用户管理", icon: Users },
      { href: "/admin/news", label: "新闻管理", icon: FileText },
      { href: "/admin/events", label: "活动管理", icon: Calendar },
      { href: "/admin/reviews", label: "课程测评", icon: Star },
      { href: "/admin/treehole", label: "树洞管理", icon: MessageSquare },
      { href: "/admin/feedback", label: "反馈管理", icon: FileText },
      { href: "/admin/reimbursements", label: "报销管理", icon: TableProperties },
      { href: "/admin/forms", label: "OA 表单", icon: ClipboardList },
      { href: "/admin/intranet", label: "内网模块", icon: LayoutGrid },
      { href: "/admin/creative-challenge-2026", label: "挑战赛", icon: Trophy },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">管理后台</h1>
        <p className="text-gray-500 mt-1">欢迎使用通班网站管理系统</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">用户总数</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.users}</div>
            <p className="text-xs text-gray-500 mt-1">数据库账户数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">新闻总数</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.news}</div>
            <p className="text-xs text-gray-500 mt-1">数据库新闻条目</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">活动总数</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.events}</div>
            <p className="text-xs text-gray-500 mt-1">数据库活动条目</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">待审核评测</CardTitle>
            <Star className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-gray-500 mt-1">需要处理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">课程总数</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.courses}</div>
            <p className="text-xs text-gray-500 mt-1">课程库规模</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500">暂无活动记录</p>
            ) : (
              activities.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{item.action}</span>
                    <span className="text-sm text-gray-500">by {item.user}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatRelativeTime(item.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
