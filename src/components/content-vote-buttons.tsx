"use client"

import { ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type VoteValue = 1 | -1

type ContentVoteButtonsProps = {
  likes?: number
  dislikes?: number
  currentUserVote?: VoteValue
  disabled?: boolean
  onVote: (value?: VoteValue) => void | Promise<void>
}

export function ContentVoteButtons({
  likes = 0,
  dislikes = 0,
  currentUserVote,
  disabled,
  onVote,
}: ContentVoteButtonsProps) {
  const handleVote = (value: VoteValue) => {
    void onVote(currentUserVote === value ? undefined : value)
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 text-sm shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className={cn(
          "h-8 gap-1 rounded-full px-2 text-slate-600 hover:text-emerald-700",
          currentUserVote === 1 && "bg-emerald-50 text-emerald-700"
        )}
        onClick={() => handleVote(1)}
        aria-label="点赞"
      >
        <ThumbsUp className="h-4 w-4" />
        {likes}
      </Button>
      <span className="px-1 text-xs font-semibold text-slate-500">{likes - dislikes}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className={cn(
          "h-8 gap-1 rounded-full px-2 text-slate-600 hover:text-red-700",
          currentUserVote === -1 && "bg-red-50 text-red-700"
        )}
        onClick={() => handleVote(-1)}
        aria-label="点踩"
      >
        <ThumbsDown className="h-4 w-4" />
        {dislikes}
      </Button>
    </div>
  )
}
