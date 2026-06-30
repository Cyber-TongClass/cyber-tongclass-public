"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 B"
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

export function ReimbursementFileUploadField({
  accept,
  description,
  disabled,
  error,
  file,
  inputId,
  label = "提交附件",
  onFileChange,
}: {
  accept: string
  description: string
  disabled?: boolean
  error?: string | null
  file: File | null
  inputId?: string
  label?: string
  onFileChange: (file: File | null) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />
      <p className="text-xs text-slate-500">{file ? `${file.name} · ${formatFileSize(file.size)}` : description}</p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
