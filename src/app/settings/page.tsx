"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { useUpdatePasswordWithCurrent, useUpdateUser } from "@/lib/api"
import { PersonalEmailsInput } from "@/components/profile/personal-emails-input"
import { UserLinksInput } from "@/components/profile/user-links-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserLinks, getUserPersonalEmails, sanitizePersonalEmails, sanitizeUserLinks } from "@/lib/user-profile"
import { RESEARCH_DIRECTIONS } from "@/lib/research-directions"
import type { UserLink } from "@/types"
import { User, CheckCircle, XCircle } from "lucide-react"
import { getCohortClassLabel } from "@/lib/cohort"

const MarkdownSplitEditor = dynamic(
  () => import("@/components/markdown/markdown-split-editor").then((mod) => mod.MarkdownSplitEditor),
  {
    ssr: false,
    loading: () => <p className="text-sm text-slate-600">编辑器加载中...</p>,
  }
)

export default function SettingsPage() {
  const router = useRouter()
  const { currentUser, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const updateUser = useUpdateUser()
  const updatePasswordWithCurrent = useUpdatePasswordWithCurrent()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingProfileMarkdown, setIsSavingProfileMarkdown] = useState(false)
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
      router.push("/login")
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
      const msg = "Username is required"
      setError(msg)
      setSuccessMessage("")
      showToast("error", msg)
      return
    }

    if (!englishName.trim() || !chineseName.trim()) {
      const msg = "English name and Chinese name are required"
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

      setSuccessMessage("Profile updated successfully!")
      showToast("success", "Profile updated successfully!", 2000)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile"
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

      setSuccessMessage("Profile markdown updated successfully!")
      showToast("success", "Profile markdown updated successfully!", 2000)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile markdown"
      setError(msg)
      showToast("error", msg, 4000)
    } finally {
      setIsSavingProfileMarkdown(false)
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
      setError("You must be logged in to change your password")
      return
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields")
      return
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Confirm password does not match new password")
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
      const message = "Password updated successfully. Signing you out..."
      setSuccessMessage(message)
      showToast("success", message, 1500)
      window.setTimeout(() => {
        logout("/login?passwordChanged=true")
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password"
      if (message === "Current password is incorrect") {
        setError("Current password is incorrect")
        return
      }
      setError(message)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      {showSaveToast && (
        <div className="fixed top-4 right-4 z-50 pointer-events-none">
          <div
            className={
              "flex items-center gap-3 px-4 py-2 rounded-md shadow-lg transition-opacity duration-300 font-sans font-bold text-white text-lg " +
              (saveToastType === "success" ? "bg-green-600" : saveToastType === "error" ? "bg-red-600" : "bg-black/80")
            }
            style={{ opacity: saveToastOpacity }}
          >
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10">
              {saveToastType === "success" ? (
                <CheckCircle className="h-5 w-5 text-white" />
              ) : saveToastType === "error" ? (
                <XCircle className="h-5 w-5 text-white" />
              ) : null}
            </span>
            <span>{saveToastMessage}</span>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-gray-900">Account Settings</h1>

        {successMessage && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your public profile information. Please write public-facing fields in English except Chinese Name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Official Photo</Label>
              <div className="flex items-center gap-4 rounded-md border border-slate-200/70 bg-slate-100/20 p-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {currentUser.realPhoto || currentUser.avatar ? (
                    <img src={currentUser.realPhoto || currentUser.avatar} alt="Official profile photo" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Profile photos are managed from official records and cannot be changed here.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input value={currentUser.organization === "pku" ? "PKU Tong Class" : "THU Tong Class"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Cohort</Label>
                <Input value={getCohortClassLabel(currentUser.cohort)} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., chenyinghan"
              />
              <p className="text-xs text-slate-600">
                Your public profile URL will be /members/{username || "username"}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="englishName">English Name *</Label>
              <Input
                id="englishName"
                value={englishName}
                disabled
                placeholder="English name on file"
              />
              <p className="text-xs text-slate-600">Names are managed by administrators.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chineseName">Chinese Name *</Label>
              <Input
                id="chineseName"
                value={chineseName}
                disabled
                placeholder="Chinese name on file"
              />
            </div>

            <div className="space-y-2">
              <Label>Personal Emails</Label>
              <PersonalEmailsInput emails={personalEmails} onChange={setPersonalEmails} />
              <p className="text-xs text-slate-600">
                Your school email, which includes your student ID, is kept on the account to protect your identity and is not displayed on your public profile. By default, only the personal email addresses you provide are shown publicly. However, if you wish to display your school email, you may add it here.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="profileMarkdown">Profile Markdown</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveProfileMarkdown}
                  disabled={isSavingProfileMarkdown}
                >
                  {isSavingProfileMarkdown ? "Saving Markdown..." : "Save Markdown"}
                </Button>
              </div>
              <MarkdownSplitEditor
                id="profileMarkdown"
                value={profileMarkdown}
                onChange={setProfileMarkdown}
                placeholder="Write your profile in Markdown (supports code blocks and LaTeX: $E=mc^2$)."
                sourceLabel="Markdown Source"
                previewLabel="Rendered Profile"
                minHeightClassName="min-h-[280px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Research Interests</Label>
              <div className="rounded-md border border-slate-200/70 p-3">
                <p className="mb-3 text-xs text-slate-600">
                  Select broad research directions for member filtering. Free-form interests can be added below.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {RESEARCH_DIRECTIONS.map((direction) => (
                    <label key={direction.value} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={researchDirections.includes(direction.value)}
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
                  placeholder="Add research interest"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddInterest())}
                />
                <Button type="button" variant="outline" onClick={handleAddInterest}>
                  Add
                </Button>
              </div>
              {researchInterests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {researchInterests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(interest)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Profile Links</Label>
              <UserLinksInput links={links} onChange={setLinks} />
              <p className="text-xs text-slate-600">
                Use preset link types like Homepage, Google Scholar, ORCID, GitHub, X, Xiaohongshu, LinkedIn, or add custom links.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={isSubmitting}
              className={isSubmitting ? "opacity-70 grayscale" : ""}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleChangePassword}>
              Change Password
            </Button>
          </CardFooter>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Email</span>
              <span className="font-medium">{currentUser.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Username</span>
              <span className="font-medium">{currentUser.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Profile URL</span>
              <span className="font-medium">/members/{currentUser.username || currentUser._id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Student ID</span>
              <span className="font-medium">{currentUser.studentId}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Role</span>
              <span className="font-medium capitalize">{currentUser.role.replace("_", " ")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
