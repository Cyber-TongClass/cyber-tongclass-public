"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { INTRANET_WPS_URL } from "@/lib/intranet"

export default function WpsPage() {
  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)] py-10">
      <div className="container-custom space-y-6">
        <Button asChild variant="ghost" className="-ml-3 gap-2">
          <Link href="/tong-class/intranet">
            <ArrowLeft className="h-4 w-4" />
            返回内网首页
          </Link>
        </Button>

        <div>
          <h1 className="text-4xl font-extrabold text-slate-900">通班工作 WPS</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            想要参与通班自治委员会工作的同学，可以申请加入通班 WPS workspace。在申请通过后，你将获得通班学生工作历年材料资源。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              加入通班 WPS workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-slate-600">
              点击下方按钮后会跳转到 WPS 外部协作页面。请使用北京大学的教育版WPS账号申请加入「北京大学|PKU通班」。
            </p>
            <Button asChild className="gap-2">
              <a href={INTRANET_WPS_URL} target="_blank" rel="noopener noreferrer">
                前往申请加入
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <p className="text-xs text-slate-500 break-all">{INTRANET_WPS_URL}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
