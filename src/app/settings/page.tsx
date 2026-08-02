"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { useMyCoffeeTalkTeacherAvailability, useSetCoffeeTalkTeacherAvailability, useUpdatePasswordWithCurrent, useUpdateUser } from "@/lib/api"
import { PersonalEmailsInput } from "@/components/profile/personal-emails-input"
import { UserLinksInput } from "@/components/profile/user-links-input"
import { Button } from "@/components/ui/button"
import { getUserLinks, getUserPersonalEmails, sanitizePersonalEmails, sanitizeUserLinks } from "@/lib/user-profile"
import { RESEARCH_DIRECTIONS } from "@/lib/research-directions"
import type { UserLink } from "@/types"
import { ArrowLeft, CheckCircle, LogOut, User, X, XCircle } from "lucide-react"
import { getAccountRoleLabel } from "@/lib/account-role"
import { getCohortClassLabel } from "@/lib/cohort"

const MarkdownSplitEditor = dynamic(
  () => import("@/components/markdown/markdown-split-editor").then((mod) => mod.MarkdownSplitEditor),
  {
    ssr: false,
    loading: () => <p className="aia-text-muted text-sm">编辑器加载中…</p>,
  }
)

const inputClass =
  "aia-focus w-full border aia-border-rule bg-transparent px-3 py-2 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-60"

const labelClass =
  "aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted"

