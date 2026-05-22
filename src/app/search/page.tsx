"use client"

import React, { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search, FileText, Users, Calendar, BookOpen, Newspaper } from "lucide-react"
import { useNews, useUsers, usePublications, useEvents, useCourses } from "@/lib/api"
import { formatPublicationAuthorsForText, getPublicationAuthorName } from "@/lib/publication-authors"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SearchResult {
  type: "news" | "member" | "publication" | "event" | "course"
  id: string
  title: string
  description: string
  url: string
  icon: React.ReactNode
}

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch data from Convex
  const newsData = useNews({})
  const usersData = useUsers({ classMembersOnly: true })
  const publicationsData = usePublications({})
  const eventsData = useEvents({})
  const coursesData = useCourses({})

  const news = newsData || []
  const users = usersData || []
  const publications = publicationsData || []
  const events = eventsData || []
  const courses = coursesData || []

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    if (query && hasSearched) {
      performSearch(query)
    }
  }, [news, users, publications, events, courses, query])

  const performSearch = (searchQuery: string) => {
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
          url: item.sourceUrl || `/news/${item._id}`,
          icon: <Newspaper className="h-5 w-5" />,
        })
      }
    })

    // Search members
    users.forEach((user) => {
      if (
        user.englishName.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.chineseName?.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.bio?.toLowerCase().includes(q) ||
        user.researchInterests?.some((interest) => interest.toLowerCase().includes(q)) ||
        user.researchDirections?.some((d) => d.toLowerCase().includes(q))
      ) {
        newResults.push({
          type: "member",
          id: user._id,
          title: user.englishName || user.username,
          description: user.bio?.slice(0, 100) || user.email,
          url: `/members/${user.username || user._id}`,
          icon: <Users className="h-5 w-5" />,
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
          url: `/publications/${pub._id}`,
          icon: <FileText className="h-5 w-5" />,
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
          url: `/events/${event._id}`,
          icon: <Calendar className="h-5 w-5" />,
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
          url: `/resources/courses/${encodeURIComponent(course.name)}`,
          icon: <BookOpen className="h-5 w-5" />,
        })
      }
    })

    setResults(newResults)
    setIsSearching(false)
  }

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

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      news: "bg-blue-100 text-blue-800",
      member: "bg-green-100 text-green-800",
      publication: "bg-purple-100 text-purple-800",
      event: "bg-orange-100 text-orange-800",
      course: "bg-teal-100 text-teal-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-6">搜索</h1>
          
          <form onSubmit={handleSearch} className="flex gap-2 mb-8">
            <Input
              type="search"
              placeholder="输入关键词搜索新闻、成员、成果、活动、课程..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 text-lg"
            />
            <Button type="submit" size="lg" className="h-12" disabled={isSearching}>
              {isSearching ? "搜索中..." : "搜索"}
            </Button>
          </form>

          {hasSearched && (
            <div className="mb-4">
              <p className="text-slate-600">
                {results.length === 0
                  ? "未找到相关结果"
                  : `找到 ${results.length} 个相关结果`}
              </p>
            </div>
          )}

          {Object.entries(groupedResults).map(([type, items]) => (
            <div key={type} className="mb-8">
              <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
                <span>{getTypeLabel(type)}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </h2>
              <div className="space-y-3">
                {items.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.url}
                    className="block p-4 rounded-lg border border-slate-200 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-slate-600 mt-0.5">{result.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{result.title}</h3>
                          <Badge className={getTypeColor(result.type)}>{getTypeLabel(result.type)}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{result.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-6">搜索</h1>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-100 rounded-lg"></div>
            <div className="h-96 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  )
}
