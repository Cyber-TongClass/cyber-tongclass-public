"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { techDayTrackLabels, type TechDayTrack } from "@/types/techday"

export function TechDayTrackSelect({
  value,
  onValueChange,
}: {
  value: TechDayTrack
  onValueChange: (value: TechDayTrack) => void
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as TechDayTrack)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(techDayTrackLabels).map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TechDayYearSelect({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: Math.max(1, currentYear - 2024 + 1) }, (_, idx) => currentYear - idx)
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="年份" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部年份</SelectItem>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TechDayDirectionSelect({
  value,
  onValueChange,
  directions,
}: {
  value: string
  onValueChange: (value: string) => void
  directions?: Array<{ _id: string; name: string }>
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="方向" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部方向</SelectItem>
        {directions?.map((direction) => (
          <SelectItem key={direction._id} value={direction._id}>{direction.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
