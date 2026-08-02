"use client"

import { Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type OAFormTargetCandidate = {
  id: string
  title: string
  category?: string
  status?: string
  searchTerms?: string[]
}

export type OAFormTargetPickerProps = {
  candidates: OAFormTargetCandidate[]
  value: string
  onChange: (formId: string) => void
  idPrefix: string
  ariaLabel?: string
  disabled?: boolean
  placeholder?: string
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function OAFormTargetPicker({
  candidates,
  value,
  onChange,
  idPrefix,
  ariaLabel = "查找目标表单",
  disabled = false,
  placeholder = "搜索可填写的表单…",
}: OAFormTargetPickerProps) {
  const selected = candidates.find((candidate) => candidate.id === value)
  const [query, setQuery] = useState(selected?.title || "")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!isOpen) setQuery(selected?.title || "")
  }, [isOpen, selected?.title])

  const normalizedQuery = normalizeSearch(query)
  const matches = useMemo(() => {
    const visible = candidates.filter((candidate) => {
      if (!normalizedQuery || candidate.id === value && normalizedQuery === normalizeSearch(candidate.title)) return true
      const terms = [candidate.title, candidate.category || "", ...(candidate.searchTerms || [])]
      return terms.some((term) => normalizeSearch(term).includes(normalizedQuery))
    })
    return visible.slice(0, 12)
  }, [candidates, normalizedQuery, value])

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(matches.length - 1, 0)))
  }, [matches.length])

  useEffect(() => {
    if (!isOpen) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, isOpen])

  const selectCandidate = (candidate: OAFormTargetCandidate) => {
    onChange(candidate.id)
    setQuery(candidate.title)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const clear = () => {
    onChange("")
    setQuery("")
    setActiveIndex(0)
    setIsOpen(true)
    inputRef.current?.focus()
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={() => {
        window.setTimeout(() => {
          if (!rootRef.current?.contains(document.activeElement)) setIsOpen(false)
        }, 0)
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 aia-text-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        id={`${idPrefix}-form-search`}
        role="combobox"
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={`${idPrefix}-form-results`}
        aria-activedescendant={isOpen && matches[activeIndex] ? `${idPrefix}-form-option-${activeIndex}` : undefined}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        className="aia-focus min-h-11 w-full border aia-border-rule bg-transparent py-2 pl-9 pr-12 text-sm text-[hsl(var(--aia-ink))] placeholder:text-[hsl(var(--aia-muted))] disabled:cursor-not-allowed disabled:opacity-50"
        onFocus={(event) => {
          setIsOpen(true)
          event.currentTarget.select()
        }}
        onClick={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setIsOpen(true)
          if (value) onChange("")
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setIsOpen(true)
            setActiveIndex((index) => matches.length === 0 ? 0 : Math.min(index + 1, matches.length - 1))
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setIsOpen(true)
            setActiveIndex((index) => Math.max(index - 1, 0))
          } else if (event.key === "Enter" && isOpen && matches[activeIndex]) {
            event.preventDefault()
            selectCandidate(matches[activeIndex])
          } else if (event.key === "Escape") {
            event.preventDefault()
            setIsOpen(false)
            setQuery(selected?.title || "")
          }
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="清除目标表单"
          className="aia-focus absolute right-0 top-0 inline-flex min-h-11 min-w-11 items-center justify-center aia-text-muted transition-colors hover:text-[hsl(var(--aia-red))]"
          onClick={clear}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}

      {isOpen && !disabled ? (
        <div
          id={`${idPrefix}-form-results`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto border aia-border-rule bg-[hsl(var(--aia-paper))]"
        >
          {matches.length > 0 ? (
            <ul>
              {matches.map((candidate, index) => (
                <li key={candidate.id}>
                  <button
                    ref={(element) => {
                      optionRefs.current[index] = element
                    }}
                    id={`${idPrefix}-form-option-${index}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={candidate.id === value}
                    className={cn(
                      "aia-focus flex min-h-11 w-full items-baseline gap-3 border-b aia-border-rule px-3 py-2.5 text-left text-sm last:border-b-0",
                      index === activeIndex && "bg-[hsl(var(--aia-tag))]",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCandidate(candidate)}
                  >
                    <span className="min-w-0 flex-1 truncate text-[hsl(var(--aia-ink))]">{candidate.title}</span>
                    <span className="aia-mono shrink-0 text-xs aia-text-muted">
                      {[candidate.category, candidate.status].filter(Boolean).join(" · ") || "表单"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm aia-text-muted">没有匹配的可填写表单。</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
