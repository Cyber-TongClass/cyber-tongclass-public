import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Building2, Network, ScrollText, UsersRound } from "lucide-react"
import { existsSync } from "node:fs"
import { join } from "node:path"

const brandLockupPath = join(process.cwd(), "public/brand/aia/pku-iai-horizontal-lockup.png")
const hasBrandLockup = existsSync(brandLockupPath)
const heroTitle = "北京大学人工智能研究院综合服务系统"

const gatewayLinks = [
  {
    href: "/institute",
    title: "认识研究院",
    description: "定位、服务范围与公共联系入口",
    icon: Building2,
  },
  {
    href: "/people",
    title: "查找人员与团队",
    description: "教师、研究生与研究团队目录",
    icon: UsersRound,
  },
  {
    href: "/research",
    title: "浏览研究成果",
    description: "研究方向、成果与公开资料",
    icon: Network,
  },
  {
    href: "/updates",
    title: "查看动态与公告",
    description: "研究院发布的最新公开信息",
    icon: ScrollText,
  },
]

export function AIAHero() {
  return (
    <section aria-labelledby="aia-gateway-title" className="border-b aia-border-rule bg-white">
      <div className="container-custom">
        <div className="grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)]">
          <div className="flex flex-col justify-center py-14 pr-0 sm:py-20 lg:py-24 lg:pr-16 xl:pr-24">
            {hasBrandLockup ? (
              <Image
                src="/brand/aia/pku-iai-horizontal-lockup.png"
                alt="北京大学人工智能研究院"
                width={560}
                height={112}
                priority
                className="h-auto w-full max-w-[19rem] sm:max-w-[22rem]"
              />
            ) : (
              <p className="text-base font-semibold tracking-[0.08em] text-[hsl(var(--aia-red))]">
                北京大学人工智能研究院
              </p>
            )}

            <h1
              id="aia-gateway-title"
              className="mt-10 max-w-4xl text-balance text-4xl font-semibold leading-[1.24] tracking-[-0.035em] text-[hsl(var(--aia-ink))] sm:text-5xl sm:leading-[1.24] md:text-6xl md:leading-[1.24]"
            >
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-[hsl(var(--aia-ink))] sm:text-lg">
              Artificial Intelligence Agora · The Integrated Services Platform of PKU IAI
            </p>
            <p className="aia-text-muted mt-4 max-w-2xl text-sm leading-7 sm:text-base sm:leading-8">
              汇集研究院服务、研究信息与公共入口，为师生、合作伙伴和来访者提供清晰的服务路径。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
              <Link
                href="/institute"
                className="aia-focus inline-flex min-h-11 items-center gap-2 bg-[hsl(var(--aia-ink))] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--aia-red-deep))]"
              >
                探索研究院
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/portal"
                className="aia-focus inline-flex min-h-11 items-center gap-2 border aia-border-rule px-5 py-3 text-sm font-semibold text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
              >
                进入内网
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/tong-class" className="aia-link aia-focus ml-1 text-sm">
                访问通班主页
              </Link>
            </div>
          </div>

          <aside className="-mx-4 flex flex-col justify-between bg-[hsl(var(--aia-red))] px-6 py-9 text-white sm:-mx-6 sm:px-9 lg:mx-0 lg:px-9 lg:py-12 xl:px-11" aria-label="研究院公共入口">
            <div>
              <p className="text-sm font-medium text-white/75">公共服务入口</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">从一个入口开始</h2>
              <p className="mt-3 max-w-sm text-sm leading-7 text-white/75">
                按照你要了解的人、团队、研究或信息，直接进入对应目录。
              </p>
            </div>

            <nav className="mt-10 border-t border-white/25" aria-label="AIA 首页服务导航">
              {gatewayLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="aia-focus group grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 border-b border-white/25 py-5 text-white outline-offset-4 transition-colors hover:bg-white/[0.08] focus-visible:outline-white"
                >
                  <item.icon className="mt-0.5 h-5 w-5 text-white/70" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/65">{item.description}</span>
                  </span>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 text-white/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </section>
  )
}
