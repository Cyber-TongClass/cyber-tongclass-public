"use client"

import * as React from "react"
import Link from "next/link"
import { Search, FileText, ExternalLink, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePublications } from "@/lib/api"
import { PublicationAuthorsList } from "@/components/publications/publication-authors-list"
import { getPublicationAuthorName } from "@/lib/publication-authors"
import type { Publication } from "@/types"

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

function venueBadge(v: string) {
  return VENUE_BADGE_MAP[v.toLowerCase()] ?? "bg-slate-100 text-slate-700"
}

function isPreprintPublication(pub: Publication) {
  return pub.venue.trim().toLowerCase() === "arxiv preprint"
}

export default function PublicationsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [publicationKind, setPublicationKind] = React.useState<"published" | "preprint">("published")
  const [sortBy, setSortBy] = React.useState<"year" | "title">("year")
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc")

  const publicationsData = usePublications()
  const publications: Publication[] = React.useMemo(() => publicationsData || [], [publicationsData])

  const categoryOptions = React.useMemo(() => {
    const unique = Array.from(new Set(publications.map((pub) => pub.category))).sort((a, b) => a.localeCompare(b))
    return [{ value: "all", label: "全部领域" }, ...unique.map((item) => ({ value: item, label: item }))]
  }, [publications])

  const filteredPublications = React.useMemo(() => {
    let result = [...publications]

    result = result.filter((pub) =>
      publicationKind === "preprint" ? isPreprintPublication(pub) : !isPreprintPublication(pub)
    )

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (pub) => pub.title.toLowerCase().includes(query) || pub.authors.some((author) => getPublicationAuthorName(author).toLowerCase().includes(query))
      )
    }

    if (selectedCategory !== "all") {
      result = result.filter((pub) => pub.category === selectedCategory)
    }

    result.sort((a, b) => {
      if (sortBy === "year") {
        return sortOrder === "desc" ? b.year - a.year : a.year - b.year
      }
      return sortOrder === "desc" ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title)
    })

    return result
  }, [publicationKind, publications, searchQuery, selectedCategory, sortBy, sortOrder])

  const groupedByYear = React.useMemo(() => {
    const groups: Record<number, Publication[]> = {}
    filteredPublications.forEach((pub) => {
      if (!groups[pub.year]) groups[pub.year] = []
      groups[pub.year].push(pub)
    })
    return Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a))
  }, [filteredPublications])

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">PUBLICATIONS</div>
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">学术成果</h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative">展示通班师生的学术论文、研究成果与创新贡献。</p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white sticky top-16 z-40">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <Input
                type="search"
                placeholder="搜索作者或题目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={publicationKind} onValueChange={(v) => setPublicationKind(v as "published" | "preprint")}>
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
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "year" | "title")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">按发布时间</SelectItem>
                  <SelectItem value="title">按标题</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="顺序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">降序</SelectItem>
                  <SelectItem value="asc">升序</SelectItem>
                </SelectContent>
              </Select>

              {(selectedCategory !== "all" || searchQuery || publicationKind !== "published") && (
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
              )}
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            共 {filteredPublications.length} 篇{publicationKind === "preprint" ? " Preprint" : "已发表论文"}
          </div>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredPublications.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">未找到相关成果</h3>
            <p className="text-slate-500">尝试调整筛选条件或搜索关键词</p>
          </div>
        ) : (
          <div className="space-y-16">
            {groupedByYear.map(([year, pubs]) => (
              <div key={year} className="grid grid-cols-[72px_1fr] md:grid-cols-[96px_1fr] gap-6 md:gap-10">
                {/* Year sidebar */}
                <div className="text-5xl md:text-6xl font-extrabold text-slate-300 leading-none pt-1 select-none">
                  {year}
                </div>

                {/* Paper list */}
                <div className="space-y-4">
                  {(pubs as Publication[]).map((pub) => (
                    <div key={pub._id} className="group bg-white p-5 shadow-sm hover:bg-slate-50 border-l-[3px] border-transparent hover:border-primary transition-all duration-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 text-[11px] font-extrabold uppercase rounded ${venueBadge(pub.venue)}`}>
                                {pub.venue}
                              </span>
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-[hsl(211,50%,93%)] text-primary">
                                {pub.category}
                              </span>
                              {pub.subCategory && <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-[hsl(211,50%,93%)] text-primary">{pub.subCategory}</span>}
                            </div>

                            <Link href={`/publications/${pub._id}`} className="block">
                              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                                {pub.title}
                              </h3>
                            </Link>

                            <p className="text-sm text-slate-500">
                              <PublicationAuthorsList authors={pub.authors} />
                            </p>
                          </div>

                          {pub.url && (
                            <a
                              href={pub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`打开 ${pub.title} 的项目链接`}
                              title="打开项目链接"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[hsl(211,50%,93%)] hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 flex-shrink-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>
    </div>
  )
}
