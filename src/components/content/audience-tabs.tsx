"use client"

import { Button } from "@/components/ui/button"
import type { AudienceCounts, AudienceFilter } from "@/lib/content-audience"

const audienceOptions: Array<{ value: AudienceFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "undergrad", label: "Undergrad" },
  { value: "graduate", label: "Grad" },
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
            variant={isSelected ? "default" : "outline"}
            className="gap-2 rounded-full"
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            <span
              aria-hidden="true"
              className="min-w-5 rounded-full bg-black/10 px-1.5 py-0.5 text-center text-xs tabular-nums"
            >
              {counts[option.value]}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
