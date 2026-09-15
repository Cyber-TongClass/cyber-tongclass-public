"use client"

import Link from "next/link"
import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { parsePublicationAuthor } from "@/lib/publication-authors"
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
        const author = authorDetails?.[index]
        const displayName = author?.name || legacyAuthor.name
        const isEmphasized = emphasizedUserId && legacyAuthor.userId && String(legacyAuthor.userId) === String(emphasizedUserId)
        const content = (
          <>
            <span
              className={cn(
                (author?.profile || (legacyAuthor.isTongClass && legacyAuthor.userId)) && "underline underline-offset-2 decoration-primary/60",
                isEmphasized && "font-extrabold text-slate-700"
              )}
            >
              {displayName}
            </span>
            {(author?.coFirst ?? legacyAuthor.coFirst) && <sup className="ml-0.5 text-[0.65em] font-bold">*</sup>}
            {(author?.corresponding ?? legacyAuthor.corresponding) && (
              <sup className="ml-0.5 inline-flex translate-y-[-0.2em]">
                <Mail className="h-3 w-3" aria-label="Corresponding author" />
              </sup>
            )}
          </>
        )

        return (
          <span key={`${rawAuthor}-${index}`}>
            {author?.profile || (legacyAuthor.isTongClass && legacyAuthor.userId) ? (
              <Link href={author?.profile?.kind === "institute_person"
                ? `https://aiagora.pku.edu.cn/people/${encodeURIComponent(author.profile.slug)}`
                : `/members/${encodeURIComponent(author?.profile?.slug || legacyAuthor.username || legacyAuthor.userId || "")}`} className="text-slate-900 hover:text-primary">
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
