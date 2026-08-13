import {
  canonicalizeExternalNewsUrl,
  type ExternalNewsFailureCode,
// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
} from "./externalNewsModel.ts"

const DEFAULT_MAX_BYTES = 2_000_000
const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_MAX_REDIRECTS = 3

export class ExternalNewsFetchError extends Error {
  readonly code: ExternalNewsFailureCode

  constructor(code: ExternalNewsFailureCode) {
    super(code)
    this.name = "ExternalNewsFetchError"
    this.code = code
  }
}

export type ExternalNewsFetchOptions = {
  fetchImpl?: typeof fetch
  maxBytes?: number
  timeoutMs?: number
  maxRedirects?: number
}

function validatedInitialUrl(value: string): string {
  try {
    return canonicalizeExternalNewsUrl(value)
  } catch (error) {
    if (error instanceof Error && error.message.includes("域名")) {
      throw new ExternalNewsFetchError("blocked_host")
    }
    throw new ExternalNewsFetchError("invalid_url")
  }
}

function validatedRedirectUrl(value: string, currentUrl: string): string {
  try {
    return canonicalizeExternalNewsUrl(new URL(value, currentUrl).toString())
  } catch {
    throw new ExternalNewsFetchError("redirect_blocked")
  }
}

async function requestWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      reject(new ExternalNewsFetchError("timeout"))
    }, timeoutMs)
  })

  try {
    return await Promise.race([
      fetchImpl(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "PKU-AIA-Internal-News-Sync/1.0",
        },
      }),
      timeout,
    ])
  } catch (error) {
    if (error instanceof ExternalNewsFetchError) throw error
    if (controller.signal.aborted) throw new ExternalNewsFetchError("timeout")
    throw new ExternalNewsFetchError("http_error")
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const declaredSize = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new ExternalNewsFetchError("response_too_large")
  }
  if (!response.body) return ""

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: false })
  let received = 0
  let result = ""
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    received += chunk.value.byteLength
    if (received > maxBytes) {
      await reader.cancel()
      throw new ExternalNewsFetchError("response_too_large")
    }
    result += decoder.decode(chunk.value, { stream: true })
  }
  return result + decoder.decode()
}

export async function fetchExternalNewsHtml(
  value: string,
  options: ExternalNewsFetchOptions = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new ExternalNewsFetchError("response_too_large")
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new ExternalNewsFetchError("timeout")
  if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0) throw new ExternalNewsFetchError("redirect_blocked")

  let currentUrl = validatedInitialUrl(value)
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await requestWithTimeout(fetchImpl, currentUrl, timeoutMs)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location || redirects === maxRedirects) throw new ExternalNewsFetchError("redirect_blocked")
      currentUrl = validatedRedirectUrl(location, currentUrl)
      continue
    }
    if (!response.ok) throw new ExternalNewsFetchError("http_error")

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
    if (!contentType.startsWith("text/html") && !contentType.startsWith("application/xhtml+xml")) {
      throw new ExternalNewsFetchError("invalid_content_type")
    }
    return await readBoundedBody(response, maxBytes)
  }
  throw new ExternalNewsFetchError("redirect_blocked")
}

export async function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  concurrency: number,
  worker: (item: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
    throw new Error("concurrency must be a positive integer")
  }
  const results = new Array<Output>(items.length)
  let nextIndex = 0

  const run = async () => {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}
