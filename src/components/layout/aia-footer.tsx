import Link from "next/link"
import { siteCopy } from "@/config/site-copy"

export function AiaFooter() {
  return (
    <footer className="bg-[hsl(var(--aia-ink))] text-slate-200">
      <div className="container-custom py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <section aria-labelledby="aia-footer-identity" className="max-w-xl">
            <p className="aia-mono text-sm font-semibold tracking-wide text-[hsl(var(--aia-warm)/0.7)]">
              {siteCopy.footer.aiaKicker}
            </p>
            <h2 id="aia-footer-identity" className="aia-serif mt-4 text-3xl font-semibold leading-snug tracking-wide text-white">
              {siteCopy.footer.aiaTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {siteCopy.footer.aiaDescription}
            </p>
          </section>

          <div className="grid gap-10 sm:grid-cols-2 lg:gap-16">
            <nav aria-label="研究院链接">
              <h2 className="aia-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--aia-warm)/0.7)]">
                {siteCopy.footer.instituteHeading}
              </h2>
              <ul className="mt-5 space-y-3 text-sm">
                {siteCopy.footer.instituteLinks.map((link) => (
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
                {siteCopy.footer.contactHeading}
              </h2>
              <address className="mt-5 not-italic text-sm leading-7 text-slate-300">
                <p>{siteCopy.brand.aiaName}</p>
                <p>{siteCopy.footer.address}</p>
              </address>
              <ul className="mt-4 space-y-3 text-sm">
                {siteCopy.footer.platformLinks.map((link) => (
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
            {siteCopy.footer.copyrightPrefix} {new Date().getFullYear()} Peking University Institute for Artificial Intelligence
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
