import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import {
  EXTERNAL_NEWS_SOURCES,
  parseExternalNewsDetail,
  parseExternalNewsList,
// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
} from "../lib/externalNewsSources.ts"
// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
import { parseHtmlTree, safeAbsoluteContentUrl, sanitizedMarkdown } from "../lib/externalNewsHtml.ts"

for (const source of EXTERNAL_NEWS_SOURCES) {
  test(`${source.key} parses relative URLs, dates, images, and pagination`, async () => {
    const html = await readFile(
      new URL(`./fixtures/external-news/${source.fixturePrefix}-list.html`, import.meta.url),
      "utf8",
    )
    const result = parseExternalNewsList(source.key, html, source.listUrl)

    assert.equal(result.items.length, 2)
    assert.match(result.items[0].url, /^https:\/\/www\.ai\.pku\.edu\.cn\//)
    assert.ok(result.items[0].sourcePublishedAt)
    assert.match(result.items[0].coverImageUrl ?? "", /^https:\/\/www\.ai\.pku\.edu\.cn\//)
    assert.ok(result.nextPageUrl)
  })

  test(`${source.key} produces Markdown with hostile HTML removed`, async () => {
    const html = await readFile(
      new URL(`./fixtures/external-news/${source.fixturePrefix}-detail.html`, import.meta.url),
      "utf8",
    )
    const result = parseExternalNewsDetail(source.key, html, source.listUrl)

    assert.match(result.markdown, /合成正文/)
    assert.match(result.markdown, /安全链接/)
    assert.doesNotMatch(result.markdown, /stolen|script|iframe|form|javascript:|data:text|onclick|onerror/i)
    assert.match(result.coverImageUrl ?? "", /^https:\/\/www\.ai\.pku\.edu\.cn\//)
  })
}

test("malformed detail fails with a bounded parser code", async () => {
  const source = EXTERNAL_NEWS_SOURCES[0]
  const html = await readFile(new URL("./fixtures/external-news/malformed.html", import.meta.url), "utf8")

  assert.throws(() => parseExternalNewsDetail(source.key, html, source.listUrl), /^Error: detail_parse_failed:/)
})

test("HTML limits reject excessive input and unsafe absolute content URLs", () => {
  assert.throws(() => parseHtmlTree("x".repeat(101), { maxChars: 100, maxNodes: 10, maxDepth: 5 }), /html_limit/)
  assert.equal(safeAbsoluteContentUrl("javascript:alert(1)", "https://www.ai.pku.edu.cn/a.htm"), undefined)
  assert.equal(safeAbsoluteContentUrl("https://evil.invalid/a", "https://www.ai.pku.edu.cn/a.htm"), undefined)
})

test("Markdown converter never emits raw HTML and decodes entities", () => {
  const tree = parseHtmlTree('<main><h2>A &amp; B</h2><p>literal &lt;tag&gt;</p><a href="/safe">safe</a></main>')
  const markdown = sanitizedMarkdown(tree, "https://www.ai.pku.edu.cn/base.htm")

  assert.match(markdown, /^## A & B/m)
  assert.match(markdown, /\[safe\]\(https:\/\/www\.ai\.pku\.edu\.cn\/safe\)/)
  assert.doesNotMatch(markdown, /<main>|<h2>|<p>/)
})
