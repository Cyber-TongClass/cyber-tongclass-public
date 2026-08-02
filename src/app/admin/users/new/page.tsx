"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateUser } from "@/lib/api"
import { accountIdentityTypeOptions, accountRoleOptions } from "@/lib/account-role"
import { cohortToSelectValue, getCohortLabel, getCohortOptions, parseCohortValue, type CohortValue } from "@/lib/cohort"
import { useAuth } from "@/lib/hooks/use-auth"

const organizationOptions = [
  { value: "pku", label: "北大通班" },
  { value: "thu", label: "清华通班" },
] as const

type InstituteIdentityType = typeof accountIdentityTypeOptions[number]["value"]

const INITIAL_PASSWORD_LENGTH = 14
const INITIAL_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"

function generateInitialPassword() {
  const values = new Uint32Array(INITIAL_PASSWORD_LENGTH)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => INITIAL_PASSWORD_CHARS[value % INITIAL_PASSWORD_CHARS.length]).join("")
}

export default function AdminUserCreatePage() {
  const router = useRouter()
  const { isSuperAdmin } = useAuth()
  const createUser = useCreateUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [password, setPassword] = useState("")
  const [englishName, setEnglishName] = useState("")
  const [chineseName, setChineseName] = useState("")
  const [username, setUsername] = useState("")
  const [organization, setOrganization] = useState<"pku" | "thu">("pku")
  const [cohort, setCohort] = useState<CohortValue>(new Date().getFullYear())
  const [studentId, setStudentId] = useState("")
  const [role, setRole] = useState<"member" | "admin" | "super_admin">("member")
  const [identityType, setIdentityType] = useState<InstituteIdentityType>("undergrad")
  const [isClassMember, setIsClassMember] = useState(true)
  const [emailDomain, setEmailDomain] = useState("stu.pku.edu.cn")
  const cohortOptions = getCohortOptions()

  const derivedEmail = studentId ? `${studentId}@${emailDomain}` : ""

  useEffect(() => {
    setPassword(generateInitialPassword())
  }, [])

  const regeneratePassword = () => {
    setPassword(generateInitialPassword())
    setSuccess("")
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!derivedEmail || !password || !englishName || !chineseName || !username || !studentId) {
      setError("请填写完整的基础信息（含中文名）。")
      return
    }

    setIsSubmitting(true)
    try {
      await createUser({
        email: derivedEmail,
        password,
        englishName,
        chineseName,
        username,
        organization,
        cohort,
        studentId,
        role,
        ...(isSuperAdmin ? { identityType, isClassMember } : {}),
        isEmailVerified: true,
      } as any)

      setSuccess(`用户已创建，初始密码为：${password}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">新建用户</h1>
        <p className="text-gray-500 mt-1">填写基础信息后，系统会自动生成随机初始密码，并分别设置系统角色与研究院成员资格组。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>账号 ID（学号 / 工号）</Label>
                <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>邮箱用户名</Label>
                <div className="flex items-center gap-2">
                  <Input value={studentId} readOnly placeholder="自动使用账号 ID" />
                  <span className="text-sm text-slate-600">@</span>
                  <select
                    className="h-10 rounded-md border border-input bg-white px-3"
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value)}
                  >
                    <option value="stu.pku.edu.cn">stu.pku.edu.cn</option>
                    <option value="pku.edu.cn">pku.edu.cn</option>
                    <option value="alumni.pku.edu.cn">alumni.pku.edu.cn</option>
                  </select>
                </div>
                <p className="text-xs text-slate-600">邮箱会按账号 ID 自动生成（不需输入 @ 域名）。</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>英文名</Label>
                <Input value={englishName} onChange={(e) => setEnglishName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>中文名</Label>
                <Input value={chineseName} onChange={(e) => setChineseName(e.target.value)} required />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>初始密码</Label>
                <div className="flex gap-2">
                  <Input value={password} readOnly required />
                  <Button type="button" variant="outline" onClick={regeneratePassword}>
                    重新生成
                  </Button>
                </div>
                <p className="text-xs text-slate-600">系统将保存该初始密码的哈希值；请复制明文密码发送给用户本人。创建成功后页面不会自动跳转，便于你先记录密码。</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>组织</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-white px-3"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value as "pku" | "thu")}
                >
                  {organizationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>年级</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-white px-3"
                  value={cohortToSelectValue(cohort)}
                  onChange={(e) => setCohort(parseCohortValue(e.target.value))}
                >
                  {cohortOptions.map((option) => (
                    <option key={option} value={cohortToSelectValue(option)}>
                      {getCohortLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>角色</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-white px-3"
                value={role}
                onChange={(e) => setRole(e.target.value as "member" | "admin" | "super_admin")}
              >
                {accountRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {isSuperAdmin ? (
              <div className="rounded-md border border-slate-200 p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identityType">研究院成员资格组</Label>
                  <select
                    id="identityType"
                    className="h-10 w-full rounded-md border border-input bg-white px-3"
                    value={identityType}
                    onChange={(event) => {
                      const nextIdentityType = event.target.value as InstituteIdentityType
                      setIdentityType(nextIdentityType)
                      setIsClassMember(nextIdentityType === "undergrad")
                    }}
                  >
                    {accountIdentityTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600">成员资格组仅用于研究院服务范围和目录筛选，不会替代系统角色权限。</p>
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isClassMember}
                    onChange={(event) => setIsClassMember(event.target.checked)}
                    className="mt-1 rounded"
                  />
                  <span>
                    <span className="font-medium">通班成员目录</span>
                    <span className="block text-xs text-slate-600">启用后，该账号会出现在通班成员目录中；研究生、教师和其他研究院成员默认不启用。</span>
                  </span>
                </label>
              </div>
            ) : null}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>返回</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "保存中..." : "创建用户"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
