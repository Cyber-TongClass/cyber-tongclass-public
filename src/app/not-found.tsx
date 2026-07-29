import Link from "next/link"

export default function NotFound() {
  return (
    <div className="container-custom flex min-h-[60vh] flex-col justify-center py-20">
      <p className="aia-kicker">404 · Not Found</p>
      <h1 className="aia-serif mt-5 text-4xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-5xl">
        页面不存在
      </h1>
      <hr aria-hidden="true" className="aia-hr mt-8 w-24" />
      <p className="aia-text-muted mt-6 max-w-xl text-base leading-8">
        你访问的页面可能已被删除或地址错误。可以返回首页，或进入内网查看与你相关的内容。
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <Link
          href="/"
          className="aia-focus border aia-border-rule px-4 py-2.5 text-sm font-medium tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
        >
          返回首页
        </Link>
        <Link href="/portal" className="aia-link aia-focus text-sm">
          进入内网
        </Link>
      </div>
    </div>
  )
}
