"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUsers } from "@/lib/api"
import { compareCohorts, getCohortLabel, getCohortOptions, parseCohortValue, type CohortValue } from "@/lib/cohort"

const organizationLabels = {
  pku: "北京大学",
  thu: "清华大学",
}

const cohortOptions = getCohortOptions()

type Member = {
  id: string
  username: string
  englishName: string
  organization: "pku" | "thu"
  cohort: CohortValue
  researchInterests: string[]
  avatar?: string
}

export function MembersList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrganization, setSelectedOrganization] = useState<string>("all")
  const [selectedCohort, setSelectedCohort] = useState<string>("all")

  // Fetch users from Convex
  const usersData = useUsers({ limit: 1000 })
  const users = usersData || []

  // Filter users by role (member, admin, super_admin)
  const registeredUsers = useMemo(() => {
    return users
      .filter((u) => u.role === "member" || u.role === "admin" || u.role === "super_admin")
      .map((u) => ({
        id: u._id,
        username: u.username || u._id,
        englishName: u.englishName || u.username,
        organization: u.organization,
        cohort: u.cohort,
        researchInterests: u.researchInterests || [],
        avatar: u.avatar,
      }))
  }, [users])

  const filteredMembers = useMemo(() => {
    return registeredUsers.filter((member) => {
      // Search filter
      if (searchQuery && !member.englishName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Organization filter
      if (selectedOrganization !== "all" && member.organization !== selectedOrganization) {
        return false
      }
      // Cohort filter
      if (selectedCohort !== "all" && member.cohort !== parseCohortValue(selectedCohort)) {
        return false
      }
      return true
    })
  }, [registeredUsers, searchQuery, selectedOrganization, selectedCohort])

  // Sort: organization (pku first), then cohort (newest first), then name
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      // Organization sort: pku comes first
      if (a.organization !== b.organization) {
        return a.organization === "pku" ? -1 : 1
      }
      // Cohort sort: newest first
      if (a.cohort !== b.cohort) {
        return compareCohorts(a.cohort, b.cohort)
      }
      // Name sort
      return a.englishName.localeCompare(b.englishName)
    })
  }, [filteredMembers])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <Input
            placeholder="搜索成员..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedOrganization}
            onChange={(e) => setSelectedOrganization(e.target.value)}
            className="flex h-10 w-full md:w-[180px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">全部学校</option>
            <option value="pku">北京大学</option>
            <option value="thu">清华大学</option>
          </select>
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="flex h-10 w-full md:w-[140px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">全部年级</option>
            {cohortOptions.map((cohort) => (
              <option key={cohort} value={cohort}>
                {getCohortLabel(cohort)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-600">
        共 {sortedMembers.length} 位成员
      </div>

      {/* Members grid */}
      {sortedMembers.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedMembers.map((member) => (
            <Link key={member.id} href={`/members/${member.username}`}>
              <Card className="h-full border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                      {member.englishName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {member.englishName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{organizationLabels[member.organization]}</span>
                        <span>·</span>
                        <span>{getCohortLabel(member.cohort)}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {member.researchInterests && member.researchInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {member.researchInterests.slice(0, 3).map((interest) => (
                        <span
                          key={interest}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(211,40%,97%)] text-primary"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">未找到成员</h3>
          <p className="text-slate-600">请尝试调整搜索条件</p>
        </div>
      )}
    </div>
  )
}
