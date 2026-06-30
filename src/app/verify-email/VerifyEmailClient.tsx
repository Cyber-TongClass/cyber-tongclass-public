"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VerifyEmailClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token") || ""
    const purpose = (searchParams.get("purpose") || "email_verification") as "email_verification"

    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle")
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setMessage("Verification token is missing.")
            return
        }

        let cancelled = false
        setStatus("loading")

        fetch("/api/verify-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, purpose }),
        })
            .then(async (res) => {
                const data = await res.json()
                if (cancelled) return
                if (res.ok && data.ok) {
                    setStatus("ok")
                    setMessage(data.message || "Email verification succeeded.")

                    if (typeof window !== "undefined" && data?.proof && data?.email) {
                        const resumeKey =
                            typeof crypto !== "undefined" && "randomUUID" in crypto
                                ? crypto.randomUUID()
                                : `${Date.now()}-${Math.random().toString(16).slice(2)}`
                        localStorage.setItem(
                            `tongclass_register_resume_${resumeKey}`,
                            JSON.stringify({
                                email: String(data.email),
                                proof: String(data.proof),
                                createdAt: Date.now(),
                            })
                        )

                        setTimeout(() => {
                            router.push(`/register?resume=${encodeURIComponent(resumeKey)}&step=3`)
                        }, 1200)
                    }
                    return
                }
                setStatus("error")
                setMessage(data.message || "Verification failed.")
            })
            .catch(() => {
                if (cancelled) return
                setStatus("error")
                setMessage("Verification failed due to network error.")
            })

        return () => {
            cancelled = true
        }
    }, [token, purpose, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Email Verification</CardTitle>
                    <CardDescription>
                        {status === "loading" ? "Checking your verification token..." : "Verification result"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className={status === "ok" ? "text-green-700" : "text-red-600"}>{message}</p>
                </CardContent>
                <CardFooter>
                    <Button asChild>
                        <Link href="/login">Go to login</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
