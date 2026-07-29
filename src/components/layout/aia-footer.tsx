import Link from "next/link"

const instituteLinks = [
  { name: "研究院概况", href: "/institute" },
  { name: "人员目录", href: "/people" },
  { name: "研究团队", href: "/groups" },
  { name: "研究成果", href: "/research" },
]

const platformLinks = [
  { name: "最新动态", href: "/updates" },
  { name: "通班", href: "/tong-class" },
  { name: "联系研究院", href: "/contact" },
]

export function AiaFooter() {
  return (
    <footer className="bg-[hsl(var(--aia-ink))] text-slate-200">
      <div className="container-custom py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <section aria-labelledby="aia-footer-identity" className="max-w-xl">
            <p className="aia-mono text-sm font-semibold tracking-wide text-[hsl(var(--aia-warm)/0.7)]">
              AIA · Artificial Intelligence Agora
            </p>
            <h2 id="aia-footer-identity" className="aia-serif mt-4 text-3xl font-semibold leading-snug tracking-wide text-white">
              北京大学人工智能研究院
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              北京大学人工智能研究院综合服务系统 — The Integrated Services Platform of PKU IAI
            </p>
          </section>

          <div className="grid gap-10 sm:grid-cols-2 lg:gap-16">
            <nav aria-label="研究院链接">
              <h2 className="aia-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--aia-warm)/0.7)]">
                研究院
              </h2>
              <ul className="mt-5 space-y-3 text-sm">
                {instituteLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-slate-300 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
                      href={link.href}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <section aria-labelledby="aia-footer-contact">
              <h2 id="aia-footer-contact" className="aia-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--aia-warm)/0.7)]">
                联系与平台
              </h2>
              <address className="mt-5 not-italic text-sm leading-7 text-slate-300">
                <p>北京大学人工智能研究院</p>
                <p>北京市海淀区北京大学资源西楼 2205</p>
              </address>
              <ul className="mt-4 space-y-3 text-sm">
                {platformLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-slate-300 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
                      href={link.href}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-custom flex flex-col gap-2 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="aia-mono tracking-wide">
            © {new Date().getFullYear()} Peking University Institute for Artificial Intelligence
          </p>
          <a
            className="underline decoration-white/15 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
            href="https://www.pku.edu.cn/"
            rel="noreferrer"
            target="_blank"
          >
            Peking University
          </a>
        </div>
      </div>
    </footer>
  )
}
