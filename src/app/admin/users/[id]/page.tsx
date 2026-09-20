"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersonalEmailsInput } from "@/components/profile/personal-emails-input"
import { UserLinksInput } from "@/components/profile/user-links-input"
import { getUserLinks, getUserPersonalEmails, sanitizePersonalEmails, sanitizeUserLinks } from "@/lib/user-profile"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, UserPlus } from "lucide-react"
import { useUserById, useCreateUser, useUpdateUser, useResetPasswordAsSuperAdmin } from "@/lib/api"
import type { UserLink, UserRole } from "@/types"
import { cohortToSelectValue, getCohortLabel, getCohortOptions, parseCohortValue, type CohortValue } from "@/lib/cohort"
import { useAuth } from "@/lib/hooks/use-auth"
import { RESEARCH_DIRECTIONS } from "@/lib/research-directions"

type Organization = "pku" | "thu"
type Role = UserRole

const roleOptions: { value: Role; label: string }[] = [
  { value: "member", label: "成员" },
  { value: "admin", label: "管理员" },
  { value: "super_admin", label: "超级管理员" },
]

const organizationOptions: { value: Organization; label: string }[] = [
  { value: "pku", label: "北大通班" },
  { value: "thu", label: "清华通班" },
]

const CURRENT_YEAR = new Date().getFullYear()
const cohortOptions = getCohortOptions(CURRENT_YEAR)

type UserFormData = {
  englishName: string
  chineseName: string
  username: string
  email: string
  organization: Organization
  cohort: CohortValue
  role: Role
  studentId: string
  password: string
  photoUrl: string
  personalEmails: string[]
  bio: string
  researchDirections: string[]
  researchInterests: string[]
  links: UserLink[]
}

