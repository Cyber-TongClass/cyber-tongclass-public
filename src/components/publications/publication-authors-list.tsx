"use client"

import Link from "next/link"
import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { parsePublicationAuthor, toPublicPublicationAuthor } from "@/lib/publication-authors"
import type { PublicPublicationAuthor } from "@/types"

type PublicationAuthorsListProps = {
  authors: string[]
  authorDetails?: PublicPublicationAuthor[]
  emphasizedUserId?: string
  className?: string
}

export function PublicationAuthorsList({ authors, authorDetails, emphasizedUserId, className }: PublicationAuthorsListProps) {
  return (
    <span className={className}>
      {authors.map((rawAuthor, index) => {
        const legacyAuthor = parsePublicationAuthor(rawAuthor)
        const author = authorDetails?.[index] || toPublicPublicationAuthor(legacyAuthor)
        const isEmphasized = emphasizedUserId && legacyAuthor.userId && String(legacyAuthor.userId) === String(emphasizedUserId)
        const content = (
          <>
            <span
              className={cn(
                author.profile && "underline underline-offset-2 decoration-primary/60",
                isEmphasized && "font-extrabold text-slate-700"
              )}
            >
              {author.name}
            </span>
            {author.coFirst && <sup className="ml-0.5 text-[0.65em] font-bold">*</sup>}
            {author.corresponding && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <Mail className="h-3 w-3" aria-hidden="true" />
                通讯作者
              </span>
            )}
          </>
        )

        return (
          <span key={`${rawAuthor}-${index}`}>
            {author.profile ? (
              <Link
                href={author.profile.kind === "institute_person"
                  ? `/people/${encodeURIComponent(author.profile.slug)}`
                  : `/tong-class/members/${encodeURIComponent(author.profile.slug)}`}
                className="text-slate-900 hover:text-primary"
              >
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
