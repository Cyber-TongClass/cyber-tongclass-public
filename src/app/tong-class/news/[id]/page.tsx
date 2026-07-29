"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"
import { usePublicInstituteUpdateById } from "@/lib/api"
import { getSafeExternalUrl } from "@/lib/safe-external-url"
import { SafeReturnLink } from "@/components/navigation/safe-return-link"

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>()
  const newsId = params.id
  const news = usePublicInstituteUpdateById(newsId)
  const isLoading = news === undefined
  const safeSourceUrl = getSafeExternalUrl(news?.sourceUrl)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="container-custom py-16 md:py-24">
        <Button variant="ghost" asChild className="mb-6 -ml-3 gap-2">
          <SafeReturnLink fallback="/tong-class/news">
            <ArrowLeft className="h-4 w-4" />
            返回新闻列表
          </SafeReturnLink>
        </Button>
        <div className="max-w-4xl mx-auto text-center py-16">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">新闻不存在</h2>
          <p className="text-slate-600">该新闻可能已被删除。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-16 md:py-24">
      <Button variant="ghost" asChild className="mb-6 -ml-3 gap-2">
        <SafeReturnLink fallback="/tong-class/news">
          <ArrowLeft className="h-4 w-4" />
          返回新闻列表
        </SafeReturnLink>
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary">{news.category}</span>
            <span className="text-sm text-slate-600 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(news.publishedAt).toLocaleDateString("zh-CN")}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">{news.title}</h1>

          {safeSourceUrl && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={safeSourceUrl} target="_blank" rel="noopener noreferrer">
                Open Original
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <MarkdownRenderer content={news.content} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
