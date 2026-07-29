"use client"

import { Button } from "@/components/ui/button"
import type { AudienceCounts, AudienceFilter } from "@/lib/content-audience"

const audienceOptions: Array<{ value: AudienceFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "undergrad", label: "本科生" },
  { value: "graduate", label: "研究生" },
]

export interface AudienceTabsProps {
  value: AudienceFilter
  onChange: (value: AudienceFilter) => void
  counts: AudienceCounts
}

export function AudienceTabs({ value, onChange, counts }: AudienceTabsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Content audience">
      {audienceOptions.map((option) => {
        const isSelected = option.value === value

        return (
          <Button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={isSelected}
            disabled={counts[option.value] === 0}
            variant={isSelected ? "default" : "outline"}
            className={
              isSelected
                ? "gap-2 rounded-full bg-[hsl(var(--aia-red))] text-white hover:bg-[hsl(var(--aia-red-deep))] focus-visible:ring-[hsl(var(--aia-red))]"
                : "gap-2 rounded-full border-[hsl(var(--aia-rule))] bg-[hsl(var(--aia-paper))] text-[hsl(var(--aia-ink))] hover:bg-[hsl(var(--aia-tag))] hover:text-[hsl(var(--aia-red))] focus-visible:ring-[hsl(var(--aia-red))]"
            }
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            <span
              aria-hidden="true"
              className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums ${
                isSelected
                  ? "bg-white/15 text-white"
                  : "bg-[hsl(var(--aia-tag))] text-[hsl(var(--aia-muted))]"
              }`}
            >
              {counts[option.value]}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
