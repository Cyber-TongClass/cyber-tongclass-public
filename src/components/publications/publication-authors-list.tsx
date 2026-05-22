"use client"

import Link from "next/link"
import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { parsePublicationAuthor } from "@/lib/publication-authors"

type PublicationAuthorsListProps = {
  authors: string[]
  emphasizedUserId?: string
  className?: string
}

export function PublicationAuthorsList({ authors, emphasizedUserId, className }: PublicationAuthorsListProps) {
  return (
    <span className={className}>
      {authors.map((rawAuthor, index) => {
        const author = parsePublicationAuthor(rawAuthor)
        const isEmphasized = emphasizedUserId && author.userId && String(author.userId) === String(emphasizedUserId)
        const content = (
          <>
            <span
              className={cn(
                author.isTongClass && author.userId && "underline underline-offset-2 decoration-primary/60",
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
            {author.isTongClass && author.userId ? (
              <Link href={`/members/${author.username || author.userId}`} className="text-slate-900 hover:text-primary">
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
