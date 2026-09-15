/** The shared Convex reverse-proxy endpoint used by the public deployment. */
export const DEFAULT_AIA_CONVEX_URL = "https://aiagora.pku.edu.cn/convex"

/**
 * Resolve and validate the endpoint once so browser and server clients use
 * the same value. The old NEXT_PUBLIC_CONVEX_URL is intentionally ignored.
 */
export function resolveAiaConvexUrl(rawOverride?: string): string {
  const value = rawOverride?.trim() || DEFAULT_AIA_CONVEX_URL

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error("NEXT_PUBLIC_AIA_CONVEX_URL must be a valid HTTPS URL")
  }

  if (parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_AIA_CONVEX_URL must be an HTTPS URL")
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("NEXT_PUBLIC_AIA_CONVEX_URL must not contain credentials, a query or hash")
  }

  const pathname = parsed.pathname.replace(/\/+$/, "") || "/"
  if (pathname !== "/convex") {
    throw new Error("NEXT_PUBLIC_AIA_CONVEX_URL must use the path /convex")
  }

  return `${parsed.origin}/convex`
}

export const aiaConvexUrl = resolveAiaConvexUrl(process.env.NEXT_PUBLIC_AIA_CONVEX_URL)
