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
  test(`${source.key} parses the live AIA list structure, dates, and pagination`, async () => {
    const html = await readFile(
      new URL(`./fixtures/external-news/${source.fixturePrefix}-list.html`, import.meta.url),
      "utf8",
    )
    const result = parseExternalNewsList(source.key, html, source.listUrl)

    assert.equal(result.items.length, 2)
    assert.match(result.items[0].url, /^https:\/\/www\.ai\.pku\.edu\.cn\//)
    assert.ok(result.items[0].sourcePublishedAt)
    assert.equal(result.items[0].coverImageUrl, undefined)
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
    assert.doesNotMatch(result.markdown, /stolen|secret|script|iframe|form|javascript:|data:text|onclick|onerror/i)
    assert.match(result.coverImageUrl ?? "", /^https:\/\/www\.ai\.pku\.edu\.cn\//)
  })
}

test("AIA list parser ignores similarly named navigation outside the verified result root", () => {
  const source = EXTERNAL_NEWS_SOURCES[0]
  const html = `
    <nav><div class="lists"><a href="/evil-navigation.htm">导航链接</a></div></nav>
    <div class="col-md-12">
      <div class="lists clearfix"><div class="liststext2 fr">
        <div class="listtext_tit"><a href="../info/1086/4130.htm">真实新闻</a></div>
        <div class="listtext_cont">2026-08-05</div>
      </div></div>
    </div>`

  const result = parseExternalNewsList(source.key, html, source.listUrl)
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].title, "真实新闻")
})

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
