"use client"

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search, FileText, Users, Calendar, BookOpen, Newspaper } from "lucide-react"
import { useNews, useUsers, usePublications, useEvents, useCourses } from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatPublicationAuthorsForText, getPublicationAuthorName } from "@/lib/publication-authors"
import { Button } from "@/components/ui/button"
import type { Course, Event, News, Publication, User } from "@/types"
import { withReturnTo } from "@/lib/safe-local-path"

interface SearchResult {
  type: "news" | "member" | "publication" | "event" | "course"
  id: string
  title: string
  description: string
  url: string
  icon: React.ReactNode
  date?: string
}

type SearchMember = Pick<
  User,
  "username" | "englishName" | "chineseName" | "bio" | "researchInterests" | "researchDirections" | "createdAt"
>

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { currentUser, isAdmin } = useAuth()

  // Fetch data from Convex
  const newsData = useNews({})
  const usersData = useUsers({ classMembersOnly: true })
  const publicationsData = usePublications({})
  const eventsData = useEvents({})
  const coursesData = useCourses({ enabled: currentUser?.isClassMember === true || isAdmin })

  const news = useMemo<News[]>(() => newsData || [], [newsData])
  const users = useMemo<SearchMember[]>(() => usersData || [], [usersData])
  const publications = useMemo<Publication[]>(() => publicationsData || [], [publicationsData])
  const events = useMemo<Event[]>(() => eventsData || [], [eventsData])
  const courses = useMemo<Course[]>(() => coursesData || [], [coursesData])

  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    const q = searchQuery.toLowerCase()
    const newResults: SearchResult[] = []

    // Search news
    news.forEach((item) => {
      if (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      ) {
        newResults.push({
          type: "news",
          id: item._id,
          title: item.title,
          description: item.content.slice(0, 100) + (item.content.length > 100 ? "..." : ""),
          url: item.sourceUrl || withReturnTo(`/tong-class/news/${item._id}`, `/search?q=${encodeURIComponent(searchQuery)}`),
          icon: <Newspaper className="h-5 w-5" />,
          date: new Date(item.publishedAt).toLocaleDateString("zh-CN"),
        })
      }
    })

    // Search members
    users.forEach((user) => {
      if (
        user.englishName.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.chineseName?.toLowerCase().includes(q) ||
        user.bio?.toLowerCase().includes(q) ||
        user.researchInterests?.some((interest) => interest.toLowerCase().includes(q)) ||
        user.researchDirections?.some((d) => d.toLowerCase().includes(q))
      ) {
        newResults.push({
          type: "member",
          id: user.username,
          title: user.englishName || user.username,
          description: user.bio?.slice(0, 100) || user.username,
          url: withReturnTo(`/tong-class/members/${user.username}`, `/search?q=${encodeURIComponent(searchQuery)}`),
          icon: <Users className="h-5 w-5" />,
          date: new Date(user.createdAt).toLocaleDateString("zh-CN"),
        })
      }
    })

    // Search publications
    publications.forEach((pub) => {
      if (
        pub.title.toLowerCase().includes(q) ||
        pub.authors.some((author) => getPublicationAuthorName(author).toLowerCase().includes(q)) ||
        pub.venue.toLowerCase().includes(q) ||
        pub.abstract.toLowerCase().includes(q)
      ) {
        newResults.push({
          type: "publication",
          id: pub._id,
          title: pub.title,
          description: `${formatPublicationAuthorsForText(pub.authors)} - ${pub.venue} (${pub.year})`,
          url: withReturnTo(`/tong-class/publications/${pub._id}`, `/search?q=${encodeURIComponent(searchQuery)}`),
          icon: <FileText className="h-5 w-5" />,
          date: String(pub.year),
        })
      }
    })

    // Search events
    events.forEach((event) => {
      const eventDescription = event.description || ""
      const eventLocation = event.location || ""
      if (
        event.title.toLowerCase().includes(q) ||
        eventDescription.toLowerCase().includes(q) ||
        eventLocation.toLowerCase().includes(q)
      ) {
        newResults.push({
          type: "event",
          id: event._id,
          title: event.title,
          description: eventDescription
            ? eventDescription.slice(0, 100) + (eventDescription.length > 100 ? "..." : "")
            : eventLocation || event.date,
          url: withReturnTo(`/tong-class/events/${event._id}`, `/search?q=${encodeURIComponent(searchQuery)}`),
          icon: <Calendar className="h-5 w-5" />,
          date: event.date,
        })
      }
    })

    // Search courses
    courses.forEach((course) => {
      if (course.name.toLowerCase().includes(q)) {
        newResults.push({
          type: "course",
          id: course._id,
          title: course.name,
          description: `${course.reviewCount} 条评测 · 均分 ${course.averageRating.toFixed(1)}`,
          url: `/tong-class/courses/${encodeURIComponent(course.name)}`,
          icon: <BookOpen className="h-5 w-5" />,
          date: new Date(course.updatedAt).toLocaleDateString("zh-CN"),
        })
      }
    })

    setResults(newResults)
    setIsSearching(false)
  }, [courses, events, news, publications, users])

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery, performSearch])

  useEffect(() => {
    if (query && hasSearched) {
      performSearch(query)
    }
  }, [hasSearched, performSearch, query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      news: "新闻",
      member: "成员",
      publication: "成果",
      event: "活动",
      course: "课程",
    }
    return labels[type] || type
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <main className="container-custom max-w-4xl py-10 sm:py-12">
      <header>
        <p className="aia-kicker">搜索</p>
        <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
          全站搜索
        </h1>
        <p className="aia-text-muted mt-2 max-w-2xl text-sm leading-6">
          检索新闻、成员、研究成果、活动与课程。
        </p>
      </header>

      <form onSubmit={handleSearch} className="mt-8 flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="aia-text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
            aria-hidden="true"
          />
          <label htmlFor="site-search-input" className="sr-only">
            搜索新闻、成员、成果、活动和课程
          </label>
          <input
            id="site-search-input"
            type="search"
            placeholder="输入关键词搜索新闻、成员、成果、活动、课程..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="aia-focus h-14 w-full border aia-border-rule bg-transparent pl-12 pr-4 text-base text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))]"
          />
        </div>
        <Button type="submit" size="lg" className="h-14 shrink-0 px-6" disabled={isSearching}>
          {isSearching ? "搜索中..." : "搜索"}
        </Button>
      </form>

      {hasSearched && (
        <p className="aia-mono aia-text-muted mt-4 text-xs uppercase tracking-[0.12em]" aria-live="polite">
          {results.length === 0
            ? "未找到相关结果"
            : `找到 ${results.length} 个相关结果`}
        </p>
      )}

      {results.length > 0 ? (
        <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t aia-border-rule pt-4" aria-label="搜索结果分类">
          <button
            type="button"
            className="aia-focus aia-mono text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--aia-red))]"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            全部 · {results.length}
          </button>
          {Object.entries(groupedResults).map(([type, items]) => (
            <button
              type="button"
              key={type}
              className="aia-focus aia-mono text-xs uppercase tracking-[0.12em] aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))]"
              onClick={() => document.getElementById(`search-results-${type}`)?.scrollIntoView({ behavior: "smooth" })}
            >
              {getTypeLabel(type)} · {items.length}
            </button>
          ))}
        </nav>
      ) : null}

      <div className="mt-2">
        {Object.entries(groupedResults).map(([type, items]) => (
          <section
            id={`search-results-${type}`}
            key={type}
            className="mt-10 border-t aia-border-rule pt-8 scroll-mt-24"
          >
            <h2 className="flex items-baseline gap-3">
              <span className="aia-serif text-xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
                {getTypeLabel(type)}
              </span>
              <span className="aia-mono text-xs aia-text-muted">{items.length} 条</span>
            </h2>
            <ul className="mt-4 border-t aia-border-rule">
              {items.map((result) => (
                <li key={`${result.type}-${result.id}`} className="border-b aia-border-rule">
                  <Link
                    href={result.url}
                    className="aia-focus group flex items-start gap-4 py-5"
                  >
                    <span className="aia-text-muted mt-0.5 shrink-0 transition-colors group-hover:text-[hsl(var(--aia-red))]" aria-hidden="true">
                      {result.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="aia-serif block text-lg font-semibold leading-6 text-[hsl(var(--aia-ink))] transition-colors group-hover:text-[hsl(var(--aia-red))]">
                        {result.title}
                      </span>
                      <span className="aia-mono aia-text-muted mt-1.5 block text-xs uppercase tracking-[0.12em]">
                        {getTypeLabel(result.type)}
                        {result.date ? ` · ${result.date}` : ""}
                      </span>
                      <span className="aia-text-muted mt-2 block text-sm leading-6 line-clamp-2">
                        {result.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}

function SearchLoading() {
  return (
    <main className="container-custom max-w-4xl py-10 sm:py-12">
      <p className="aia-kicker">搜索</p>
      <h1 className="aia-serif mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--aia-ink))]">
        全站搜索
      </h1>
      <div className="mt-8 animate-pulse" role="status" aria-label="正在加载搜索">
        <div className="h-14 border aia-border-rule aia-bg-tag" />
        <div className="mt-10 border-t aia-border-rule">
          <div className="h-24 border-b aia-border-rule" />
          <div className="h-24 border-b aia-border-rule" />
        </div>
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  )
}
