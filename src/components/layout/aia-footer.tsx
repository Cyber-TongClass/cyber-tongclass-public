import Link from "next/link"

const instituteLinks = [
  { name: "研究院概况", href: "/institute" },
  { name: "人员目录", href: "/people" },
  { name: "研究团队", href: "/groups" },
  { name: "研究成果", href: "/research" },
]

const platformLinks = [
  { name: "最新动态", href: "/updates" },
  { name: "服务中心", href: "/services" },
  { name: "联系研究院", href: "/contact" },
  { name: "通班", href: "/tong-class" },
]

export function AiaFooter() {
  return (
    <footer className="border-t border-[hsl(var(--aia-red)/0.2)] bg-[hsl(var(--aia-ink))] text-slate-100">
      <div className="container-custom grid gap-10 py-12 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="aia-footer-identity">
          <h2 id="aia-footer-identity" className="font-serif text-xl font-semibold tracking-wide">
            北京大学人工智能研究院
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">北京大学人工智能研究院综合服务系统</p>
          <p className="mt-5 text-sm font-semibold tracking-[0.12em] text-[hsl(var(--aia-warm))]">AIA · ARTIFICIAL INTELLIGENCE AGORA</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">The Integrated Services Platform of PKU IAI</p>
        </section>

        <nav aria-label="研究院链接">
          <h2 className="text-sm font-semibold text-white">研究院</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {instituteLinks.map((link) => (
              <li key={link.href}>
                <Link className="text-slate-300 transition-colors hover:text-white" href={link.href}>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="aia-footer-contact">
          <h2 id="aia-footer-contact" className="text-sm font-semibold text-white">
            联系与平台
          </h2>
          <address className="mt-4 not-italic text-sm leading-6 text-slate-300">
            <p>北京大学人工智能研究院</p>
            <p>北京市海淀区颐和园路5号</p>
          </address>
          <ul className="mt-4 space-y-3 text-sm">
            {platformLinks.map((link) => (
              <li key={link.href}>
                <Link className="text-slate-300 transition-colors hover:text-white" href={link.href}>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="border-t border-white/15">
        <div className="container-custom flex flex-col gap-2 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Peking University Institute for Artificial Intelligence</p>
          <a className="transition-colors hover:text-white" href="https://www.pku.edu.cn/" rel="noreferrer" target="_blank">
            Peking University
          </a>
        </div>
      </div>
    </footer>
  )
}