export default function SettingsPage() {
  const router = useRouter()
  const { currentUser, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const updateUser = useUpdateUser()
  const updatePasswordWithCurrent = useUpdatePasswordWithCurrent()
  const coffeeTalkAvailability = useMyCoffeeTalkTeacherAvailability() as { open: boolean; profileMissing: boolean } | null | undefined
  const setCoffeeTalkTeacherAvailability = useSetCoffeeTalkTeacherAvailability()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingProfileMarkdown, setIsSavingProfileMarkdown] = useState(false)
  const [isUpdatingCoffeeTalkAvailability, setIsUpdatingCoffeeTalkAvailability] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")
  const [showSaveToast, setShowSaveToast] = useState(false)
  const [saveToastOpacity, setSaveToastOpacity] = useState(0)
  const [saveToastMessage, setSaveToastMessage] = useState("")
  const [saveToastType, setSaveToastType] = useState<"success" | "error" | "info">("info")
  const saveToastTimerRef = useRef<number | null>(null)

  const showToast = (type: "success" | "error" | "info", message: string, duration = 2000) => {
    setSaveToastType(type)
    setSaveToastMessage(message)
    setShowSaveToast(true)
    setSaveToastOpacity(1)
    if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current)
    saveToastTimerRef.current = window.setTimeout(() => {
      setSaveToastOpacity(0)
      saveToastTimerRef.current = window.setTimeout(() => setShowSaveToast(false), 300)
    }, duration)

    if (type === "error") {
      // scroll to top so the toast and error message are visible
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  // Profile form
  const [username, setUsername] = useState("")
  const [englishName, setEnglishName] = useState("")
  const [chineseName, setChineseName] = useState("")
  const [personalEmails, setPersonalEmails] = useState<string[]>([])
  const [bio, setBio] = useState("")
  const [profileMarkdown, setProfileMarkdown] = useState("")
  const [researchDirections, setResearchDirections] = useState<string[]>([])
  const [researchInterests, setResearchInterests] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState("")
  const [links, setLinks] = useState<UserLink[]>([])

  // Password form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent("/settings")}`)
    }
  }, [authLoading, isAuthenticated, router])

  // Initialize form state when the user first loads (or when switching accounts).
  // Avoid re-initializing on every `currentUser` change to prevent overwriting
  // in-progress, unsaved edits (e.g., saving markdown should not reset other fields).
  const initializedUserRef = useRef<string | null>(null)
  useEffect(() => {
    if (!currentUser) return
    if (initializedUserRef.current === currentUser._id) return
    initializedUserRef.current = currentUser._id

    setEnglishName(currentUser.englishName || "")
    setChineseName(currentUser.chineseName || "")
    setUsername(currentUser.username || "")
    setPersonalEmails(getUserPersonalEmails(currentUser))
    setBio(currentUser.bio || "")
    setProfileMarkdown(currentUser.profileMarkdown || "")
    setResearchDirections(currentUser.researchDirections || [])
    setResearchInterests(currentUser.researchInterests || [])
    setLinks(getUserLinks(currentUser))
  }, [currentUser])

  const handleSaveProfile = async () => {
    if (!currentUser) return

    if (!username.trim()) {
      const msg = "请填写用户名"
      setError(msg)
      setSuccessMessage("")
      showToast("error", msg)
      return
    }

    if (!englishName.trim() || !chineseName.trim()) {
      const msg = "英文姓名和中文姓名不能为空"
      setError(msg)
      setSuccessMessage("")
      showToast("error", msg)
      return
    }

    setIsSubmitting(true)
    setError("")
    setSuccessMessage("")

    try {
      await updateUser({
        id: currentUser._id,
        username: username.trim(),
        personalEmails: sanitizePersonalEmails(personalEmails),
        bio: bio.trim(),
        // Also persist profile markdown when saving the profile form
        profileMarkdown,
        researchDirections: researchDirections
          .map((direction) => direction.trim())
          .filter(Boolean),
        researchInterests: researchInterests
          .map((interest) => interest.trim())
          .filter(Boolean),
        links: sanitizeUserLinks(links),
      })

      setSuccessMessage("个人资料已更新")
      showToast("success", "个人资料已更新", 2000)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "个人资料更新失败"
      setError(msg)
      showToast("error", msg, 4000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveProfileMarkdown = async () => {
    if (!currentUser) return

    setIsSavingProfileMarkdown(true)
    setError("")
    setSuccessMessage("")

    try {
      await updateUser({
        id: currentUser._id,
        profileMarkdown,
      } as any)

      setSuccessMessage("详细介绍已更新")
      showToast("success", "详细介绍已更新", 2000)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "详细介绍更新失败"
      setError(msg)
      showToast("error", msg, 4000)
    } finally {
      setIsSavingProfileMarkdown(false)
    }
  }

  const handleCoffeeTalkAvailabilityChange = async () => {
    if (!coffeeTalkAvailability || coffeeTalkAvailability.profileMissing) return
    setIsUpdatingCoffeeTalkAvailability(true)
    try {
      await setCoffeeTalkTeacherAvailability({ open: !coffeeTalkAvailability.open })
      showToast("success", coffeeTalkAvailability.open ? "Coffee Talk 申请入口已关闭" : "Coffee Talk 申请入口已开放")
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新 Coffee Talk 开放状态失败"
      setError(message)
      showToast("error", message, 4000)
    } finally {
      setIsUpdatingCoffeeTalkAvailability(false)
    }
  }

  const handleAddInterest = () => {
    if (newInterest && !researchInterests.includes(newInterest)) {
      setResearchInterests([...researchInterests, newInterest])
      setNewInterest("")
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setResearchInterests(researchInterests.filter(i => i !== interest))
  }

  const handleToggleDirection = (direction: string) => {
    setResearchDirections((previous) =>
      previous.includes(direction)
        ? previous.filter((item) => item !== direction)
        : [...previous, direction]
    )
  }

  const handleChangePassword = async () => {
    if (!currentUser) {
      setError("登录后才能修改密码")
      return
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("请填写全部密码字段")
      return
    }

    if (newPassword.length < 8) {
      setError("新密码至少需要 8 个字符")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致")
      return
    }

    setError("")
    setSuccessMessage("")

    try {
      await updatePasswordWithCurrent({
        userId: currentUser._id,
        currentPassword,
        newPassword,
      } as any)

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      const message = "密码已更新，正在退出登录…"
      setSuccessMessage(message)
      showToast("success", message, 1500)
      window.setTimeout(() => {
        logout("/login?passwordChanged=true")
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : "密码更新失败"
      if (message === "Current password is incorrect") {
        setError("当前密码不正确")
        return
      }
      setError(message)
    }
  }

  if (authLoading) {
    return (
      <main className="container-custom max-w-3xl py-12 sm:py-16">
        <p role="status" className="aia-text-muted py-6 text-sm">正在加载账户设置…</p>
      </main>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return null
  }

  return (
    <main className="container-custom max-w-3xl py-10 sm:py-12">
      {showSaveToast && (
        <div className="pointer-events-none fixed right-4 top-4 z-50 max-w-sm">
          <div
            className={
              "flex items-center gap-3 border aia-border-rule bg-[hsl(var(--aia-warm))] px-4 py-3 text-sm shadow-lg transition-opacity duration-300 " +
              (saveToastType === "error" ? "text-[hsl(var(--aia-red))]" : "text-[hsl(var(--aia-ink))]")
            }
            style={{ opacity: saveToastOpacity }}
            role="status"
          >
            {saveToastType === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            ) : saveToastType === "error" ? (
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : null}
            <span>{saveToastMessage}</span>
          </div>
        </div>
      )}

      <Link href="/portal" className="aia-link aia-focus text-sm font-medium">
        <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />返回内网
      </Link>

      <header className="mt-8">
        <p className="aia-kicker">内网 · 账户</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">账户设置</h1>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          管理你的公开资料、研究方向、联系方式与账户安全设置。
        </p>
      </header>

      {successMessage && (
        <p role="status" className="mt-6 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-[hsl(var(--aia-red))]">
          {error}
        </p>
      )}

      <section className="mt-10 border-t aia-border-rule pt-8">
        <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">基本资料</h2>
        <p className="aia-text-muted mt-2 text-sm leading-6">
          更新公开主页上的个人资料。姓名与官方照片由管理员维护。
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <p className={labelClass}>官方照片</p>
            <div className="mt-2 flex items-center gap-4 border-t aia-border-rule py-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full aia-bg-tag">
                {currentUser.realPhoto || currentUser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.realPhoto || currentUser.avatar} alt="官方头像" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 aia-text-muted" aria-hidden="true" />
                )}
              </div>
              <p className="aia-text-muted text-sm leading-6">官方照片来自院内档案，无法在此页面修改。</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="organization">组织</label>
              <input
                id="organization"
                value={currentUser.organization === "pku" ? "北京大学通班" : "清华大学通班"}
                disabled
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cohort">年级</label>
              <input id="cohort" value={getCohortClassLabel(currentUser.cohort)} disabled className={`${inputClass} mt-1`} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="username">用户名 *</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例如：chenyinghan"
              className={`${inputClass} mt-1`}
            />
            <p className="aia-text-muted mt-1.5 text-xs leading-5">你的公开主页地址将是 /members/{username || "username"}。</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="englishName">英文姓名 *</label>
              <input
                id="englishName"
                value={englishName}
                disabled
                placeholder="档案中的英文姓名"
                className={`${inputClass} mt-1`}
              />
              <p className="aia-text-muted mt-1.5 text-xs">姓名由管理员维护。</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="chineseName">中文姓名 *</label>
              <input
                id="chineseName"
                value={chineseName}
                disabled
                placeholder="档案中的中文姓名"
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="bio">个人简介</label>
            <textarea
              id="bio"
              className={`${inputClass} mt-1 min-h-[100px] resize-y`}
              placeholder="介绍一下你自己…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <label className={labelClass} htmlFor="profileMarkdown">详细介绍</label>
                <p className="aia-text-muted mt-1 text-xs leading-5">支持 Markdown、代码块与 LaTeX 公式。</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveProfileMarkdown}
                disabled={isSavingProfileMarkdown}
              >
                {isSavingProfileMarkdown ? "正在保存…" : "单独保存详细介绍"}
              </Button>
            </div>
            <div className="mt-3">
              <MarkdownSplitEditor
                id="profileMarkdown"
                value={profileMarkdown}
                onChange={setProfileMarkdown}
                placeholder="使用 Markdown 撰写你的详细介绍（支持代码块与 LaTeX：$E=mc^2$）。"
                sourceLabel="Markdown 源码"
                previewLabel="渲染预览"
                minHeightClassName="min-h-[280px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t aia-border-rule pt-8">
        <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">研究方向</h2>
        <p className="aia-text-muted mt-2 text-sm leading-6">
          选择用于成员筛选的主要研究方向，也可以补充更具体的研究兴趣。
        </p>

        <fieldset className="mt-6">
          <legend className={labelClass}>主要方向</legend>
          <div className="mt-3 grid gap-x-6 gap-y-3 border-t aia-border-rule pt-4 sm:grid-cols-2">
            {RESEARCH_DIRECTIONS.map((direction) => (
              <label key={direction.value} className="flex items-start gap-2.5 text-sm text-[hsl(var(--aia-ink))]">
                <input
                  type="checkbox"
                  checked={researchDirections.includes(direction.value)}
                  onChange={() => handleToggleDirection(direction.value)}
                  className="aia-focus mt-0.5 h-4 w-4 accent-[hsl(var(--aia-red))]"
                />
                <span>{direction.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <label className={labelClass} htmlFor="newInterest">具体研究兴趣</label>
          <div className="mt-1 flex gap-2">
            <input
              id="newInterest"
              placeholder="添加研究兴趣"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddInterest())}
              className={inputClass}
            />
            <Button type="button" variant="outline" onClick={handleAddInterest}>添加</Button>
          </div>
          {researchInterests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {researchInterests.map((interest) => (
                <span
                  key={interest}
                  className="aia-mono inline-flex items-center gap-1.5 aia-bg-tag px-2.5 py-1 text-xs text-[hsl(var(--aia-ink))]"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="aia-focus aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))]"
                    aria-label={`移除研究兴趣：${interest}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 border-t aia-border-rule pt-8">
        <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">联系方式与链接</h2>
        <p className="aia-text-muted mt-2 text-sm leading-6">设置公开主页中展示的个人邮箱和外部链接。</p>

        <div className="mt-6 space-y-7">
          <div>
            <p className={labelClass}>个人邮箱</p>
            <div className="mt-2">
              <PersonalEmailsInput emails={personalEmails} onChange={setPersonalEmails} />
            </div>
            <p className="aia-text-muted mt-2 text-xs leading-5">
              含学号的学校邮箱会保留在账户中用于身份验证，默认不会展示在公开主页。你可以在此添加希望公开的个人邮箱；如需公开学校邮箱，也可将其加入列表。
            </p>
          </div>

          <div>
            <p className={labelClass}>个人链接</p>
            <div className="mt-2">
              <UserLinksInput links={links} onChange={setLinks} />
            </div>
            <p className="aia-text-muted mt-2 text-xs leading-5">
              可添加个人主页、Google Scholar、ORCID、GitHub、小红书、LinkedIn 等预设类型，也可添加自定义链接。
            </p>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSubmitting}
            className={isSubmitting ? "opacity-70 grayscale" : ""}
          >
            {isSubmitting ? "正在保存…" : "保存资料更改"}
          </Button>
        </div>
      </section>

      <section className="mt-10 border-t aia-border-rule pt-8">
        <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">修改密码</h2>
        <p className="aia-text-muted mt-2 text-sm leading-6">更新密码后，系统会自动退出当前账户并返回登录页。</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="currentPassword">当前密码</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="newPassword">新密码</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="confirmPassword">确认新密码</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
        </div>
        <Button className="mt-5" onClick={handleChangePassword}>更新密码</Button>
      </section>

      {currentUser.identityType === "teacher" ? (
        <section className="mt-10 border-t aia-border-rule pt-8">
          <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">Coffee Talk 设置</h2>
          <p className="aia-text-muted mt-2 text-sm leading-6">
            申请入口默认开放。关闭后，学生将无法在申请表中选择你，已有申请不受影响。
          </p>
          <div className="mt-5 border-t aia-border-rule py-4">
            {coffeeTalkAvailability === undefined ? <p className="aia-text-muted text-sm">正在读取开放状态…</p> : coffeeTalkAvailability?.profileMissing ? <p className="text-sm text-[hsl(var(--aia-red))]">教师档案暂未同步，请联系超级管理员运行教师档案同步。</p> : <p className="text-sm text-[hsl(var(--aia-ink))]">当前状态：{coffeeTalkAvailability?.open ? "已开放" : "已关闭"}</p>}
          </div>
          <Button
            type="button"
            variant={coffeeTalkAvailability?.open ? "outline" : "default"}
            onClick={handleCoffeeTalkAvailabilityChange}
            disabled={!coffeeTalkAvailability || coffeeTalkAvailability.profileMissing || isUpdatingCoffeeTalkAvailability}
          >
            {isUpdatingCoffeeTalkAvailability ? "更新中…" : coffeeTalkAvailability?.open ? "关闭 Coffee Talk 申请" : "开放 Coffee Talk 申请"}
          </Button>
        </section>
      ) : null}

      <section className="mt-10 border-t aia-border-rule pt-8">
        <h2 className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">账户操作</h2>
        <p className="aia-text-muted mt-2 text-sm leading-6">查看当前账户信息，或安全退出内网。</p>

        <dl className="mt-6 border-t aia-border-rule">
          <div className="flex flex-col gap-1 border-b aia-border-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className={labelClass}>邮箱</dt>
            <dd className="break-all text-sm text-[hsl(var(--aia-ink))]">{currentUser.email}</dd>
          </div>
          <div className="flex flex-col gap-1 border-b aia-border-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className={labelClass}>用户名</dt>
            <dd className="text-sm text-[hsl(var(--aia-ink))]">{currentUser.username}</dd>
          </div>
          <div className="flex flex-col gap-1 border-b aia-border-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className={labelClass}>个人主页</dt>
            <dd className="break-all text-sm text-[hsl(var(--aia-ink))]">/members/{currentUser.username || currentUser._id}</dd>
          </div>
          <div className="flex flex-col gap-1 border-b aia-border-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className={labelClass}>学号</dt>
            <dd className="text-sm text-[hsl(var(--aia-ink))]">{currentUser.studentId}</dd>
          </div>
          <div className="flex flex-col gap-1 border-b aia-border-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className={labelClass}>角色</dt>
            <dd className="text-sm text-[hsl(var(--aia-ink))]">{getAccountRoleLabel(currentUser.role)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => logout()}
          className="aia-focus mt-6 inline-flex items-center border aia-border-rule px-4 py-2.5 text-sm font-medium text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />退出登录
        </button>
      </section>
    </main>
  )
}
