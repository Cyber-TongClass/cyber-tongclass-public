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
import type { PublicPublicationAuthor } from "@/types"

export type PublicationArchiveItem = {
  id: string
  title: string
  authors: string[]
  authorDetails?: PublicPublicationAuthor[]
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
  icml: "bg-[hsl(var(--aia-red))] text-white",
  neurips: "bg-[hsl(var(--aia-red))] text-white",
  cvpr: "bg-[hsl(var(--aia-red))] text-white",
  iccv: "bg-[hsl(var(--aia-red))] text-white",
  eccv: "bg-[hsl(var(--aia-red))] text-white",
  acl: "bg-[hsl(var(--aia-red))] text-white",
  emnlp: "bg-[hsl(var(--aia-red))] text-white",
  iclr: "bg-[hsl(var(--aia-red))] text-white",
  aaai: "bg-[hsl(var(--aia-red))] text-white",
  ijcai: "bg-[hsl(var(--aia-red))] text-white",
  osdi: "bg-[hsl(var(--aia-red))] text-white",
  sospp: "bg-[hsl(var(--aia-red))] text-white",
  nsdi: "bg-[hsl(var(--aia-red))] text-white",
  sigcomm: "bg-[hsl(var(--aia-red))] text-white",
  mobicom: "bg-[hsl(var(--aia-red))] text-white",
  ccs: "bg-[hsl(var(--aia-red))] text-white",
  oakland: "bg-[hsl(var(--aia-red))] text-white",
  usenix: "bg-[hsl(var(--aia-red))] text-white",
  chi: "bg-[hsl(var(--aia-red))] text-white",
  ubicomp: "bg-[hsl(var(--aia-red))] text-white",
  isca: "bg-[hsl(var(--aia-red))] text-white",
  micro: "bg-[hsl(var(--aia-red))] text-white",
  hpcapp: "bg-[hsl(var(--aia-red))] text-white",
  sc: "bg-[hsl(var(--aia-red))] text-white",
  sigmod: "bg-[hsl(var(--aia-red))] text-white",
  vldb: "bg-[hsl(var(--aia-red))] text-white",
  sigir: "bg-[hsl(var(--aia-red))] text-white",
  www: "bg-[hsl(var(--aia-red))] text-white",
  icra: "bg-[hsl(var(--aia-red))] text-white",
  iros: "bg-[hsl(var(--aia-red))] text-white",
  rss: "bg-[hsl(var(--aia-red))] text-white",
}

function venueBadge(venue: string) {
  return VENUE_BADGE_MAP[venue.toLowerCase()] ?? "bg-[hsl(var(--aia-tag))] text-[hsl(var(--aia-ink))]"
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
    <article className="group border-l-[3px] border-transparent bg-[hsl(var(--aia-paper))] p-5 shadow-sm transition-all duration-200 hover:border-[hsl(var(--aia-red))] hover:bg-[hsl(var(--aia-tag))]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-extrabold uppercase ${venueBadge(publication.venue)}`}
            >
              {publication.venue}
            </span>
            {showYear ? (
              <span className="rounded bg-[hsl(var(--aia-tag))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--aia-muted))]">
                {publication.year}
              </span>
            ) : null}
            <span className="rounded bg-[hsl(var(--aia-tag))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--aia-red))]">
              {getPublicationCategory(publication)}
            </span>
            {publication.subCategory ? (
              <span className="rounded bg-[hsl(var(--aia-tag))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--aia-red))]">
                {publication.subCategory}
              </span>
            ) : null}
          </div>

          <Link href={detailHref(publication)} className="block">
            <h3 className="mb-1.5 line-clamp-2 text-base font-extrabold text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
              {publication.title}
            </h3>
          </Link>

          <p className="text-sm text-[hsl(var(--aia-muted))]">
            <PublicationAuthorsList authors={publication.authors} authorDetails={publication.authorDetails} />
          </p>
        </div>

        {safeExternalUrl ? (
          <a
            href={safeExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`打开 ${publication.title} 的项目链接`}
            title="打开项目链接"
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-[hsl(var(--aia-muted))] transition-colors hover:bg-[hsl(var(--aia-tag))] hover:text-[hsl(var(--aia-red))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--aia-red))]"
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
      <section className="sticky top-16 z-40 border-b border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))]">
        <div className="container-custom py-4">
          {audienceControl ? <div className="mb-4">{audienceControl}</div> : null}

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative max-w-md flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--aia-muted))]"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="搜索作者或题目"
                placeholder="搜索作者或题目..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] pl-10 text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] focus-visible:ring-[hsl(var(--aia-red))] focus-visible:ring-offset-[hsl(var(--aia-paper))]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={publicationKind}
                onValueChange={(value) => setPublicationKind(value as "published" | "preprint")}
              >
                <SelectTrigger className="w-[150px] border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))] focus:ring-[hsl(var(--aia-red))] focus:ring-offset-[hsl(var(--aia-paper))]">
                  <SelectValue placeholder="成果类型" />
                </SelectTrigger>
                <SelectContent className="border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))]">
                  <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" value="published">已发表论文</SelectItem>
                  <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" value="preprint">Preprint</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))] focus:ring-[hsl(var(--aia-red))] focus:ring-offset-[hsl(var(--aia-paper))]">
                  <SelectValue placeholder="选择领域" />
                </SelectTrigger>
                <SelectContent className="border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))]">
                  {categoryOptions.map((category) => (
                    <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as "year" | "title")}>
                <SelectTrigger className="w-[120px] border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))] focus:ring-[hsl(var(--aia-red))] focus:ring-offset-[hsl(var(--aia-paper))]">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent className="border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))]">
                  <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" value="year">按发布时间</SelectItem>
                  <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" value="title">按标题</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "desc" | "asc")}>
                <SelectTrigger className="w-[100px] border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))] focus:ring-[hsl(var(--aia-red))] focus:ring-offset-[hsl(var(--aia-paper))]">
                  <SelectValue placeholder="顺序" />
                </SelectTrigger>
                <SelectContent className="border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))]">
                  <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" value="desc">降序</SelectItem>
                  <SelectItem className="focus:bg-[hsl(var(--aia-tag))] focus:text-[hsl(var(--aia-red))]" value="asc">升序</SelectItem>
                </SelectContent>
              </Select>

              {selectedCategory !== "all" || searchQuery || publicationKind !== "published" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[hsl(var(--aia-muted))] hover:bg-[hsl(var(--aia-tag))] hover:text-[hsl(var(--aia-red))]"
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

          <div className="mt-4 text-sm text-[hsl(var(--aia-muted))]" aria-live="polite">
            {items === undefined
              ? "正在加载学术成果…"
              : `共 ${filteredPublications.length} 篇${publicationKind === "preprint" ? " Preprint" : "已发表论文"}`}
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--aia-warm))] py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {items === undefined ? (
            <div className="space-y-4" role="status" aria-label="正在加载学术成果">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-28 animate-pulse rounded-sm bg-[hsl(var(--aia-paper))] shadow-sm" />
              ))}
            </div>
          ) : filteredPublications.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-[hsl(var(--aia-muted))]" />
              <h3 className="mb-2 text-lg font-extrabold text-[hsl(var(--aia-ink))]">未找到相关成果</h3>
              <p className="text-[hsl(var(--aia-muted))]">尝试调整筛选条件或搜索关键词</p>
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
                  <div className="select-none pt-1 text-5xl font-extrabold leading-none text-[hsl(var(--aia-rule))] md:text-6xl">
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
