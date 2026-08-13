// @ts-ignore -- Node's strip-types test runner requires the explicit extension.
import { EXTERNAL_NEWS_HOSTS } from "./externalNewsModel.ts"

export type HtmlNode = {
  tag: string
  attrs: Record<string, string>
  children: HtmlNode[]
  text: string
}

export type HtmlLimits = {
  maxChars: number
  maxNodes: number
  maxDepth: number
}

const DEFAULT_LIMITS: HtmlLimits = { maxChars: 2_000_000, maxNodes: 50_000, maxDepth: 80 }
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"])
const SKIPPED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "frame",
  "object",
  "embed",
  "template",
  "noscript",
  "svg",
])

function decodeEntities(value: string): string {
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos);/gi, (entity, decimal, hex) => {
    if (decimal) return safeCodePoint(Number.parseInt(decimal, 10), entity)
    if (hex) return safeCodePoint(Number.parseInt(hex, 16), entity)
    switch (entity.toLowerCase()) {
      case "&amp;": return "&"
      case "&lt;": return "<"
      case "&gt;": return ">"
      case "&quot;": return '"'
      case "&apos;": return "'"
      default: return entity
    }
  })
}

function safeCodePoint(value: number, fallback: string): string {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
    return fallback
  }
  return String.fromCodePoint(value)
}

function findTagEnd(html: string, start: number): number {
  let quote = ""
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index]
    if (quote) {
      if (character === quote) quote = ""
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === ">") {
      return index
    }
  }
  return html.length - 1
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const tagNameEnd = source.search(/\s/)
  if (tagNameEnd < 0) return attrs
  const attributeSource = source.slice(tagNameEnd)
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of attributeSource.matchAll(attributePattern)) {
    const name = match[1].toLowerCase()
    if (name.startsWith("on") || ["style", "srcset", "action", "formaction", "target"].includes(name)) continue
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "")
  }
  return attrs
}

function textNode(value: string): HtmlNode {
  return { tag: "#text", attrs: {}, children: [], text: decodeEntities(value) }
}

export function parseHtmlTree(html: string, limits: HtmlLimits = DEFAULT_LIMITS): HtmlNode {
  if (html.length > limits.maxChars) throw new Error("html_limit: input_too_large")
  const root: HtmlNode = { tag: "#document", attrs: {}, children: [], text: "" }
  const stack = [root]
  let nodeCount = 1
  let cursor = 0

  const append = (node: HtmlNode) => {
    nodeCount += 1
    if (nodeCount > limits.maxNodes) throw new Error("html_limit: too_many_nodes")
    stack[stack.length - 1].children.push(node)
  }

  while (cursor < html.length) {
    if (html.startsWith("<!--", cursor)) {
      const commentEnd = html.indexOf("-->", cursor + 4)
      cursor = commentEnd < 0 ? html.length : commentEnd + 3
      continue
    }
    if (html[cursor] !== "<") {
      const nextTag = html.indexOf("<", cursor)
      const end = nextTag < 0 ? html.length : nextTag
      if (end > cursor) append(textNode(html.slice(cursor, end)))
      cursor = end
      continue
    }

    const tagEnd = findTagEnd(html, cursor)
    const raw = html.slice(cursor + 1, tagEnd).trim()
    cursor = tagEnd + 1
    if (!raw || raw.startsWith("!") || raw.startsWith("?")) continue

    if (raw.startsWith("/")) {
      const closingTag = raw.slice(1).trim().split(/\s/, 1)[0].toLowerCase()
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tag === closingTag) {
          stack.length = index
          break
        }
      }
      continue
    }

    const selfClosing = raw.endsWith("/")
    const tag = raw.replace(/\/$/, "").trim().split(/\s/, 1)[0].toLowerCase()
    if (!/^[a-z][\w:-]*$/.test(tag)) continue

    if (SKIPPED_TAGS.has(tag)) {
      if (!selfClosing && !VOID_TAGS.has(tag)) {
        const closingPattern = new RegExp(`<\\/\\s*${tag}\\s*>`, "ig")
        closingPattern.lastIndex = cursor
        const closing = closingPattern.exec(html)
        cursor = closing ? closing.index + closing[0].length : html.length
      }
      continue
    }

    const node: HtmlNode = { tag, attrs: parseAttributes(raw), children: [], text: "" }
    append(node)
    if (!selfClosing && !VOID_TAGS.has(tag)) {
      if (stack.length >= limits.maxDepth) throw new Error("html_limit: tree_too_deep")
      stack.push(node)
    }
  }
  return root
}

