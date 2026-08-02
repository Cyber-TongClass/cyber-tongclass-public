"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function VerifyEmailClient() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token") || ""
    const purpose = (searchParams.get("purpose") || "email_verification") as "email_verification"

    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle")
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setMessage("缺少验证令牌，请重新打开验证邮件中的链接。")
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
                    setMessage(data.message || "邮箱验证成功。")

                    return
                }
                setStatus("error")
                setMessage(data.message || "邮箱验证失败。")
            })
            .catch(() => {
                if (cancelled) return
                setStatus("error")
                setMessage("网络连接异常，邮箱验证失败。")
            })

        return () => {
            cancelled = true
        }
    }, [token, purpose])

    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-12">
            <section className="w-full max-w-md border aia-border-rule px-6 py-8 sm:px-8 sm:py-10">
                <header>
                    <p className="aia-kicker">账户 · 邮箱验证</p>
                    <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
                        邮箱验证
                    </h1>
                    <p className="aia-text-muted mt-3 text-sm leading-6">
                        {status === "loading" ? "正在检查您的验证令牌…" : "以下是本次邮箱验证结果。"}
                    </p>
                </header>

                <div className="mt-8 border-t aia-border-rule pt-6">
                    <div className="flex items-start gap-3">
                        {status === "loading" || status === "idle" ? (
                            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin aia-text-muted" aria-hidden="true" />
                        ) : status === "ok" ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--aia-ink))]" aria-hidden="true" />
                        ) : (
                            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--aia-red))]" aria-hidden="true" />
                        )}
                        <p
                            role="status"
                            className={
                                status === "error"
                                    ? "text-sm leading-6 text-[hsl(var(--aia-red))]"
                                    : "aia-text-muted text-sm leading-6"
                            }
                        >
                            {message || "正在准备验证…"}
                        </p>
                    </div>

                    <Button asChild>
                        <Link href="/login" className="mt-6">前往登录</Link>
                    </Button>
                </div>
            </section>
        </main>
    )
}
