import { ArrowUpRight, BrainCircuit, FolderKanban, Newspaper, type LucideIcon, UsersRound } from "lucide-react"
import Link from "next/link"

import { AiaSectionHeading } from "@/components/institute/editorial/section-heading"

type DirectoryEntryProps = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  index: string
}

function DirectoryEntry({ href, title, description, icon: Icon, index }: DirectoryEntryProps) {
  return (
    <li className="group border-b aia-border-rule">
      <Link
        href={href}
        className="aia-focus grid grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-8"
      >
        <span className="aia-mono text-sm text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
          {index}
        </span>
        <span className="min-w-0">
          <span className="aia-serif block text-xl font-semibold leading-snug text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))] sm:text-2xl">
            {title}
          </span>
          <span className="aia-text-muted mt-1.5 block max-w-2xl text-sm leading-6">{description}</span>
        </span>
        <span className="flex items-center gap-3">
          <Icon
            className="h-4 w-4 text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
            aria-hidden="true"
          />
          <ArrowUpRight
            className="h-4 w-4 text-[hsl(var(--aia-muted))] transition-colors group-hover:text-[hsl(var(--aia-red))]"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  )
}

export function InstituteDirectoryPreview({ index }: { index?: string }) {
  return (
    <section aria-labelledby="institute-directory-title" className="border-b aia-border-rule">
      <div className="container-custom py-16 sm:py-20">
        <AiaSectionHeading
          kicker="目录 · Directory"
          index={index}
          title="研究院目录"
          description="以公共入口连接人员、团队、研究与动态。目录数据将在后续接入后持续完善。"
          href="/institute"
          hrefLabel="研究院概览"
          headingId="institute-directory-title"
        />

        <ul className="mt-10 border-t aia-border-rule">
          <DirectoryEntry
            href="/people"
            title="人员"
            description="进入研究院人员公开目录。"
            icon={UsersRound}
            index="01"
          />
          <DirectoryEntry
            href="/groups"
            title="研究团队"
            description="浏览研究组与协作单元入口。"
            icon={FolderKanban}
            index="02"
          />
          <DirectoryEntry
            href="/research"
            title="研究"
            description="了解研究主题与科研服务入口。"
            icon={BrainCircuit}
            index="03"
          />
          <DirectoryEntry
            href="/updates"
            title="更新"
            description="查看研究院动态与公告入口。"
            icon={Newspaper}
            index="04"
          />
        </ul>
      </div>
    </section>
  )
}
