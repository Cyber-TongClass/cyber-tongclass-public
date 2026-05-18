"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PersonalEmailsInput } from "@/components/profile/personal-emails-input"
import { UserLinksInput } from "@/components/profile/user-links-input"
import { useSignUp, useSignIn } from "@/lib/api"
import { TurnstileWidget } from "@/components/auth/turnstile-widget"
import { sanitizePersonalEmails, sanitizeUserLinks } from "@/lib/user-profile"
import { RESEARCH_DIRECTIONS } from "@/lib/research-directions"
import type { UserLink } from "@/types"
import { cohortToSelectValue, getCohortLabel, getCohortOptions, parseCohortValue, type CohortValue } from "@/lib/cohort"

type Organization = "pku" | "thu"
type PkuDomain = "@stu.pku.edu.cn" | "@pku.edu.cn" | "@alumni.pku.edu.cn"

const REGISTER_DRAFT_KEY = "tongclass_register_draft"

const cohortOptions = getCohortOptions()

const ORGANIZATIONS: Record<Organization, { label: string; cohorts: CohortValue[] }> = {
    pku: {
        label: "PKU Tong Class",
        cohorts: cohortOptions,
    },
    thu: {
        label: "THU Tong Class",
        cohorts: cohortOptions,
    },
}

export default function RegisterClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const signUp = useSignUp()
    const signIn = useSignIn()
    const [step, setStep] = useState(1)
    const [error, setError] = useState("")
    const [info, setInfo] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form data
    const [organization, setOrganization] = useState<Organization | "">("pku")
    const [cohort, setCohort] = useState<CohortValue | "">("")
    const [studentId, setStudentId] = useState("")
    const [emailDomain, setEmailDomain] = useState<PkuDomain>("@stu.pku.edu.cn")
    const [verificationCode, setVerificationCode] = useState("")
    const [isCodeSending, setIsCodeSending] = useState(false)
    const [isCodeVerifying, setIsCodeVerifying] = useState(false)
    const [isEmailStepVerified, setIsEmailStepVerified] = useState(false)
    const [emailVerificationProof, setEmailVerificationProof] = useState("")
    const [requiresTurnstile, setRequiresTurnstile] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState("")
    const [showCodeInput, setShowCodeInput] = useState(false)
    const [resendSecondsRemaining, setResendSecondsRemaining] = useState(0)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    // Profile data
    const [englishName, setEnglishName] = useState("")
    const [chineseName, setChineseName] = useState("")
    const [username, setUsername] = useState("")
    const [personalEmails, setPersonalEmails] = useState<string[]>([])
    const [bio, setBio] = useState("")
    const [researchDirections, setResearchDirections] = useState<string[]>([])
    const [researchInterests, setResearchInterests] = useState<string[]>([])
    const [newInterest, setNewInterest] = useState("")
    const [links, setLinks] = useState<UserLink[]>([])

    const effectiveEmail = useMemo(() => {
        const normalizedStudentId = studentId.trim().toLowerCase()
        if (!normalizedStudentId) return ""

        return `${normalizedStudentId}${emailDomain}`
    }, [studentId, emailDomain])

    const getExpectedEmailHint = () => `${studentId || "your_student_id"}${emailDomain}`

    useEffect(() => {
        if (resendSecondsRemaining <= 0) return

        const timer = window.setInterval(() => {
            setResendSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)

        return () => window.clearInterval(timer)
    }, [resendSecondsRemaining])

    useEffect(() => {
        if (typeof window === "undefined") return

        const resumeToken = searchParams.get("resume")
        if (!resumeToken) return

        const resumeKey = `tongclass_register_resume_${resumeToken}`
        const resumeRaw = localStorage.getItem(resumeKey)
        if (!resumeRaw) return

        const draftRaw = localStorage.getItem(REGISTER_DRAFT_KEY)

        try {
            const resume = JSON.parse(resumeRaw) as { email?: string; proof?: string; createdAt?: number }
            const draft = draftRaw
                ? (JSON.parse(draftRaw) as {
                    organization?: Organization
                    cohort?: CohortValue | ""
                    studentId?: string
                    emailDomain?: PkuDomain
                })
                : null

            if (!resume.email || !resume.proof || !resume.createdAt) return
            if (Date.now() - resume.createdAt > 30 * 60_000) {
                localStorage.removeItem(resumeKey)
                return
            }

            if (draft?.organization) setOrganization(draft.organization)
            if (typeof draft?.cohort === "number") setCohort(draft.cohort)
            if (draft?.studentId) setStudentId(draft.studentId)
            if (draft?.emailDomain) setEmailDomain(draft.emailDomain)

            const left = (draft?.studentId || "").trim().toLowerCase()
            const computed = left && draft?.emailDomain ? `${left}${draft.emailDomain}` : ""
            if (computed && computed === resume.email.trim().toLowerCase()) {
                setEmailVerificationProof(resume.proof)
                setIsEmailStepVerified(true)
                setShowCodeInput(true)
                setStep(3)
                setInfo("Email was verified from link. Continuing at Step 3.")
                localStorage.removeItem(resumeKey)
            }
        } catch {
            // Ignore malformed cache
        }
    }, [searchParams])

    useEffect(() => {
        if (typeof window === "undefined") return

        localStorage.setItem(
            REGISTER_DRAFT_KEY,
            JSON.stringify({
                organization,
                cohort,
                studentId,
                emailDomain,
            })
        )
    }, [organization, cohort, studentId, emailDomain])

    const validateStep1 = () => {
        if (!cohort || !studentId) {
            setError("Please fill in all fields")
            return false
        }
        // Validate student ID format
        if (studentId.length < 6) {
            setError("Invalid student ID")
            return false
        }

        if (organization !== "pku") {
            setError("Only PKU registration is currently available")
            return false
        }
        return true
    }

    const validateStep2 = () => {
        const normalized = effectiveEmail.toLowerCase()
        const validDomains: PkuDomain[] = ["@stu.pku.edu.cn", "@pku.edu.cn", "@alumni.pku.edu.cn"]
        const isValidDomain = validDomains.some((domain) => normalized.endsWith(domain))
        const hasFixedPrefix = normalized.startsWith(`${studentId.toLowerCase()}@`) || validDomains.some((domain) => normalized === `${studentId.toLowerCase()}${domain}`)

        if (!isValidDomain || !hasFixedPrefix) {
            setError("Email must use one of: @stu.pku.edu.cn, @pku.edu.cn, @alumni.pku.edu.cn")
            return false
        }

        if (!isEmailStepVerified) {
            setError("Please verify your email code before continuing")
            return false
        }

        return true
    }

    const validateStep3 = () => {
        if (password.length < 8) {
            setError("Password must be at least 8 characters")
            return false
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return false
        }
        return true
    }

    const handleNext = () => {
        setError("")
        setInfo("")

        if (step === 1 && !validateStep1()) return

        if (step === 1) {
            setInfo("")
        }

        if (step === 2 && !validateStep2()) return
        if (step === 3 && !validateStep3()) return

        if (step < 4) {
            setStep(step + 1)
        }
    }

    const handleBack = () => {
        setError("")
        setInfo("")
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const handleSendCode = async () => {
        const targetEmail = effectiveEmail.trim()

        if (!targetEmail) {
            setError("Email is missing")
            return
        }

        if (resendSecondsRemaining > 0) {
            setInfo(`Resend after ${resendSecondsRemaining}s`)
            return
        }

        setIsCodeSending(true)
        setError("")
        setInfo("")

        try {
            const response = await fetch("/api/request-verification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: targetEmail,
                    purpose: "email_verification",
                    turnstileToken: turnstileToken || undefined,
                }),
            })

            const data = await response.json()
            if (data?.requiresTurnstile) {
                setRequiresTurnstile(true)
                setInfo("Please complete Turnstile verification, then send code again.")
                return
            }

            if (typeof data?.cooldownRemainingMs === "number" && data.cooldownRemainingMs > 0) {
                const seconds = Math.ceil(data.cooldownRemainingMs / 1000)
                setResendSecondsRemaining(seconds)
                setInfo(`Resend after ${seconds}s`)
                return
            }

            if (!response.ok || !data?.ok) {
                setError(data?.message || "Failed to send verification code")
                return
            }

            setShowCodeInput(true)
            setResendSecondsRemaining(60)
            setInfo("Verification code sent. Please check your mailbox.")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send verification code")
        } finally {
            setIsCodeSending(false)
        }
    }

    const handleVerifyCode = async () => {
        const targetEmail = effectiveEmail.trim()

        if (!targetEmail || !verificationCode.trim()) {
            setError("Please enter the verification code")
            return
        }

        setIsCodeVerifying(true)
        setError("")
        setInfo("")

        try {
            const response = await fetch("/api/verify-token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    purpose: "email_verification",
                    email: targetEmail,
                    code: verificationCode.trim(),
                }),
            })

            const data = await response.json()
            if (!response.ok || !data?.ok) {
                setError(data?.message || "Verification code is invalid or expired")
                return
            }

            setIsEmailStepVerified(true)
            setEmailVerificationProof(typeof data?.proof === "string" ? data.proof : "")
            setInfo("Email verification succeeded. You can continue.")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to verify code")
        } finally {
            setIsCodeVerifying(false)
        }
    }

    const handleSubmit = async () => {
        if (!cohort || !englishName.trim() || !chineseName.trim() || !username.trim()) {
            setError("Please fill in required fields")
            return
        }

        setIsSubmitting(true)
        setError("")
        setInfo("")

        try {
            const normalizedEmail = effectiveEmail.trim().toLowerCase()
            const normalizedPersonalEmails = sanitizePersonalEmails(personalEmails)
            const normalizedResearchInterests = researchInterests
                .map((interest) => interest.trim())
                .filter(Boolean)
            const normalizedResearchDirections = researchDirections
                .map((direction) => direction.trim())
                .filter(Boolean)
            const normalizedLinks = sanitizeUserLinks(links)

            // First sign up with our custom auth
            const signUpResult = await signUp({
                email: normalizedEmail,
                password,
                englishName: englishName.trim(),
                chineseName: chineseName.trim(),
                username: username.trim(),
                organization: organization as Organization,
                cohort,
                studentId: studentId.trim(),
                personalEmails: normalizedPersonalEmails,
                bio: bio.trim() || undefined,
                researchDirections: normalizedResearchDirections,
                researchInterests: normalizedResearchInterests,
                links: normalizedLinks,
            })

            if (signUpResult === null || signUpResult === undefined) {
                setError("Registration failed")
                return
            }

            if (isEmailStepVerified && emailVerificationProof) {
                const completeResponse = await fetch("/api/complete-email-verification", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userId: signUpResult,
                        email: normalizedEmail,
                        proof: emailVerificationProof,
                    }),
                })

                if (!completeResponse.ok) {
                    setInfo("Account created, but email verification status could not be persisted. You can verify via email link later.")
                }
            }

            // Then sign in to get the session
            const signInResult = await signIn({
                studentId: studentId.trim(),
                password,
            })

            if (signInResult === null || signInResult === undefined || !signInResult.success) {
                setError("Registration successful but login failed. Please try logging in.")
                router.push("/login?registered=true")
                return
            }

            router.push("/login?registered=true")
        } catch (err: any) {
            setError(err.message || "Registration failed")
        } finally {
            setIsSubmitting(false)
        }
    }

    const addResearchInterest = () => {
        if (newInterest && !researchInterests.includes(newInterest)) {
            setResearchInterests([...researchInterests, newInterest])
            setNewInterest("")
        }
    }

    const removeResearchInterest = (interest: string) => {
        setResearchInterests(researchInterests.filter(i => i !== interest))
    }

    const toggleResearchDirection = (direction: string) => {
        setResearchDirections((previous) =>
            previous.includes(direction)
                ? previous.filter((item) => item !== direction)
                : [...previous, direction]
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <Card className="w-full max-w-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">
                        Create Account
                    </CardTitle>
                    <CardDescription>
                        Step {step} of 4: {" "}
                        {step === 1 && "Select Organization"}
                        {step === 2 && "Verify Email"}
                        {step === 3 && "Set Password"}
                        {step === 4 && "Complete Profile"}
                    </CardDescription>

                    {/* Progress bar */}
                    <div className="flex justify-center gap-1 mt-4">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 w-8 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-gray-200"
                                    }`}
                            />
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}
                    {info && (
                        <div className="p-3 text-sm text-blue-700 bg-blue-50 rounded-md">
                            {info}
                        </div>
                    )}

                    {/* Step 1: Organization Selection */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="organization">Organization</Label>
                                <select
                                    id="organization"
                                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={organization}
                                    onChange={(e) => setOrganization(e.target.value as Organization)}
                                    required
                                    disabled
                                >
                                    <option value="pku">PKU Tong Class</option>
                                </select>
                                <p className="text-xs text-slate-600">THU registration is temporarily unavailable.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cohort">Cohort / Year</Label>
                                <select
                                    id="cohort"
                                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={cohort}
                                    onChange={(e) => setCohort(parseCohortValue(e.target.value))}
                                    required
                                    disabled={!organization}
                                >
                                    <option value="">Select your year of admission</option>
                                    {organization && ORGANIZATIONS[organization]?.cohorts.map((year) => (
                                        <option key={year} value={cohortToSelectValue(year)}>
                                            {getCohortLabel(year)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="studentId">Student ID</Label>
                                <Input
                                    id="studentId"
                                    type="text"
                                    placeholder="Enter your student ID"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-slate-600">
                                    Your student ID from Peking University or Tsinghua University
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Email Verification */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="emailStudentPrefix">Email Address</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                                    <Input
                                        id="emailStudentPrefix"
                                        type="text"
                                        value={studentId}
                                        readOnly
                                        className="bg-slate-100 text-slate-600"
                                    />
                                    <select
                                        value={emailDomain}
                                        onChange={(e) => {
                                            setEmailDomain(e.target.value as PkuDomain)
                                            setIsEmailStepVerified(false)
                                            setEmailVerificationProof("")
                                        }}
                                        className="flex h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                                    >
                                        <option value="@stu.pku.edu.cn">@stu.pku.edu.cn</option>
                                        <option value="@pku.edu.cn">@pku.edu.cn</option>
                                        <option value="@alumni.pku.edu.cn">@alumni.pku.edu.cn</option>
                                    </select>
                                </div>
                                <p className="text-xs text-slate-600">Current target email: {getExpectedEmailHint()}</p>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    type="button"
                                    className="w-full font-semibold"
                                    onClick={handleSendCode}
                                    disabled={isCodeSending || resendSecondsRemaining > 0 || (requiresTurnstile && !turnstileToken)}
                                >
                                    {isCodeSending
                                        ? "Sending..."
                                        : resendSecondsRemaining > 0
                                            ? `Resend after ${resendSecondsRemaining}s`
                                            : "Verify Email"}
                                </Button>

                                {requiresTurnstile && (
                                    <div className="rounded-md border p-3 bg-slate-100/30">
                                        <p className="text-xs text-slate-600 mb-2">
                                            Additional safety verification is required before sending another code.
                                        </p>
                                        <TurnstileWidget onVerify={setTurnstileToken} />
                                    </div>
                                )}

                                {showCodeInput && (
                                    <>
                                        <Label htmlFor="verificationCode">Verification Code</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="verificationCode"
                                                type="text"
                                                placeholder="Enter code"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleVerifyCode}
                                                disabled={!verificationCode.trim() || isCodeVerifying}
                                            >
                                                {isCodeVerifying ? "Verifying..." : "Verify"}
                                            </Button>
                                        </div>
                                    </>
                                )}
                                <p className="text-xs text-slate-600">
                                    Click the verification link in email first. If link fails, use the code input above.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Password */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Profile Completion */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="englishName">English Name *</Label>
                                    <Input
                                        id="englishName"
                                        type="text"
                                        placeholder="e.g., Tong Tong"
                                        value={englishName}
                                        onChange={(e) => setEnglishName(e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-slate-600">
                                        This will be displayed on your public profile.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="chineseName">Chinese Name *</Label>
                                    <Input
                                        id="chineseName"
                                        type="text"
                                        placeholder="例如：通通"
                                        value={chineseName}
                                        onChange={(e) => setChineseName(e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-slate-600">
                                        This will be shown together with your English name.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-slate-600">
                                    Used for login, not displayed publicly.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Personal Emails (Optional)</Label>
                                <PersonalEmailsInput emails={personalEmails} onChange={setPersonalEmails} />
                                <p className="text-xs text-slate-600">
                                    Your school email, which includes your student ID, is kept on the account to protect your identity and is not displayed on your public profile. By default, only the personal email addresses you provide are shown publicly. However, if you wish to display your school email, you may add it here.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio (Optional)</Label>
                                <textarea
                                    id="bio"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    placeholder="Tell us about yourself..."
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Research Interests (Optional)</Label>
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
                                                    onChange={() => toggleResearchDirection(direction.value)}
                                                    className="mt-1 rounded"
                                                />
                                                <span>{direction.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Add research interest"
                                        value={newInterest}
                                        onChange={(e) => setNewInterest(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addResearchInterest())}
                                    />
                                    <Button type="button" variant="outline" onClick={addResearchInterest}>
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
                                                    onClick={() => removeResearchInterest(interest)}
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
                                <Label>Profile Links (Optional)</Label>
                                <UserLinksInput links={links} onChange={setLinks} />
                                <p className="text-xs text-slate-600">
                                    Choose from preset link types like Homepage, Google Scholar, GitHub, X, Xiaohongshu, LinkedIn, or use Custom for anything else.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === 1 || isSubmitting}
                    >
                        Back
                    </Button>

                    {step < 4 ? (
                        <Button type="button" onClick={handleNext}>
                            Continue
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating Account..." : "Create Account"}
                        </Button>
                    )}
                </CardFooter>

                <CardFooter className="pt-0">
                    <p className="text-sm text-center text-slate-600 w-full">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline font-medium">
                            Sign In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
