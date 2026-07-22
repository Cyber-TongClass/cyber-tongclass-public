"use client"

import Link from "next/link"
import { ArrowLeft, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function OAFormSubmissionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  void error

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] px-4 py-10">
      <main className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="rounded-full bg-slate-100 p-3 text-slate-600"><ShieldAlert className="h-7 w-7" /></span>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900">无法查看该提交记录</h1>
              <p className="text-sm text-slate-600">该记录可能不存在、暂时不可用，或你没有访问权限。</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" variant="outline" onClick={reset}>重试</Button>
              <Button asChild><Link href="/intranet/forms/submissions"><ArrowLeft className="mr-2 h-4 w-4" />返回我的提交</Link></Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
