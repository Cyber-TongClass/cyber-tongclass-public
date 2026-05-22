"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { getMatchingPublicationVenues } from "@/lib/publication-venues"

type PublicationVenueInputProps = {
  id?: string
  value: string
  venues: string[]
  placeholder?: string
  required?: boolean
  onChange: (value: string) => void
}

export function PublicationVenueInput({
  id = "venue",
  value,
  venues,
  placeholder,
  required,
  onChange,
}: PublicationVenueInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const suggestions = useMemo(() => getMatchingPublicationVenues(value, venues), [value, venues])
  const showSuggestions = isFocused && suggestions.length > 0

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
        autoComplete="off"
        required={required}
      />
      {showSuggestions && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((venue) => (
            <button
              key={venue}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(venue)
                setIsFocused(false)
              }}
            >
              {venue}
            </button>
          ))}
        </div>
      )}
      {value.trim() && suggestions.length === 0 && isFocused && (
        <p className="mt-1 text-xs text-slate-500">没有匹配到已有名称，保存后会作为新的会议/期刊名称用于之后的提示。</p>
      )}
    </div>
  )
}
