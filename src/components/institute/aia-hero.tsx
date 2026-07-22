import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Landmark } from "lucide-react"
import { existsSync } from "node:fs"
import { join } from "node:path"

const brandLockupPath = join(process.cwd(), "public/brand/aia/pku-iai-horizontal-lockup.png")
const hasBrandLockup = existsSync(brandLockupPath)

function AIANameFallback() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm">
      <Landmark className="h-5 w-5" aria-hidden="true" />
      <span>北京大学人工智能研究院</span>
    </div>
  )
}

export function AIAHero() {
  return (
    <section
      aria-labelledby="aia-gateway-title"
      className="relative overflow-hidden bg-[hsl(211,54%,20%)] text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(116,190,255,0.32),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.14),_transparent_36%)]" aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_100%)] lg:block" aria-hidden="true" />

      <div className="container-custom relative py-16 sm:py-20 md:py-28">
        <div className="max-w-4xl">
          {hasBrandLockup ? (
            <Image
              src="/brand/aia/pku-iai-horizontal-lockup.png"
              alt="北京大学人工智能研究院"
              width={560}
              height={112}
              priority
              className="mb-7 h-auto w-full max-w-sm"
            />
          ) : (
            <div className="mb-7">
              <AIANameFallback />
            </div>
          )}

          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100 sm:text-base">
            Artificial Intelligence Agora
          </p>
          <h1 id="aia-gateway-title" className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            北京大学人工智能研究院综合服务系统
          </h1>
          <p className="mt-5 text-lg font-medium text-white sm:text-xl">
            The Integrated Services Platform of PKU IAI
          </p>
          <p className="mt-5 max-w-2xl text-base leading-7 text-sky-50/90 sm:text-lg">
            AIA Academic Gateway 汇集研究院服务、研究信息与公共入口，为师生、合作伙伴和来访者提供清晰的服务路径。
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/institute"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-[hsl(211,54%,24%)] shadow-sm transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(211,54%,20%)]"
            >
              探索研究院
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/tong-class"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/50 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(211,54%,20%)]"
            >
              访问通班主页
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
