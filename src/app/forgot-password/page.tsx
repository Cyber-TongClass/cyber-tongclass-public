"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>忘记密码</CardTitle>
          <CardDescription>
            如需修改密码，请在通班群中联系对应负责人。
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm text-primary hover:underline">
            ← 返回登录
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
