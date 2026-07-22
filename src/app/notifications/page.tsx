import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { AiaNotificationInboxClient } from "@/components/notifications/aia-notification-inbox-client"

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回 AIA 首页
        </Link>
        <section className="mt-6" aria-labelledby="aia-notifications-heading">
          <p className="text-sm font-semibold text-primary">AIA</p>
          <h1 id="aia-notifications-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">站内信</h1>
          <p className="mt-3 leading-7 text-slate-600">服务申请、审批处理与系统消息会汇集在这里；每条链接仍会按账户权限单独校验。</p>
          <div className="mt-7"><AiaNotificationInboxClient /></div>
        </section>
      </div>
    </div>
  )
}
