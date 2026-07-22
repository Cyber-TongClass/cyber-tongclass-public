export function getSafeExternalUrl(value?: string | null): string | undefined {
  if (!value) return undefined

  const candidate = value.trim()
  if (!/^https?:\/\//i.test(candidate)) return undefined

  try {
    const parsedUrl = new URL(candidate)
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return undefined
    return parsedUrl.href
  } catch {
    return undefined
  }
}
