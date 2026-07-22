"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, FileText, Search } from "lucide-react"

import { PublicationAuthorsList } from "@/components/publications/publication-authors-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getPublicationAuthorName } from "@/lib/publication-authors"
import { getSafeExternalUrl } from "@/lib/safe-external-url"

export type PublicationArchiveItem = {
  id: string
  title: string
  authors: string[]
  venue: string
  year: number
  abstract: string
  url?: string
  category: string
  subCategory?: string
}

type PublicationArchiveProps = {
  items: PublicationArchiveItem[] | undefined
  detailHref: (item: PublicationArchiveItem) => string
  audienceControl?: React.ReactNode
}

const VENUE_BADGE_MAP: Record<string, string> = {
  icml: "bg-primary text-white",
  neurips: "bg-primary text-white",
  cvpr: "bg-primary text-white",
  iccv: "bg-primary text-white",
  eccv: "bg-primary text-white",
  acl: "bg-primary text-white",
  emnlp: "bg-primary text-white",
  iclr: "bg-primary text-white",
  aaai: "bg-primary text-white",
  ijcai: "bg-primary text-white",
  osdi: "bg-primary text-white",
  sospp: "bg-primary text-white",
  nsdi: "bg-primary text-white",
  sigcomm: "bg-primary text-white",
  mobicom: "bg-primary text-white",
  ccs: "bg-primary text-white",
  oakland: "bg-primary text-white",
  usenix: "bg-primary text-white",
  chi: "bg-primary text-white",
  ubicomp: "bg-primary text-white",
  isca: "bg-primary text-white",
  micro: "bg-primary text-white",
  hpcapp: "bg-primary text-white",
  sc: "bg-primary text-white",
  sigmod: "bg-primary text-white",
  vldb: "bg-primary text-white",
  sigir: "bg-primary text-white",
  www: "bg-primary text-white",
  icra: "bg-primary text-white",
  iros: "bg-primary text-white",
  rss: "bg-primary text-white",
}

function venueBadge(venue: string) {
  return VENUE_BADGE_MAP[venue.toLowerCase()] ?? "bg-slate-100 text-slate-700"
}

function isPreprintPublication(publication: PublicationArchiveItem) {
  return publication.venue.trim().toLowerCase() === "arxiv preprint"
}

function getPublicationCategory(publication: PublicationArchiveItem) {
  return publication.category.trim() || "未分类"
}

type PublicationCardProps = {
  publication: PublicationArchiveItem
  detailHref: (item: PublicationArchiveItem) => string
  showYear?: boolean
}

