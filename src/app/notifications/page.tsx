import { ArrowLeft } from "lucide-react"

import { AiaNotificationInboxClient } from "@/components/notifications/aia-notification-inbox-client"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"

export default function NotificationsPage() {
  return (
    <main className="container-custom max-w-3xl py-10 sm:py-12">
      <SafeReturnLink
        fallback="/portal/list"
        className="aia-link aia-focus inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回进入位置
      </SafeReturnLink>
      <header className="mt-8" aria-labelledby="aia-notifications-heading">
        <p className="aia-kicker">消息 · 通知</p>
        <h1
          id="aia-notifications-heading"
          className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]"
        >
          站内信
        </h1>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          服务申请、审批处理与系统消息会汇集在这里；每条链接仍会按账户权限单独校验。
        </p>
      </header>
      <section className="mt-10 border-t aia-border-rule pt-8" aria-label="通知列表">
        <AiaNotificationInboxClient />
      </section>
    </main>
  )
}
