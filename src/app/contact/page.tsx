import type { Metadata } from "next"
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react"

import { AiaPageHero } from "@/components/institute/editorial/page-hero"
import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"

export const metadata: Metadata = {
  title: "联系与咨询",
  description: "北京大学人工智能研究院公共联系入口与服务说明。",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <AiaPageHero
        kicker="联系 · Contact"
        title="联系与咨询"
        lede="通过研究院公开邮箱、电话或官方网站完成咨询；涉及具体业务时，请在来信中说明事项与联系方式。"
      />

      <section aria-labelledby="contact-channels-title" className="container-custom py-14 sm:py-16">
        <AiaSectionHeading
          kicker="联系渠道 · Channels"
          title="公共联系渠道"
          headingId="contact-channels-title"
        />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <article className="border aia-border-rule p-7">
            <Mail className="h-6 w-6 text-[hsl(var(--aia-red))]" aria-hidden="true" />
            <h3 className="aia-serif mt-5 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
              邮件咨询
            </h3>
            <p className="aia-text-muted mt-3 text-sm leading-7">
              适合研究合作、公共事务与一般咨询。请勿通过普通邮件发送身份证件、财务凭证等敏感材料。
            </p>
            <a
              className="aia-link mt-5 inline-flex min-h-11 items-center text-sm font-medium"
              href="mailto:aipku@pku.edu.cn"
            >
              aipku@pku.edu.cn
            </a>
          </article>
          <article className="border aia-border-rule p-7">
            <Phone className="h-6 w-6 text-[hsl(var(--aia-red))]" aria-hidden="true" />
            <h3 className="aia-serif mt-5 text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
              电话联系
            </h3>
            <p className="aia-text-muted mt-3 text-sm leading-7">
              工作时间可致电研究院公开电话；无人接听时建议改用邮件并留下可回访方式。
            </p>
            <a
              className="aia-link mt-5 inline-flex min-h-11 items-center text-sm font-medium"
              href="tel:+861062755373"
            >
              010-62755373
            </a>
          </article>
        </div>
        <div className="mt-8 border-t aia-border-rule pt-7 text-sm leading-7">
          <p className="flex items-start gap-2 text-[hsl(var(--aia-ink))]">
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-[hsl(var(--aia-red))]" aria-hidden="true" />
            北京市海淀区北京大学资源西楼 2205，邮编 100871
          </p>
          <a
            className="aia-link mt-3 inline-flex min-h-11 items-center gap-1"
            href="https://www.ai.pku.edu.cn/lxwm/lxfs.htm"
            target="_blank"
            rel="noreferrer"
          >
            在研究院官网核对联系方式
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  )
}
