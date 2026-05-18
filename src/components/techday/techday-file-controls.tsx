"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGenerateTechDayUploadUrl } from "@/lib/api"

export function TechDayFileUpload({
  actorArgs,
  accept,
  onUploaded,
}: {
  actorArgs: Record<string, string | undefined>
  accept?: string
  onUploaded: (file: { storageId: string; fileName: string; mimeType: string; size: number }) => Promise<void>
}) {
  const generateUploadUrl = useGenerateTechDayUploadUrl()
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const uploadUrl = await generateUploadUrl(actorArgs)
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      })
      if (!result.ok) throw new Error("上传失败")
      const payload = await result.json()
      await onUploaded({
        storageId: payload.storageId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      })
      setMessage("上传完成")
      setFile(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input type="file" accept={accept} onChange={(event) => setFile(event.target.files?.[0] || null)} />
      <Button type="button" onClick={upload} disabled={!file || uploading}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "上传中..." : "上传"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  )
}
