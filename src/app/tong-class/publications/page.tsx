"use client"

import * as React from "react"

import { TongClassPublicationArchive } from "@/components/content/tong-class-publication-archive"
import {
  type PublicationArchiveItem,
} from "@/components/content/publication-archive"
import { usePublications } from "@/lib/api"

export default function PublicationsPage() {
  const publicationsData = usePublications({ limit: 100 })
  const publications = React.useMemo<PublicationArchiveItem[] | undefined>(
    () =>
      publicationsData?.map((publication) => ({
        id: String(publication._id),
        title: publication.title,
        authors: publication.authors,
        authorDetails: publication.authorDetails,
        venue: publication.venue,
        year: publication.year,
        abstract: publication.abstract,
        url: publication.url,
        category: publication.category,
        subCategory: publication.subCategory,
      })),
    [publicationsData]
  )

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-primary">
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[5rem] font-extrabold uppercase leading-none tracking-[0.15em] text-white/5 sm:left-6 md:text-[8rem] lg:left-8 lg:text-[10rem]"
            aria-hidden="true"
          >
            PUBLICATIONS
          </div>
          <div className="mb-4 flex items-center gap-3">
            <h1 className="text-5xl font-extrabold tracking-tight text-white md:text-7xl">学术成果</h1>
          </div>
          <p className="relative max-w-2xl text-lg text-white/70">展示通班师生的学术论文、研究成果与创新贡献。</p>
        </div>
      </section>

      <TongClassPublicationArchive
        items={publications}
        detailHref={(item) => `/tong-class/publications/${item.id}`}
      />
    </div>
  )
}
