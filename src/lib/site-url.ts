export const DEFAULT_SITE_URL = "https://tongclass.ac.cn"

const fallbackSiteUrl = new URL(DEFAULT_SITE_URL)

/**
 * Resolves the public site origin from a deploy-time environment value without
 * allowing malformed, credentialed, or non-HTTP values into canonical URLs.
 */
export function resolveSiteUrl(configuredUrl = process.env.NEXT_PUBLIC_SITE_URL): URL {
  const candidate = configuredUrl?.trim()

  if (!candidate) return new URL(fallbackSiteUrl)

  try {
    const parsed = new URL(candidate)
    const isHttp = parsed.protocol === "https:" || parsed.protocol === "http:"

    if (!isHttp || !parsed.hostname || parsed.username || parsed.password) {
      return new URL(fallbackSiteUrl)
    }

    return new URL(parsed.origin)
  } catch {
    return new URL(fallbackSiteUrl)
  }
}

export const siteUrl = resolveSiteUrl()

/** Builds a same-origin canonical URL from a pathname, never an external URL. */
export function absoluteSiteUrl(pathname: string): string {
  const normalizedPathname = `/${pathname.replace(/^\/+/, "")}`
  return new URL(normalizedPathname, siteUrl).toString()
}
