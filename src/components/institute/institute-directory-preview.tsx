import { ArrowRight, BrainCircuit, FolderKanban, Newspaper, type LucideIcon, UsersRound } from "lucide-react"
import Link from "next/link"

type DirectoryEntryProps = {
  href: string
  title: string
  description: string
  icon: LucideIcon
}

function DirectoryEntry({ href, title, description, icon: Icon }: DirectoryEntryProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        进入目录
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

export function InstituteDirectoryPreview() {
  return (
    <section aria-labelledby="institute-directory-title" className="bg-white py-16 sm:py-20">
      <div className="container-custom">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Directory</p>
            <h2 id="institute-directory-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              研究院目录
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              以公共入口连接人员、团队、研究与动态。目录数据将在后续接入后持续完善。
            </p>
          </div>
          <Link
            href="/institute"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            查看研究院概览
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DirectoryEntry
            href="/people"
            title="人员"
            description="进入研究院人员公开目录。"
            icon={UsersRound}
          />
          <DirectoryEntry
            href="/groups"
            title="研究团队"
            description="浏览研究组与协作单元入口。"
            icon={FolderKanban}
          />
          <DirectoryEntry
            href="/research"
            title="研究"
            description="了解研究主题与科研服务入口。"
            icon={BrainCircuit}
          />
          <DirectoryEntry
            href="/updates"
            title="更新"
            description="查看研究院动态与公告入口。"
            icon={Newspaper}
          />
        </div>
      </div>
    </section>
  )
}
