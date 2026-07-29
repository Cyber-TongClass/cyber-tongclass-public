export function safeLocalPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return fallback
  }
  return value
}

export function withReturnTo(destination: string, returnTo: string): `/${string}` {
  const safeDestination = safeLocalPath(destination, "/")
  const safeReturnTo = safeLocalPath(returnTo, "/")
  const [pathAndQuery, hash = ""] = safeDestination.split("#", 2)
  const separator = pathAndQuery.includes("?") ? "&" : "?"
  return `${pathAndQuery}${separator}returnTo=${encodeURIComponent(safeReturnTo)}${hash ? `#${hash}` : ""}` as `/${string}`
}
