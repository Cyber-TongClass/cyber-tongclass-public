"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, FileText, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { PublicationAuthorsList } from "@/components/publications/publication-authors-list"
import { usePublications } from "@/lib/api"
import { getPublicationAuthorName } from "@/lib/publication-authors"

const categories = [
  { value: "all", label: "全部领域" },
  { value: "Machine Learning", label: "Machine Learning" },
  { value: "Computer Vision", label: "Computer Vision" },
  { value: "Natural Language Processing", label: "NLP" },
  { value: "Multimodal AI", label: "Multimodal AI" },
  { value: "Generative Modeling", label: "Generative Modeling" },
  { value: "Reinforcement Learning", label: "Reinforcement Learning" },
  { value: "Multi-Agent Systems", label: "Multi-Agent Systems" },
  { value: "Robotics", label: "Robotics" },
  { value: "AI Systems", label: "AI Systems" },
  { value: "AI Safety", label: "AI Safety" },
  { value: "Knowledge & Reasoning", label: "Knowledge & Reasoning" },
  { value: "AI for Science", label: "AI for Science" },
  { value: "Human-AI Interaction", label: "Human-AI Interaction" },
  { value: "Applications", label: "Applications" },
]

const years = [2025, 2024, 2023, 2022, 2021, 2020]

export function PublicationsList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  const [sortBy, setSortBy] = useState<"year" | "title">("year")

  // Fetch publications from Convex
  const publicationsData = usePublications({})
  const publications = publicationsData || []

  const filteredPublications = useMemo(() => {
    return publications.filter((pub) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchTitle = pub.title.toLowerCase().includes(query)
        const matchAuthors = pub.authors.some((a) => getPublicationAuthorName(a).toLowerCase().includes(query))
        if (!matchTitle && !matchAuthors) return false
      }
      if (selectedCategory !== "all" && pub.category !== selectedCategory) {
        return false
      }
      if (selectedYear !== "all" && pub.year !== parseInt(selectedYear)) {
        return false
      }
      return true
    })
  }, [publications, searchQuery, selectedCategory, selectedYear])

  const sortedPublications = useMemo(() => {
    return [...filteredPublications].sort((a, b) => {
      if (sortBy === "year") {
        return b.year - a.year
      }
      return a.title.localeCompare(b.title)
    })
  }, [filteredPublications, sortBy])

  const latestPublications = sortedPublications.filter((pub) => pub.year >= 2024)
  const archivePublications = sortedPublications.filter((pub) => pub.year < 2024)

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <Input
            placeholder="搜索作者或题目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex h-10 w-full md:w-[180px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="flex h-10 w-full md:w-[120px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">全部年份</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "year" | "title")}
            className="flex h-10 w-full md:w-[140px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="year">按发布时间</option>
            <option value="title">按标题</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-600">
        共 {sortedPublications.length} 篇论文
      </div>

      {/* Latest Works */}
      {latestPublications.length > 0 && (
        <section>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Latest Works</h2>
          <div className="grid gap-6">
            {latestPublications.map((pub) => (
              <Card key={pub._id} className="border-0 border-b border-primary/20 shadow-sm hover:bg-slate-50 transition-colors duration-300">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/publications/${pub._id}`} className="block">
                          <h3 className="text-lg font-extrabold text-slate-900 hover:text-primary mb-2 line-clamp-2">
                            {pub.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-slate-600 mb-2">
                          <PublicationAuthorsList authors={pub.authors} />
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="font-medium text-primary">{pub.venue}</span>
                          <span>·</span>
                          <span>{pub.year}</span>
                          <span>·</span>
                          <span className="px-2 py-0.5 rounded-full bg-[hsl(211,50%,93%)] text-primary">
                            {pub.category}
                          </span>
                        </div>
                      </div>
                      {pub.url && (
                        <a
                          href={pub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-sm text-primary hover:underline shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                          arXiv
                        </a>
                      )}
                    </div>
                  </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Archive */}
      {archivePublications.length > 0 && (
        <section>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Archive</h2>
          <div className="grid gap-6">
            {archivePublications.map((pub) => (
              <Card key={pub._id} className="border-0 border-b border-primary/20 shadow-sm hover:bg-slate-50 transition-colors duration-300">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/publications/${pub._id}`} className="block">
                          <h3 className="text-lg font-extrabold text-slate-900 hover:text-primary mb-2 line-clamp-2">
                            {pub.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-slate-600 mb-2">
                          <PublicationAuthorsList authors={pub.authors} />
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="font-medium text-primary">{pub.venue}</span>
                          <span>·</span>
                          <span>{pub.year}</span>
                          <span>·</span>
                          <span className="px-2 py-0.5 rounded-full bg-[hsl(211,50%,93%)] text-primary">
                            {pub.category}
                          </span>
                        </div>
                      </div>
                      {pub.url && (
                        <a
                          href={pub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-sm text-primary hover:underline shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                          arXiv
                        </a>
                      )}
                    </div>
                  </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {sortedPublications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">未找到成果</h3>
          <p className="text-slate-600">请尝试调整搜索条件</p>
        </div>
      )}
    </div>
  )
}
