import assert from "node:assert/strict"
import test from "node:test"

// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
import { fetchExternalNewsHtml, mapWithConcurrency } from "../lib/externalNewsFetch.ts"

test("rejects redirect outside the fixed host", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(null, { status: 302, headers: { location: "https://evil.invalid/a" } })

  await assert.rejects(
    () => fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch }),
    /redirect_blocked/,
  )
})

test("validates every redirect and follows safe relative redirects manually", async () => {
  const seen: string[] = []
  const fakeFetch: typeof fetch = async (input, init) => {
    seen.push(String(input))
    assert.equal(init?.redirect, "manual")
    if (seen.length === 1) return new Response(null, { status: 301, headers: { location: "/b.htm" } })
    return new Response("<html>ok</html>", { headers: { "content-type": "text/html" } })
  }

  assert.equal(
    await fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch }),
    "<html>ok</html>",
  )
  assert.deepEqual(seen, ["https://www.ai.pku.edu.cn/a.htm", "https://www.ai.pku.edu.cn/b.htm"])
})

test("enforces streamed byte limit", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response("x".repeat(2_000_001), { headers: { "content-type": "text/html; charset=utf-8" } })

  await assert.rejects(
    () => fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch, maxBytes: 2_000_000 }),
    /response_too_large/,
  )
})

test("rejects non-HTML and HTTP error responses", async () => {
  await assert.rejects(
    () =>
      fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", {
        fetchImpl: async () => new Response("{}", { headers: { "content-type": "application/json" } }),
      }),
    /invalid_content_type/,
  )
  await assert.rejects(
    () =>
      fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", {
        fetchImpl: async () => new Response("down", { status: 503, headers: { "content-type": "text/html" } }),
      }),
    /http_error/,
  )
})

test("sends only the public crawler headers and no credentials", async () => {
  let requestHeaders = new Headers()
  const fakeFetch: typeof fetch = async (_url, init) => {
    requestHeaders = new Headers(init?.headers)
    return new Response("<html></html>", { headers: { "content-type": "text/html" } })
  }

  await fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch })
  assert.deepEqual([...requestHeaders.keys()].sort(), ["accept", "user-agent"])
  assert.equal(requestHeaders.has("cookie"), false)
  assert.equal(requestHeaders.has("authorization"), false)
})

test("mapWithConcurrency never runs more workers than allowed and preserves order", async () => {
  let active = 0
  let peak = 0
  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return value * 2
  })

  assert.equal(peak, 2)
  assert.deepEqual(results, [2, 4, 6, 8, 10])
})

test("aborts a request that exceeds its timeout", async () => {
  const fakeFetch: typeof fetch = async (_url, init) =>
    await new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
    })

  await assert.rejects(
    () => fetchExternalNewsHtml("https://www.ai.pku.edu.cn/a.htm", { fetchImpl: fakeFetch, timeoutMs: 5 }),
    /timeout/,
  )
})
