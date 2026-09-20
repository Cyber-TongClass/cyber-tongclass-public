"use client"

import Link from "next/link"
import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUsers } from "@/lib/api"
import { undergraduateAuthorHref, type WebsiteAuthorDetail } from "@/lib/undergraduate-author"
import { parsePublicationAuthor } from "@/lib/publication-authors"

type PublicationAuthorsListProps = {
  authors: string[]
  authorDetails?: WebsiteAuthorDetail[]
  emphasizedUserId?: string
  className?: string
}

export function PublicationAuthorsList({ authors, authorDetails, emphasizedUserId, className }: PublicationAuthorsListProps) {
  const members = useUsers({ classMembersOnly: true, limit: 10000 })
  return (
    <span className={className}>
      {authors.map((rawAuthor, index) => {
        const legacyAuthor = parsePublicationAuthor(rawAuthor)
        const detail = authorDetails?.[index]
        const author = { ...legacyAuthor, ...detail }
        const href = undergraduateAuthorHref(detail, legacyAuthor, members)
        const isEmphasized = href && emphasizedUserId && author.userId && String(author.userId) === String(emphasizedUserId)
        const content = (
          <>
            <span
              className={cn(
                href && "underline underline-offset-2 decoration-primary/60",
                isEmphasized && "font-extrabold text-slate-700"
              )}
            >
              {author.name}
            </span>
            {author.coFirst && <sup className="ml-0.5 text-[0.65em] font-bold">*</sup>}
            {author.corresponding && (
              <sup className="ml-0.5 inline-flex translate-y-[-0.2em]">
                <Mail className="h-3 w-3" aria-label="Corresponding author" />
              </sup>
            )}
          </>
        )

        return (
          <span key={`${rawAuthor}-${index}`}>
            {href ? (
              <Link href={href} className="text-slate-900 hover:text-primary">
                {content}
              </Link>
            ) : (
              <span>{content}</span>
            )}
            {index < authors.length - 1 && ", "}
          </span>
        )
      })}
    </span>
  )
}
