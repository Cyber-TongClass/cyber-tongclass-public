import {
  findAll,
  first,
  parseHtmlTree,
  safeAbsoluteContentUrl,
  sanitizedMarkdown,
  textContent,
  type HtmlNode,
// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
} from "./externalNewsHtml.ts"
import {
  canonicalizeExternalNewsUrl,
  type ExternalNewsSourceKey,
// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
} from "./externalNewsModel.ts"

export const EXTERNAL_NEWS_SOURCES = [
  {
    key: "news",
    label: "新闻",
    category: "学院新闻",
    fixturePrefix: "news",
    listUrl: "https://www.ai.pku.edu.cn/xwgg1/xwxx.htm",
  },
  {
    key: "notices",
    label: "通知公告",
    category: "通知公告",
    fixturePrefix: "notices",
    listUrl: "https://www.ai.pku.edu.cn/xwgg1/tzgg.htm",
  },
  {
    key: "research_progress",
    label: "科研进展",
    category: "科研进展",
    fixturePrefix: "research-progress",
    listUrl: "https://www.ai.pku.edu.cn/kxyj1/kyjz.htm",
  },
  {
    key: "academic_lectures",
    label: "学术讲座",
    category: "学术讲座",
    fixturePrefix: "academic-lectures",
    listUrl: "https://www.ai.pku.edu.cn/kxyj1/xsjz.htm",
  },
] as const satisfies readonly {
  key: ExternalNewsSourceKey
  label: string
  category: string
  fixturePrefix: string
  listUrl: string
}[]

export type ExternalNewsListItem = {
  title: string
  url: string
  sourcePublishedAt?: number
  coverImageUrl?: string
}

export type ExternalNewsListResult = {
  items: ExternalNewsListItem[]
  nextPageUrl?: string
}

export type ExternalNewsDetailResult = {
  title: string
  markdown: string
  sourcePublishedAt?: number
  coverImageUrl?: string
}

type SourceAdapter = {
  listRoot: (node: HtmlNode) => boolean
  listItem: (node: HtmlNode) => boolean
  detailTitle: (node: HtmlNode) => boolean
  detailDate: (node: HtmlNode) => boolean
  detailContent: (node: HtmlNode) => boolean
}

function hasClass(node: HtmlNode, className: string): boolean {
  return (node.attrs.class ?? "").split(/\s+/).includes(className)
}

function isAiaListItem(node: HtmlNode): boolean {
  if (node.tag !== "div" || !hasClass(node, "lists")) return false
  const textColumn = first(node, (candidate) => candidate.tag === "div" && hasClass(candidate, "liststext2"))
  return Boolean(textColumn && first(textColumn, (candidate) => candidate.tag === "div" && hasClass(candidate, "listtext_tit")))
}

function isAiaListRoot(node: HtmlNode): boolean {
  return node.tag === "div"
    && hasClass(node, "col-md-12")
    && Boolean(first(node, isAiaListItem))
}

function isAiaDetailTitle(node: HtmlNode): boolean {
  return node.tag === "h1" && node.attrs.align?.toLowerCase() === "center"
}

function isAiaDetailDate(node: HtmlNode): boolean {
  return node.tag === "h3" && textContent(node).includes("发布时间")
}

function isAiaDetailContent(node: HtmlNode): boolean {
  return node.tag === "div" && hasClass(node, "v_news_content")
}

// The four live columns currently share the same AIA CMS template. Keep a
// separately addressable adapter per source so a future one-column redesign
// can still fail closed without loosening the other three.
const liveAiaAdapter: SourceAdapter = {
  listRoot: isAiaListRoot,
  listItem: isAiaListItem,
  detailTitle: isAiaDetailTitle,
  detailDate: isAiaDetailDate,
  detailContent: isAiaDetailContent,
}

const newsAdapter: SourceAdapter = { ...liveAiaAdapter }
const noticesAdapter: SourceAdapter = { ...liveAiaAdapter }
const researchProgressAdapter: SourceAdapter = { ...liveAiaAdapter }
const academicLecturesAdapter: SourceAdapter = { ...liveAiaAdapter }

