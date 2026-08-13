import type { OoxmlPackage } from "@/lib/server/ooxml-package"

const OFFICE_DOCUMENT_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
const HYPERLINK_REL_SUFFIX = "/relationships/hyperlink"
const FORBIDDEN_REL_SUFFIXES = [
  "/relationships/oleObject",
  "/relationships/package",
  "/relationships/externalLink",
  "/relationships/attachedTemplate",
  "/relationships/control",
  "/relationships/vbaProject",
]
const FORBIDDEN_ENTRY_PATTERNS = [
  /(?:^|\/)vbaProject(?:Signature)?\.bin$/i,
  /(?:^|\/)embeddings(?:\/|$)/i,
  /(?:^|\/)activeX(?:\/|$)/i,
  /(?:^|\/)ctrlProps(?:\/|$)/i,
]
const FORBIDDEN_CONTENT_TYPES = [
  /macroEnabled/i,
  /vnd\.ms-office\.vbaProject/i,
  /oleObject/i,
  /activex/i,
]
const MAIN_DOCUMENT_CONTENT_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml",
])

function assertSafeXml(xml: string, partName: string) {
  if (/<!DOCTYPE\b/i.test(xml)) throw new Error(`XML 部件包含禁止的 DTD：${partName}`)
  if (/<!ENTITY\b/i.test(xml)) throw new Error(`XML 部件包含禁止的实体声明：${partName}`)
  if (/\bSYSTEM\s+["']/i.test(xml) || /\bPUBLIC\s+["']/i.test(xml)) throw new Error(`XML 部件包含外部实体：${partName}`)
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}

function attributes(tag: string) {
  const values = new Map<string, string>()
  const pattern = /(?:^|\s)([A-Za-z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g
  for (const match of tag.matchAll(pattern)) values.set(match[1], decodeXml(match[2].slice(1, -1)))
  return values
}

function parseElements(xml: string, localName: string) {
  const pattern = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*\\/?\\s*>`, "gi")
  return Array.from(xml.matchAll(pattern), (match) => attributes(match[0]))
}

function normalizeInternalTarget(relsPartName: string, target: string) {
  if (!target || target.includes("\\") || target.includes("\0") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith("//")) {
    throw new Error(`OOXML 内部关系目标不安全：${target}`)
  }
  const ownerPart = relsPartName === "_rels/.rels"
    ? ""
    : relsPartName.replace(/(^|\/)_rels\/([^/]+)\.rels$/, "$1$2")
  const baseSegments = ownerPart.split("/").slice(0, -1).filter(Boolean)
  const targetSegments = target.replace(/^\/+/, "").split("/")
  for (const segment of targetSegments) {
    if (!segment || segment === ".") continue
    if (segment === "..") {
      if (!baseSegments.pop()) throw new Error(`OOXML 内部关系越过包根目录：${target}`)
    } else {
      baseSegments.push(segment)
    }
  }
  return baseSegments.join("/")
}

function validateContentTypes(pkg: OoxmlPackage) {
  if (!pkg.has("[Content_Types].xml")) throw new Error("DOCX 缺少 [Content_Types].xml")
  const xml = pkg.readText("[Content_Types].xml")
  assertSafeXml(xml, "[Content_Types].xml")
  const allContentTypes = [
    ...parseElements(xml, "Default").map((item) => item.get("ContentType") ?? ""),
    ...parseElements(xml, "Override").map((item) => item.get("ContentType") ?? ""),
  ]
  for (const contentType of allContentTypes) {
    if (FORBIDDEN_CONTENT_TYPES.some((pattern) => pattern.test(contentType))) throw new Error(`DOCX 声明了禁止的宏或嵌入内容：${contentType}`)
  }
  const mainOverride = parseElements(xml, "Override").find((item) => item.get("PartName") === "/word/document.xml")
  if (!mainOverride || !MAIN_DOCUMENT_CONTENT_TYPES.has(mainOverride.get("ContentType") ?? "")) {
    throw new Error("DOCX 缺少受支持的 Word 主文档内容类型")
  }
}

function validateRelationships(pkg: OoxmlPackage, relsPartName: string) {
  const xml = pkg.readText(relsPartName)
  assertSafeXml(xml, relsPartName)
  const relationships = parseElements(xml, "Relationship")
  for (const relationship of relationships) {
    const type = relationship.get("Type") ?? ""
    const target = relationship.get("Target") ?? ""
    const external = (relationship.get("TargetMode") ?? "").toLocaleLowerCase("en-US") === "external"
    if (FORBIDDEN_REL_SUFFIXES.some((suffix) => type.endsWith(suffix))) {
      throw new Error(type.endsWith("/package") ? "DOCX 包含禁止的嵌入包关系" : `DOCX 包含禁止的外部关系或活动内容：${type}`)
    }
    if (external) {
      if (!type.endsWith(HYPERLINK_REL_SUFFIX) || !/^(?:https?:|mailto:)/i.test(target)) throw new Error(`DOCX 包含不安全的外部关系：${target}`)
      continue
    }
    const resolved = normalizeInternalTarget(relsPartName, target)
    if (!pkg.has(resolved)) throw new Error(`DOCX 关系指向缺失部件：${resolved}`)
  }
  return relationships
}

export function assertSafeDocxPackage(pkg: OoxmlPackage) {
  for (const entry of pkg.entries.values()) {
    if (FORBIDDEN_ENTRY_PATTERNS.some((pattern) => pattern.test(entry.name))) {
      const kind = /vba/i.test(entry.name) ? "宏" : "嵌入对象"
      throw new Error(`DOCX 包含禁止的${kind}：${entry.name}`)
    }
    if (/\.(?:xml|rels)$/i.test(entry.name)) assertSafeXml(pkg.readText(entry.name), entry.name)
  }
  validateContentTypes(pkg)
  if (!pkg.has("_rels/.rels")) throw new Error("DOCX 缺少根关系部件")
  const rootRelationships = validateRelationships(pkg, "_rels/.rels")
  const officeDocument = rootRelationships.find((item) => item.get("Type") === OFFICE_DOCUMENT_REL)
  if (!officeDocument || officeDocument.get("TargetMode")?.toLocaleLowerCase("en-US") === "external") throw new Error("DOCX 缺少内部 Word 主文档关系")
  const mainPart = normalizeInternalTarget("_rels/.rels", officeDocument.get("Target") ?? "")
  if (mainPart !== "word/document.xml" || !pkg.has(mainPart)) throw new Error("DOCX 主文档关系无效")
  for (const name of pkg.entries.keys()) {
    if (name.endsWith(".rels") && name !== "_rels/.rels") validateRelationships(pkg, name)
  }
  return pkg
}
