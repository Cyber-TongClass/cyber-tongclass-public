"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, MapPin, Clock, Search, ChevronRight, CalendarDays, ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEvents } from "@/lib/api"
import type { Event } from "@/types"

const eventTypeStyles = {
  "学术讲座": { dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-500/10" },
  "学术会议": { dot: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-500/10" },
  "学生活动": { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-500/10" },
  "通知公告": { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-500/10" },
  其他: { dot: "bg-slate-500", text: "text-slate-700", bg: "bg-slate-500/10" },
} as const

const colorToType: Record<string, keyof typeof eventTypeStyles> = {
  "#0F4C81": "学术讲座",
  "#DC143C": "学术会议",
  "#2E7D32": "学生活动",
  "#F57C00": "通知公告",
}

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"]

function getEventType(event: Event): keyof typeof eventTypeStyles {
  return colorToType[event.color] ?? "其他"
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  })
}

const MONTH_ABBRS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function getDateParts(dateStr: string) {
  const d = new Date(dateStr)
  return { month: MONTH_ABBRS[d.getMonth()], day: d.getDate() }
}

function monthStartKey(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  return `${y}-${m}`
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getCalendarCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = firstDay.getDay()
  const totalDays = daysInMonth(month)
  const cells: Array<number | null> = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(day)
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

export default function EventsPage() {
  const eventsData = useEvents()
  const [events, setEvents] = React.useState<Event[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedType, setSelectedType] = React.useState("all")
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list")
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date())

  React.useEffect(() => {
    if (eventsData) {
      setEvents(eventsData)
    }
  }, [eventsData])

  const filteredEvents = React.useMemo(() => {
    let result = [...events]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(query) || Boolean(event.description?.toLowerCase().includes(query))
      )
    }

    if (selectedType !== "all") {
      result = result.filter((event) => getEventType(event) === selectedType)
    }

    result.sort((a, b) => a.date.localeCompare(b.date))
    return result
  }, [events, searchQuery, selectedType])

  // List view: only show future events (today and after)
  const futureEvents = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    return filteredEvents.filter((event) => event.date >= today)
  }, [filteredEvents])

  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, Event[]> = {}
    futureEvents.forEach((event) => {
      const key = event.date.substring(0, 7)
      if (!groups[key]) groups[key] = []
      groups[key].push(event)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [futureEvents])

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, Event[]>()
    filteredEvents.forEach((event) => {
      const list = map.get(event.date) ?? []
      list.push(event)
      map.set(event.date, list)
    })
    return map
  }, [filteredEvents])

  const cells = React.useMemo(() => getCalendarCells(calendarMonth), [calendarMonth])
  const calendarMonthKey = monthStartKey(calendarMonth)

  const previousMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">EVENTS</div>
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">活动日程</h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl relative">了解通班即将举办和已结束的各类学术活动、学生事务与重要通知。</p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white sticky top-16 z-40">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <Input
                type="search"
                placeholder="搜索活动..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="活动类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {Object.keys(eventTypeStyles).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${eventTypeStyles[type as keyof typeof eventTypeStyles].dot}`} />
                        {type}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex rounded-md border border-input">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  列表
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className="rounded-l-none"
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  日历
                </Button>
              </div>

              {(selectedType !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedType("all")
                    setSearchQuery("")
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600">共 {futureEvents.length} 个近期活动</div>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {viewMode === "list" ? (
          futureEvents.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">未找到相关活动</h3>
              <p className="text-slate-500">尝试调整筛选条件或搜索关键词</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-[19px] top-2 bottom-0 w-px bg-slate-300" />

              <div className="space-y-14">
                {groupedEvents.map(([month, monthEvents]) => (
                  <div key={month} className="relative pl-12">
                    <div className="absolute left-[15px] top-1.5 w-[9px] h-[9px] rounded-full bg-primary ring-2 ring-white" />

                    <div className="mb-5">
                      <span className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
                        {new Date(`${month}-01`).toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {monthEvents.map((event) => {
                        const { month: monthAbbr, day } = getDateParts(event.date)
                        const eventType = getEventType(event)
                        const colorStyle = eventTypeStyles[eventType]
                        return (
                          <Link key={event._id} href={`/events/${event._id}`}>
                            <div className="group bg-white shadow-sm hover:bg-slate-50 border-l-[3px] border-transparent hover:border-primary transition-all duration-200 flex">
                              {/* Calendar tear-off */}
                              <div className="flex flex-col items-center justify-center w-16 md:w-20 flex-shrink-0 py-4 bg-slate-50 group-hover:bg-[hsl(211,40%,97%)] transition-colors">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{monthAbbr}</span>
                                <span className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-none mt-0.5">{day}</span>
                              </div>

                              {/* Event details */}
                              <div className="flex-1 min-w-0 p-4 md:p-5">
                                <div className="mb-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colorStyle.bg} ${colorStyle.text}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${colorStyle.dot}`} />
                                    {eventType}
                                  </span>
                                </div>

                                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                  {event.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                  {event.time && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {event.time}
                                    </span>
                                  )}
                                  {event.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {event.location}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors flex-shrink-0 self-center mr-4" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{monthLabel(calendarMonth)}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth} aria-label="上一月">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth} aria-label="下一月">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-xs text-slate-600 font-medium">
                {weekdayLabels.map((day) => (
                  <div key={day} className="text-center py-1">
                    周{day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {cells.map((day, idx) => {
                  const dateKey = day === null ? "" : `${calendarMonthKey}-${`${day}`.padStart(2, "0")}`
                  const dayEvents = day === null ? [] : eventsByDate.get(dateKey) ?? []

                  return (
                    <div key={`${dateKey}-${idx}`} className="min-h-[96px] border rounded-md p-2 bg-white">
                      {day !== null && (
                        <>
                          <p className="text-xs font-medium mb-1">{day}</p>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => {
                              const eventType = getEventType(event)
                              const color = eventTypeStyles[eventType]
                              return (
                                <Link
                                  key={event._id}
                                  href={`/events/${event._id}`}
                                  className={`block px-1.5 py-0.5 rounded text-[11px] leading-4 truncate ${color.bg} ${color.text}`}
                                  title={event.title}
                                >
                                  {event.title}
                                </Link>
                              )
                            })}
                            {dayEvents.length > 2 && <p className="text-[11px] text-slate-600">+{dayEvents.length - 2} 更多</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </section>
    </div>
  )
}