export function findAll(root: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode[] {
  const matches: HtmlNode[] = []
  const visit = (node: HtmlNode) => {
    if (predicate(node)) matches.push(node)
    for (const child of node.children) visit(child)
  }
  visit(root)
  return matches
}

export function first(root: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode | undefined {
  if (predicate(root)) return root
  for (const child of root.children) {
    const match = first(child, predicate)
    if (match) return match
  }
  return undefined
}

export function textContent(node: HtmlNode): string {
  if (node.tag === "#text") return node.text
  return node.children.map(textContent).join(" ").replace(/\s+/g, " ").trim()
}

export function safeAbsoluteContentUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, baseUrl)
    if (url.protocol !== "https:" || url.username || url.password) return undefined
    if (!EXTERNAL_NEWS_HOSTS.has(url.hostname.toLowerCase())) return undefined
    url.hostname = url.hostname.toLowerCase()
    url.hash = ""
    return url.toString()
  } catch {
    return undefined
  }
}

const MARKDOWN_OUTPUT_LIMIT = 250_000

function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]{}()#+.!|<>-])/g, "\\$1")
}

function normalizeMarkdown(value: string): string {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function renderTable(node: HtmlNode): string {
  const rows = findAll(node, (candidate) => candidate.tag === "tr")
    .map((row) => row.children
      .filter((cell) => cell.tag === "th" || cell.tag === "td")
      .map((cell) => escapeMarkdown(textContent(cell)).replace(/\|/g, "\\|")))
    .filter((row) => row.length > 0)
  if (rows.length === 0) return ""
  const width = Math.max(...rows.map((row) => row.length))
  const padded = rows.map((row) => [...row, ...Array.from({ length: width - row.length }, () => "")])
  const header = padded[0]
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...padded.slice(1).map((row) => `| ${row.join(" | ")} |`),
  ].join("\n")
}

export function sanitizedMarkdown(node: HtmlNode, baseUrl: string): string {
  const renderChildren = (current: HtmlNode) => current.children.map(render).join("")
  const render = (current: HtmlNode): string => {
    if (current.tag === "#text") return escapeMarkdown(current.text)
    switch (current.tag) {
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": {
        const level = Number(current.tag.slice(1))
        return `\n\n${"#".repeat(level)} ${renderChildren(current).trim()}\n\n`
      }
      case "p": return `\n\n${renderChildren(current).trim()}\n\n`
      case "br": return "  \n"
      case "strong": case "b": return `**${renderChildren(current).trim()}**`
      case "em": case "i": return `*${renderChildren(current).trim()}*`
      case "blockquote": {
        const content = normalizeMarkdown(renderChildren(current))
        return `\n\n${content.split("\n").map((line) => `> ${line}`).join("\n")}\n\n`
      }
      case "ul": case "ol": return `\n${renderChildren(current)}\n`
      case "li": return `- ${normalizeMarkdown(renderChildren(current))}\n`
      case "a": {
        const label = normalizeMarkdown(renderChildren(current))
        const href = safeAbsoluteContentUrl(current.attrs.href, baseUrl)
        return href && label ? `[${label}](${href})` : label
      }
      case "img": {
        const src = safeAbsoluteContentUrl(current.attrs.src, baseUrl)
        if (!src) return ""
        return `\n\n![${escapeMarkdown(current.attrs.alt ?? "图片")}](${src})\n\n`
      }
      case "table": return `\n\n${renderTable(current)}\n\n`
      case "thead": case "tbody": case "tr": case "th": case "td": return renderChildren(current)
      default: return renderChildren(current)
    }
  }

  return normalizeMarkdown(render(node)).slice(0, MARKDOWN_OUTPUT_LIMIT)
}