function adapterFor(sourceKey: ExternalNewsSourceKey): SourceAdapter {
  switch (sourceKey) {
    case "news": return newsAdapter
    case "notices": return noticesAdapter
    case "research_progress": return researchProgressAdapter
    case "academic_lectures": return academicLecturesAdapter
  }
}

function normalizeDate(value: string): number | undefined {
  const match = value.match(/(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})日?/)
  if (!match) return undefined
  const [, year, month, day] = match
  const timestamp = Date.parse(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00+08:00`)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function requiredUrl(value: string | undefined, baseUrl: string, code: "list_parse_failed" | "detail_parse_failed"): string {
  const safe = safeAbsoluteContentUrl(value, baseUrl)
  if (!safe) throw new Error(`${code}: unsafe_or_missing_url`)
  return canonicalizeExternalNewsUrl(safe)
}

function parseListWithAdapter(adapter: SourceAdapter, html: string, pageUrl: string): ExternalNewsListResult {
  const tree = parseHtmlTree(html)
  const root = first(tree, adapter.listRoot)
  if (!root) throw new Error("list_parse_failed: missing_list_container")
  const itemNodes = findAll(root, adapter.listItem)
  const items = itemNodes.map((item, index) => {
    const titleContainer = first(item, (node) => node.tag === "div" && hasClass(node, "listtext_tit"))
    const anchor = titleContainer
      ? first(titleContainer, (node) => node.tag === "a" && Boolean(node.attrs.href))
      : undefined
    const title = anchor ? textContent(anchor) : ""
    if (!anchor || !title) throw new Error(`list_parse_failed: missing_item_${index + 1}`)
    const image = first(item, (node) => node.tag === "img")
    return {
      title,
      url: requiredUrl(anchor.attrs.href, pageUrl, "list_parse_failed"),
      sourcePublishedAt: normalizeDate(textContent(item)),
      coverImageUrl: safeAbsoluteContentUrl(image?.attrs.src, pageUrl),
    }
  })
  if (items.length === 0) throw new Error("list_parse_failed: empty_list")

  const nextContainer = first(root, (node) => node.tag === "span" && hasClass(node, "p_next"))
  const next = nextContainer
    ? first(nextContainer, (node) => node.tag === "a" && Boolean(node.attrs.href))
    : undefined
  return {
    items,
    nextPageUrl: next ? requiredUrl(next.attrs.href, pageUrl, "list_parse_failed") : undefined,
  }
}

function parseDetailWithAdapter(adapter: SourceAdapter, html: string, detailUrl: string): ExternalNewsDetailResult {
  const tree = parseHtmlTree(html)
  const titleNode = first(tree, adapter.detailTitle)
  const contentNode = first(tree, adapter.detailContent)
  const title = titleNode ? textContent(titleNode) : ""
  if (!title) throw new Error("detail_parse_failed: missing_title")
  if (!contentNode) throw new Error("detail_parse_failed: missing_content")
  const markdown = sanitizedMarkdown(contentNode, detailUrl)
  if (!markdown) throw new Error("detail_parse_failed: empty_content")

  const dateNode = first(tree, adapter.detailDate)
  const image = first(contentNode, (node) => node.tag === "img")
  return {
    title,
    markdown,
    sourcePublishedAt: dateNode ? normalizeDate(textContent(dateNode)) : undefined,
    coverImageUrl: safeAbsoluteContentUrl(image?.attrs.src, detailUrl),
  }
}

export function parseExternalNewsList(
  sourceKey: ExternalNewsSourceKey,
  html: string,
  pageUrl: string,
): ExternalNewsListResult {
  return parseListWithAdapter(adapterFor(sourceKey), html, canonicalizeExternalNewsUrl(pageUrl))
}

export function parseExternalNewsDetail(
  sourceKey: ExternalNewsSourceKey,
  html: string,
  detailUrl: string,
): ExternalNewsDetailResult {
  return parseDetailWithAdapter(adapterFor(sourceKey), html, canonicalizeExternalNewsUrl(detailUrl))
}