function PublicationCard({ publication, detailHref, showYear = false }: PublicationCardProps) {
  const safeExternalUrl = getSafeExternalUrl(publication.url)

  return (
    <article className="group border-l-[3px] border-transparent bg-white p-5 shadow-sm transition-all duration-200 hover:border-primary hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-extrabold uppercase ${venueBadge(publication.venue)}`}
            >
              {publication.venue}
            </span>
            {showYear ? (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {publication.year}
              </span>
            ) : null}
            <span className="rounded bg-[hsl(211,50%,93%)] px-2 py-0.5 text-[11px] font-medium text-primary">
              {getPublicationCategory(publication)}
            </span>
            {publication.subCategory ? (
              <span className="rounded bg-[hsl(211,50%,93%)] px-2 py-0.5 text-[11px] font-medium text-primary">
                {publication.subCategory}
              </span>
            ) : null}
          </div>

          <Link href={detailHref(publication)} className="block">
            <h3 className="mb-1.5 line-clamp-2 text-base font-extrabold text-slate-900 transition-colors group-hover:text-primary">
              {publication.title}
            </h3>
          </Link>

          <p className="text-sm text-slate-500">
            <PublicationAuthorsList authors={publication.authors} />
          </p>
        </div>

        {safeExternalUrl ? (
          <a
            href={safeExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`打开 ${publication.title} 的项目链接`}
            title="打开项目链接"
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[hsl(211,50%,93%)] hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  )
}

export function PublicationArchive({ items, detailHref, audienceControl }: PublicationArchiveProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [publicationKind, setPublicationKind] = React.useState<"published" | "preprint">("published")
  const [sortBy, setSortBy] = React.useState<"year" | "title">("year")
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc")

  const publications = React.useMemo(() => items ?? [], [items])

  const categoryOptions = React.useMemo(() => {
    const unique = Array.from(new Set(publications.map(getPublicationCategory))).sort((a, b) => a.localeCompare(b))
    return [{ value: "all", label: "全部领域" }, ...unique.map((category) => ({ value: category, label: category }))]
  }, [publications])

  const filteredPublications = React.useMemo(() => {
    let result = [...publications]

    result = result.filter((publication) =>
      publicationKind === "preprint" ? isPreprintPublication(publication) : !isPreprintPublication(publication)
    )

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (publication) =>
          publication.title.toLowerCase().includes(query) ||
          publication.authors.some((author) => getPublicationAuthorName(author).toLowerCase().includes(query))
      )
    }

    if (selectedCategory !== "all") {
      result = result.filter((publication) => getPublicationCategory(publication) === selectedCategory)
    }

    result.sort((left, right) => {
      if (sortBy === "year") {
        return sortOrder === "desc" ? right.year - left.year : left.year - right.year
      }
      return sortOrder === "desc"
        ? right.title.localeCompare(left.title)
        : left.title.localeCompare(right.title)
    })

    return result
  }, [publicationKind, publications, searchQuery, selectedCategory, sortBy, sortOrder])

  const groupedByYear = React.useMemo(() => {
    const groups: Record<number, PublicationArchiveItem[]> = {}
    filteredPublications.forEach((publication) => {
      if (!groups[publication.year]) groups[publication.year] = []
      groups[publication.year].push(publication)
    })
    return Object.entries(groups).sort(([left], [right]) => sortOrder === "desc" ? Number(right) - Number(left) : Number(left) - Number(right))
  }, [filteredPublications, sortOrder])

  return (
    <>
      <section className="sticky top-16 z-40 border-b border-slate-200 bg-white">
        <div className="container-custom py-4">
          {audienceControl ? <div className="mb-4">{audienceControl}</div> : null}

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative max-w-md flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="搜索作者或题目"
                placeholder="搜索作者或题目..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={publicationKind}
                onValueChange={(value) => setPublicationKind(value as "published" | "preprint")}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="成果类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">已发表论文</SelectItem>
                  <SelectItem value="preprint">Preprint</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择领域" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as "year" | "title")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">按发布时间</SelectItem>
                  <SelectItem value="title">按标题</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "desc" | "asc")}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="顺序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">降序</SelectItem>
                  <SelectItem value="asc">升序</SelectItem>
                </SelectContent>
              </Select>

              {selectedCategory !== "all" || searchQuery || publicationKind !== "published" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all")
                    setPublicationKind("published")
                    setSearchQuery("")
                  }}
                >
                  清除筛选
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600" aria-live="polite">
            {items === undefined
              ? "正在加载学术成果…"
              : `共 ${filteredPublications.length} 篇${publicationKind === "preprint" ? " Preprint" : "已发表论文"}`}
          </div>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {items === undefined ? (
            <div className="space-y-4" role="status" aria-label="正在加载学术成果">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-28 animate-pulse rounded-sm bg-white shadow-sm" />
              ))}
            </div>
          ) : filteredPublications.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <h3 className="mb-2 text-lg font-extrabold text-slate-900">未找到相关成果</h3>
              <p className="text-slate-500">尝试调整筛选条件或搜索关键词</p>
            </div>
          ) : sortBy === "title" ? (
            <div className="space-y-4">
              {filteredPublications.map((publication) => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                  detailHref={detailHref}
                  showYear
                />
              ))}
            </div>
          ) : (
            <div className="space-y-16">
              {groupedByYear.map(([year, publicationsForYear]) => (
                <div key={year} className="grid grid-cols-[72px_1fr] gap-6 md:grid-cols-[96px_1fr] md:gap-10">
                  <div className="select-none pt-1 text-5xl font-extrabold leading-none text-slate-300 md:text-6xl">
                    {year}
                  </div>

                  <div className="space-y-4">
                    {publicationsForYear.map((publication) => (
                      <PublicationCard
                        key={publication.id}
                        publication={publication}
                        detailHref={detailHref}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
