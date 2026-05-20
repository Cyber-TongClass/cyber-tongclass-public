"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ExternalLink, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicationById } from "@/lib/api"
import type { Publication } from "@/types"

function AuthorsList({ authors }: { authors: string[] }) {
  return (
    <span>
      {authors.map((author, index) => (
        <span key={index}>
          <Link href="/members" className="text-slate-900 hover:text-primary">
            {author}
          </Link>
          {index < authors.length - 1 && ", "}
        </span>
      ))}
    </span>
  )
}

export default function PublicationDetailPage() {
  const params = useParams<{ id: string }>()
  const publicationId = params.id

  const publication = usePublicationById(publicationId)
  const isLoading = publication === undefined
  const [showCopiedToast, setShowCopiedToast] = React.useState(false)
  const [toastOpacity, setToastOpacity] = React.useState(0)
  const lastCopyTime = React.useRef(0)

  const handleShare = React.useCallback(() => {
    const now = Date.now()
    if (now - lastCopyTime.current < 1000) {
      return
    }
    lastCopyTime.current = now

    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setShowCopiedToast(true)
      setToastOpacity(1)
      setTimeout(() => setToastOpacity(0), 1000)
      setTimeout(() => setShowCopiedToast(false), 2000)
    })
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!publication) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container-custom py-16 md:py-24">
          <Button variant="ghost" asChild className="mb-6 -ml-3 gap-2">
            <Link href="/publications">
              <ArrowLeft className="h-4 w-4" />
              返回成果列表
            </Link>
          </Button>
          <div className="max-w-3xl mx-auto text-center py-16">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">成果不存在</h2>
            <p className="text-slate-600">该成果可能已被删除。</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {showCopiedToast && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div 
            className="bg-black/70 text-white px-6 py-3 rounded-lg text-lg transition-opacity duration-500"
            style={{ opacity: toastOpacity }}
          >
            已拷贝链接至剪贴板
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <Button variant="ghost" asChild className="mb-8 -ml-3 gap-2">
          <Link href="/publications">
            <ArrowLeft className="h-4 w-4" />
            返回成果列表
          </Link>
        </Button>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(211,60%,35%)]">
                {publication.category}
              </span>
              {publication.subCategory && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">
                    {publication.subCategory}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight mb-5">{publication.title}</h1>

            <p className="text-base text-slate-600 mb-4">
              <AuthorsList authors={publication.authors} />
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-bold text-primary">{publication.venue}</span>
              <span className="text-slate-400">{publication.year}</span>
            </div>
          </header>

          <div className="flex flex-wrap gap-2 mb-10">
            {publication.url && (
              <Button asChild size="sm">
                <a href={publication.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  查看原文
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              分享
            </Button>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-4">Abstract</h2>
            <div className="text-slate-700 leading-relaxed">{publication.abstract}</div>
          </div>

          <div className="mt-12">
            <Button variant="outline" asChild>
              <Link href="/publications">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回成果列表
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  )
}
