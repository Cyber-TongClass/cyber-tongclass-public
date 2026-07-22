"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Calendar, MapPin, Clock, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEvents } from "@/lib/api"
import type { Event } from "@/types"

export function EventsList() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const eventsData = useEvents()
  const events: Event[] = eventsData || []

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            列表视图
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            日历视图
          </Button>
        </div>
      </div>

      {/* Events list */}
      <div className="grid gap-6">
        {events.map((event) => (
          <Link key={event._id} href={`/tong-class/events/${event._id}`}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer card-hover overflow-hidden">
              <div className="h-1" style={{ backgroundColor: event.color }} />
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{event.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {event.date}
                  </div>
                  {event.time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {event.time}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                </div>
                {event.description && (
                  <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">暂无活动</h3>
          <p className="text-slate-600">敬请期待 upcoming events</p>
        </div>
      )}
    </div>
  )
}
