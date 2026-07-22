"use client"

export default function UpdatesError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      role="alert"
      aria-labelledby="updates-error-title"
      className="container-custom flex min-h-[50vh] flex-col justify-center py-16 sm:py-20"
    >
      <p className="aia-kicker">Updates</p>
      <h1
        id="updates-error-title"
        className="aia-serif mt-5 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))] sm:text-4xl"
      >
        内容加载失败
      </h1>
      <p className="aia-text-muted mt-4 max-w-xl text-base leading-8">
        暂时无法获取更新内容，请稍后重试。
      </p>
      <div className="mt-8">
        <button
          type="button"
          onClick={reset}
          className="aia-focus border aia-border-rule px-4 py-2.5 text-sm font-medium tracking-wide text-[hsl(var(--aia-ink))] transition-colors hover:border-[hsl(var(--aia-red))] hover:text-[hsl(var(--aia-red))]"
        >
          重试
        </button>
      </div>
    </div>
  )
}
