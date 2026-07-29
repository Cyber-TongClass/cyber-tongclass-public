"use client"

import { useEffect, useState } from "react"

import { getTongClassStoredSessionToken } from "@/lib/api"

type SecureIntranetImageProps = {
  fileName: string
  alt: string
  width: number
  height: number
}

export function SecureIntranetImage({ fileName, alt, width, height }: SecureIntranetImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const sessionToken = getTongClassStoredSessionToken()
    if (!sessionToken) {
      setError("请先登录后查看内部资料图片。")
      return
    }
    const controller = new AbortController()
    let localUrl: string | null = null
    void fetch(`/api/intranet-materials/${encodeURIComponent(fileName)}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("内部资料图片加载失败")
      localUrl = URL.createObjectURL(await response.blob())
      setBlobUrl(localUrl)
    }).catch((cause) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "内部资料图片加载失败")
      }
    })
    return () => {
      controller.abort()
      if (localUrl) URL.revokeObjectURL(localUrl)
    }
  }, [fileName])

  if (error) return <p className="text-sm text-red-700" role="alert">{error}</p>
  if (!blobUrl) return <p className="text-sm text-slate-500" role="status">正在安全加载图片…</p>
  // Blob URLs are created from the authenticated same-origin response.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={blobUrl} alt={alt} width={width} height={height} className="h-auto max-w-full object-contain" />
}
