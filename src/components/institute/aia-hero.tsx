import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { existsSync } from "node:fs"
import { join } from "node:path"

import { AiaRule } from "@/components/institute/editorial/rule"

const brandLockupPath = join(process.cwd(), "public/brand/aia/pku-iai-horizontal-lockup.png")
const hasBrandLockup = existsSync(brandLockupPath)

export function AIAHero() {
  return (
    <section aria-labelledby="aia-gateway-title" className="border-b aia-border-rule">
      <div className="container-custom py-16 sm:py-24">
        {hasBrandLockup ? (
          <Image
            src="/brand/aia/pku-iai-horizontal-lockup.png"
            alt="北京大学人工智能研究院"
            width={560}
            height={112}
            priority
            className="h-auto w-full max-w-xs"
          />
        ) : (
          <p className="aia-serif text-xl font-semibold tracking-[0.08em] text-[hsl(var(--aia-red))]">
            北京大学人工智能研究院
          </p>
        )}

        <h1
          id="aia-gateway-title"
          className="aia-serif mt-12 max-w-4xl text-balance text-5xl font-semibold leading-[1.24] tracking-tight text-[hsl(var(--aia-ink))] sm:text-6xl sm:leading-[1.24] md:text-7xl md:leading-[1.24]"
        >
          北京大学人工智能研究院综合服务系统
        </h1>
        <AiaRule className="mt-12 w-28" />

        <p className="mt-8 max-w-2xl text-lg font-medium text-[hsl(var(--aia-ink))]">
          Artificial Intelligence Agora · The Integrated Services Platform of PKU IAI
        </p>
        <p className="aia-text-muted mt-4 max-w-2xl text-base leading-8">
          汇集研究院服务、研究信息与公共入口，为师生、合作伙伴和来访者提供清晰的服务路径。
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            href="/institute"
            className="aia-focus inline-flex min-h-11 items-center gap-2 bg-[hsl(var(--aia-red))] px-6 py-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-[hsl(var(--aia-red-deep))]"
          >
            探索研究院
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/portal"
            className="aia-focus inline-flex min-h-11 items-center gap-2 border aia-border-rule px-6 py-3 text-sm font-semibold tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
          >
            进入内网
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/tong-class" className="aia-link aia-focus text-sm">
            访问通班主页
          </Link>
        </div>
      </div>
    </section>
  )
}