export default function UserFormPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const userId = params.id
  const isCreateMode = userId === "new"
  const { currentUser, isSuperAdmin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newInterest, setNewInterest] = useState("")
  const [formData, setFormData] = useState<UserFormData>({
    englishName: "",
    chineseName: "",
    username: "",
    email: "",
    organization: "pku",
    cohort: CURRENT_YEAR,
    role: "member",
    studentId: "",
    password: "",
    photoUrl: "",
    personalEmails: [],
    bio: "",
    researchDirections: [],
    researchInterests: [],
    links: [],
  })

  // Use hooks at top level
  const userData = useUserById(isCreateMode ? undefined : userId)
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const resetPasswordAsSuperAdmin = useResetPasswordAsSuperAdmin()

  // Set user data when fetched
  useEffect(() => {
    if (isCreateMode) {
      setLoading(false)
      return
    }

    if (userData === undefined) {
      return
    }

    if (userData) {
      setFormData({
        englishName: userData.englishName || "",
        chineseName: userData.chineseName || "",
        username: userData.username || "",
        email: userData.email || "",
        organization: userData.organization || "pku",
        cohort: userData.cohort || CURRENT_YEAR,
        role: userData.role || "member",
        studentId: userData.studentId || "",
        password: "",
        photoUrl: userData.realPhoto || userData.avatar || "",
        personalEmails: getUserPersonalEmails(userData),
        bio: userData.bio || "",
        researchDirections: userData.researchDirections || [],
        researchInterests: userData.researchInterests || [],
        links: getUserLinks(userData),
      })
    }

    setLoading(false)
  }, [isCreateMode, userData])

  const handleAddInterest = () => {
    const normalized = newInterest.trim()
    if (!normalized || formData.researchInterests.includes(normalized)) {
      return
    }

    setFormData({
      ...formData,
      researchInterests: [...formData.researchInterests, normalized],
    })
    setNewInterest("")
  }

  const handleRemoveInterest = (interest: string) => {
    setFormData({
      ...formData,
      researchInterests: formData.researchInterests.filter((item) => item !== interest),
    })
  }

  const handleToggleDirection = (direction: string) => {
    setFormData((previous) => ({
      ...previous,
      researchDirections: previous.researchDirections.includes(direction)
        ? previous.researchDirections.filter((item) => item !== direction)
        : [...previous.researchDirections, direction],
    }))
  }

  const expectedEmailHint = useMemo(() => {
    const studentId = formData.studentId.trim().toLowerCase() || "your_student_id"
    if (formData.organization === "pku") {
      return `${studentId}@stu.pku.edu.cn`
    }
    return `${studentId}@mails.tsinghua.edu.cn`
  }, [formData.organization, formData.studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (isCreateMode) {
      try {
        await createUserMutation({
          englishName: formData.englishName.trim(),
          chineseName: formData.chineseName.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          organization: formData.organization,
          cohort: formData.cohort,
          role: formData.role,
          studentId: formData.studentId.trim(),
          avatar: formData.photoUrl.trim() || undefined,
          realPhoto: formData.photoUrl.trim() || undefined,
          password: formData.password,
          personalEmails: sanitizePersonalEmails(formData.personalEmails),
          bio: formData.bio.trim() || undefined,
          researchDirections: formData.researchDirections.map((item) => item.trim()).filter(Boolean),
          researchInterests: formData.researchInterests.map((item) => item.trim()).filter(Boolean),
          links: sanitizeUserLinks(formData.links),
        })
        router.push("/admin/users")
      } catch (err: any) {
        setError(err.message || "创建用户失败")
      }
      return
    }

    try {
      await updateUserMutation({
        id: userId as any,
        englishName: formData.englishName.trim(),
        chineseName: formData.chineseName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        organization: formData.organization,
        cohort: formData.cohort,
        role: formData.role,
        studentId: formData.studentId.trim(),
        avatar: formData.photoUrl.trim() || undefined,
        realPhoto: formData.photoUrl.trim() || undefined,
        personalEmails: sanitizePersonalEmails(formData.personalEmails),
        bio: formData.bio.trim(),
        researchDirections: formData.researchDirections.map((item) => item.trim()).filter(Boolean),
        researchInterests: formData.researchInterests.map((item) => item.trim()).filter(Boolean),
        links: sanitizeUserLinks(formData.links),
      })

      if (isSuperAdmin && formData.password.trim()) {
        await resetPasswordAsSuperAdmin({
          requesterId: currentUser?._id as any,
          targetUserId: userId as any,
          newPassword: formData.password,
        })
      }

      router.push("/admin/users")
    } catch (err: any) {
      setError(err.message || "更新用户失败")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!isCreateMode && !userData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-extrabold">用户不存在</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">未找到ID为 {userId} 的用户</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{isCreateMode ? "新建用户" : "编辑用户"}</h1>
          <p className="text-gray-500 mt-1">{isCreateMode ? "创建成员或管理员账号" : "修改用户信息与角色权限"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{isCreateMode ? "用户注册信息" : "用户信息"}</CardTitle>
            <p className="text-sm text-slate-600">
              {isCreateMode ? "学校邮箱需与组织和学号匹配，创建后可立即登录。" : "保存后会立即同步到用户列表。"}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="englishName">英文名</Label>
                <Input
                  id="englishName"
                  value={formData.englishName}
                  onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chineseName">中文名</Label>
                <Input
                  id="chineseName"
                  value={formData.chineseName}
                  onChange={(e) => setFormData({ ...formData, chineseName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">组织</Label>
                <Select
                  value={formData.organization}
                  onValueChange={(value) => setFormData({ ...formData, organization: value as Organization })}
                >
                  <SelectTrigger id="organization">
                    <SelectValue placeholder="选择组织" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationOptions.map((org) => (
                      <SelectItem key={org.value} value={org.value}>
                        {org.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cohort">年级</Label>
                <Select
                  value={cohortToSelectValue(formData.cohort)}
                  onValueChange={(value) => setFormData({ ...formData, cohort: parseCohortValue(value) })}
                >
                  <SelectTrigger id="cohort">
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohortOptions.map((cohort) => (
                      <SelectItem key={cohort} value={cohortToSelectValue(cohort)}>
                        {getCohortLabel(cohort)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">学校邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={expectedEmailHint}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-600">建议格式：{expectedEmailHint}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="studentId">学号</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                />
              </div>
              {isCreateMode && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">初始密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="至少 8 位"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={8}
                    required
                  />
                </div>
              )}
              {!isCreateMode && isSuperAdmin && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">重置密码</Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="留空则不修改；填写后将直接重置该用户密码"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={8}
                  />
                  <p className="text-xs text-slate-600">仅超级管理员可直接重置他人密码，无需原密码。</p>
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="photoUrl">头像照片链接</Label>
              <Input
                id="photoUrl"
                type="url"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://example.com/profile-photo.jpg"
              />
              <p className="text-xs text-slate-600">
                管理员维护统一头像链接，保存时会同时写入 `realPhoto` 和 `avatar`。
              </p>
              {formData.photoUrl.trim() ? (
                <div className="flex items-center gap-4 rounded-md border border-slate-200/70 bg-slate-100/20 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.photoUrl}
                    alt="头像预览"
                    className="h-20 w-20 rounded-full object-cover bg-slate-100"
                  />
                  <p className="text-sm text-slate-600 break-all">{formData.photoUrl}</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>个人邮箱</Label>
              <PersonalEmailsInput
                emails={formData.personalEmails}
                onChange={(personalEmails) => setFormData({ ...formData, personalEmails })}
              />
              <p className="text-xs text-slate-600">学校邮箱用于账号身份识别，不会在成员主页公开展示。</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about this user..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Research Interests</Label>
              <div className="rounded-md border border-slate-200/70 p-3">
                <p className="mb-3 text-xs text-slate-600">
                  选择成员页筛选和展示使用的研究方向；下方仍可添加自由填写的具体兴趣。
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {RESEARCH_DIRECTIONS.map((direction) => (
                    <label key={direction.value} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.researchDirections.includes(direction.value)}
                        onChange={() => handleToggleDirection(direction.value)}
                        className="mt-1 rounded"
                      />
                      <span>{direction.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddInterest())}
                  placeholder="Add research interest"
                />
                <Button type="button" variant="outline" onClick={handleAddInterest}>
                  Add
                </Button>
              </div>
              {formData.researchInterests.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.researchInterests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                    >
                      {interest}
                      <button type="button" onClick={() => handleRemoveInterest(interest)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Profile Links</Label>
              <UserLinksInput
                links={formData.links}
                onChange={(links) => setFormData({ ...formData, links })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
            {isCreateMode ? <UserPlus className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isCreateMode ? "创建用户" : "保存"}
          </Button>
        </div>
      </form>
    </div>
  )
}
