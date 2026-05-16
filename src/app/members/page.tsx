"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Users as UsersIcon, GraduationCap, School } from "lucide-react"
import { getInitials } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUsers } from "@/lib/api"
import { RESEARCH_DIRECTIONS, getResearchDirectionLabel } from "@/lib/research-directions"
import type { User } from "@/types"
import { compareCohorts, getCohortClassLabel, getCohortLabel, getYearCohortOptions, parseCohortValue } from "@/lib/cohort"

// 排序函数：学校 → 年级（新→旧）→ 拼音
function sortUsers(users: User[]) {
  const orgOrder = { pku: 0, thu: 1 }
  
  return [...users].sort((a, b) => {
    // 首先按学校排序
    if (a.organization !== b.organization) {
      return orgOrder[a.organization as keyof typeof orgOrder] - orgOrder[b.organization as keyof typeof orgOrder]
    }
    // 然后按年级（新→旧，即从大到小）
    if (a.cohort !== b.cohort) {
      return compareCohorts(a.cohort, b.cohort)
    }
    // 最后按拼音排序
    if (a.cohort === "mascot") {
      return b.englishName.localeCompare(a.englishName, "en")
    }
    return a.englishName.localeCompare(b.englishName, 'en')
  })
}

function getProfileSlug(user: User) {
  return user.username || user._id
}

function getUserDirections(user: User) {
  return user.researchDirections && user.researchDirections.length > 0 ? user.researchDirections : []
}

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedOrg, setSelectedOrg] = React.useState<string>("all")
  const [selectedCohort, setSelectedCohort] = React.useState<string>("all")
  const [selectedTag, setSelectedTag] = React.useState<string>("all")

  // Fetch users from Convex
  const usersData = useUsers({ limit: 1000 })
  const usersFromConvex = usersData || []
  const users: User[] = usersFromConvex.map((u) => ({
    ...u,
    _id: u._id,
  }))

  // Show loading state while fetching
  if (!usersData) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container-custom py-12">
          <div className="animate-pulse">
            <div className="h-64 bg-slate-100 rounded-lg mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 bg-slate-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const allTags = RESEARCH_DIRECTIONS.map((direction) => direction.value)
  const sortedUsers = sortUsers(users)

  // 筛选用户
  const filteredUsers = sortedUsers.filter(user => {
    // 搜索筛选
    const normalizedQuery = searchQuery.toLowerCase()
    if (
      searchQuery &&
      !user.englishName.toLowerCase().includes(normalizedQuery) &&
      !(user.chineseName || "").toLowerCase().includes(normalizedQuery)
    ) {
      return false
    }
    // 学校筛选
    if (selectedOrg !== "all" && user.organization !== selectedOrg) {
      return false
    }
    // 年级筛选
    if (selectedCohort !== "all" && user.cohort !== parseCohortValue(selectedCohort)) {
      return false
    }
    // Research area filter
    if (selectedTag !== "all" && !getUserDirections(user).includes(selectedTag)) {
      return false
    }
    return true
  })

  // 年级选项
  const cohorts = [...getYearCohortOptions(), "mascot" as const]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">MEMBERS</div>
          <div className="mb-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
              班级成员
            </h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative">
            北京大学与清华大学通用人工智能实验班成员主页，涵盖学生和往届毕业生的研究方向、学术成果等。
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="border-b border-slate-200 bg-white sticky top-16 z-40">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <Input
                type="search"
                placeholder="搜索成员..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Organization Filter */}
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择学校" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部学校</SelectItem>
                  <SelectItem value="pku">北大通班</SelectItem>
                  <SelectItem value="thu">清华通班</SelectItem>
                </SelectContent>
              </Select>

              {/* Cohort Filter */}
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部年级</SelectItem>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort} value={cohort.toString()}>
                      {getCohortLabel(cohort)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tag Filter */}
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="研究方向" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部方向</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {getResearchDirectionLabel(tag)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(selectedOrg !== "all" || selectedCohort !== "all" || selectedTag !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOrg("all")
                    setSelectedCohort("all")
                    setSelectedTag("all")
                    setSearchQuery("")
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-slate-600">
            显示 {filteredUsers.length} 位成员
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <UsersIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              未找到匹配成员
            </h3>
            <p className="text-slate-600">
              尝试调整筛选条件或搜索关键词
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user) => (
              <Link key={user._id} href={`/members/${getProfileSlug(user)}`}>
                <Card className="group h-full bg-white shadow-sm hover:bg-slate-50 border-l-[3px] border-transparent hover:border-primary transition-all duration-200 rounded-none border-0">
                  <CardContent className="p-6">
                    {/* Avatar */}
                    <div className="flex justify-center mb-4">
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-[hsl(211,40%,97%)] ring-2 ring-primary/10 group-hover:ring-primary/40 transition-all flex items-center justify-center">
                        {user.realPhoto || user.avatar ? (
                          <img
                            src={(user.realPhoto || user.avatar) as string}
                            alt={user.englishName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-extrabold text-primary">
                            {getInitials(user.englishName || user.username || "U")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-extrabold text-center text-slate-900 group-hover:text-primary transition-colors">
                      {user.englishName}
                    </h3>
                    {/* Organization & Cohort */}
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-600">
                      {user.organization === "pku" ? (
                        <School className="h-4 w-4" />
                      ) : (
                        <GraduationCap className="h-4 w-4" />
                      )}
                      <span>
                        {user.organization === "pku" ? "PKU" : "THU"} Tong Class · {getCohortClassLabel(user.cohort)}
                      </span>
                    </div>
                  </CardContent>

                  {/* Tags */}
                  {(getUserDirections(user).length > 0 || (user.researchInterests && user.researchInterests.length > 0)) && (
                    <CardFooter className="pt-0 px-6 pb-6">
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {(getUserDirections(user).length > 0 ? getUserDirections(user) : user.researchInterests || []).slice(0, 3).map((interest) => (
                          <span
                            key={interest}
                            className="px-2 py-0.5 text-xs rounded-full bg-[hsl(211,40%,97%)] text-primary/80 border border-primary/10"
                          >
                            {getUserDirections(user).includes(interest) ? getResearchDirectionLabel(interest) : interest}
                          </span>
                        ))}
                        {(getUserDirections(user).length > 0 ? getUserDirections(user).length : user.researchInterests?.length || 0) > 3 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                            +{(getUserDirections(user).length > 0 ? getUserDirections(user).length : user.researchInterests?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
        </div>
      </section>
    </div>
  )
}
