"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg border aia-border-rule px-6 py-8 sm:px-8 sm:py-10">
        <header>
          <p className="aia-kicker">账户 · 注册</p>
          <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
            公开注册已停用
          </h1>
          <p className="aia-text-muted mt-3 text-sm leading-6">
            AIA 现由管理员统一创建账户，不开放邮箱自助注册。
          </p>
        </header>

        <div className="mt-8 border-t aia-border-rule pt-6">
          <p className="aia-text-muted text-sm leading-6">
            如需开通北京大学人工智能研究院综合服务系统账号，请联系所属单位管理员。已有账号的用户可直接使用账号和密码登录，并在登录后前往个人设置修改密码。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button asChild>
              <Link href="/login">前往登录</Link>
            </Button>
            <Link href="/" className="aia-link aia-focus text-sm font-medium">
              <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" />
              返回首页
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
