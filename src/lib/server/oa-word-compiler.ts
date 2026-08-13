import { createHash } from "node:crypto"
import {
  validateTemplateManifest,
  type OADocumentAnchor,
  type OADocumentManifestField,
  type OADocumentTemplateManifest,
} from "@/lib/oa-document-templates"
import { readOoxmlPackage } from "@/lib/server/ooxml-package"
import {
  childElements,
  createWordElement,
  descendantElements,
  findElementByStructuralPath,
  inspectWordXmlPart,
  parseWordXml,
  serializeWordXml,
  setWordAttribute,
  wordContextHash,
  type WordXmlDocument,
  type WordXmlElement,
} from "@/lib/server/oa-word-xml"

export { inspectWordXmlPart } from "@/lib/server/oa-word-xml"

export interface CompiledWordTemplate {
  bytes: Buffer
  changedParts: string[]
  untouchedPartSha256: Record<string, string>
}

function sha256(data: Uint8Array) {
  return createHash("sha256").update(data).digest("hex")
}

function stableNumericId(fieldId: string, partName: string, path: string) {
  return String(createHash("sha256").update(`${fieldId}|${partName}|${path}`).digest().readUInt32BE(0) & 0x7fffffff)
}

function createPlaceholderContent(document: WordXmlDocument, block: boolean) {
  const run = createWordElement(document, "r")
  const text = createWordElement(document, "t")
  text.setAttribute("xml:space", "preserve")
  text.appendChild(document.createTextNode(" "))
  run.appendChild(text)
  if (!block) return run
  const paragraph = createWordElement(document, "p")
  paragraph.appendChild(run)
  return paragraph
}

function createSdt(document: WordXmlDocument, field: OADocumentManifestField, anchor: OADocumentAnchor, block: boolean, repeat = false) {
  const sdt = createWordElement(document, "sdt")
  const properties = createWordElement(document, "sdtPr")
  const alias = createWordElement(document, "alias")
  setWordAttribute(alias, "val", field.label)
  const tag = createWordElement(document, "tag")
  setWordAttribute(tag, "val", `${repeat ? "oa-repeat" : "oa-field"}:${field.fieldId}`)
  const id = createWordElement(document, "id")
  setWordAttribute(id, "val", stableNumericId(field.fieldId, anchor.partName, anchor.path))
  properties.appendChild(alias)
  properties.appendChild(tag)
  properties.appendChild(id)
  const content = createWordElement(document, "sdtContent")
  content.appendChild(createPlaceholderContent(document, block))
  sdt.appendChild(properties)
  sdt.appendChild(content)
  return { sdt, content }
}

function updateExistingSdt(target: WordXmlElement, field: OADocumentManifestField, anchor: OADocumentAnchor) {
  const document = target.ownerDocument
  if (!document) throw new Error(`内容控件缺少所属文档：${anchor.path}`)
  let properties = childElements(target, "sdtPr")[0]
  if (!properties) {
    properties = createWordElement(document, "sdtPr")
    target.insertBefore(properties, target.firstChild)
  }
  let alias = childElements(properties, "alias")[0]
  if (!alias) { alias = createWordElement(document, "alias"); properties.appendChild(alias) }
  setWordAttribute(alias, "val", field.label)
  let tag = childElements(properties, "tag")[0]
  if (!tag) { tag = createWordElement(document, "tag"); properties.appendChild(tag) }
  setWordAttribute(tag, "val", `oa-field:${field.fieldId}`)
  let id = childElements(properties, "id")[0]
  if (!id) { id = createWordElement(document, "id"); properties.appendChild(id) }
  setWordAttribute(id, "val", stableNumericId(field.fieldId, anchor.partName, anchor.path))
}

function wrapTarget(document: WordXmlDocument, target: WordXmlElement, anchor: OADocumentAnchor, field: OADocumentManifestField) {
  if (anchor.kind === "content_control" || target.localName === "sdt" || target.nodeName.endsWith(":sdt")) {
    updateExistingSdt(target, field, anchor)
    return
  }
  if (anchor.kind === "repeat_row" || anchor.output.mode === "repeat_row") {
    const parent = target.parentNode
    if (!parent) throw new Error(`重复行定位已失效：${anchor.path}`)
    const { sdt, content } = createSdt(document, field, anchor, true, true)
    content.removeChild(content.firstChild!)
    parent.replaceChild(sdt, target)
    content.appendChild(target)
    return
  }
  if (anchor.kind === "bookmark") {
    const parent = target.parentNode
    if (!parent) throw new Error(`书签定位已失效：${anchor.path}`)
    const { sdt } = createSdt(document, field, anchor, false)
    parent.insertBefore(sdt, target.nextSibling)
    return
  }
  const localName = target.localName || target.nodeName.split(":").at(-1)
  if (localName === "tc") {
    const { sdt } = createSdt(document, field, anchor, true)
    const properties = childElements(target, "tcPr")[0]
    for (const child of [...childElements(target)]) if (child !== properties) target.removeChild(child)
    target.appendChild(sdt)
    return
  }
  if (localName === "p" && anchor.output.mode === "append") {
    const { sdt } = createSdt(document, field, anchor, false)
    target.appendChild(sdt)
    return
  }
  const parent = target.parentNode
  if (!parent) throw new Error(`锚点定位已失效：${anchor.path}`)
  const block = localName === "p" || localName === "tr"
  const { sdt, content } = createSdt(document, field, anchor, block)
  content.removeChild(content.firstChild!)
  parent.replaceChild(sdt, target)
  content.appendChild(target)
}

function assertCompilationReady(manifest: OADocumentTemplateManifest) {
  validateTemplateManifest(manifest)
  const pending = manifest.suggestions.filter((suggestion) => suggestion.reviewState === "unresolved" || suggestion.reviewState === "conflict" || suggestion.conflictIds.length > 0)
  if (pending.length) throw new Error(`模板仍有 ${pending.length} 个未解决或冲突区域`)
  if (manifest.anchors.some((anchor) => !manifest.fields.some((field) => field.fieldId === anchor.fieldId))) throw new Error("锚点引用不存在的字段")
}

export function compileWordTemplate(input: Uint8Array | Buffer, manifest: OADocumentTemplateManifest): CompiledWordTemplate {
  assertCompilationReady(manifest)
  const pkg = readOoxmlPackage(input)
  const fieldById = new Map(manifest.fields.map((field) => [field.fieldId, field]))
  const anchorsByPart = new Map<string, OADocumentAnchor[]>()
  for (const anchor of manifest.anchors) {
    if (!pkg.has(anchor.partName) || !/^word\/(?:document|header\d+|footer\d+)\.xml$/i.test(anchor.partName)) {
      throw new Error(`锚点部件不存在或不受支持：${anchor.partName}`)
    }
    const anchors = anchorsByPart.get(anchor.partName) || []
    anchors.push(anchor)
    anchorsByPart.set(anchor.partName, anchors)
  }
  const changes = new Map<string, string>()
  for (const [partName, anchors] of [...anchorsByPart].sort(([left], [right]) => left.localeCompare(right, "en"))) {
    const document = parseWordXml(pkg.readText(partName))
    const targets = anchors.map((anchor) => {
      const target = findElementByStructuralPath(document, anchor.path)
      if (!target) throw new Error(`Word 锚点定位已变化：${partName} ${anchor.path}`)
      if (wordContextHash(target) !== anchor.contextHash) throw new Error(`Word 锚点上下文已变化：${partName} ${anchor.path}`)
      return { anchor, target, field: fieldById.get(anchor.fieldId)! }
    })
    // Deeper/later nodes first prevents one wrapper from invalidating another target.
    targets.sort((left, right) => right.anchor.path.length - left.anchor.path.length || right.anchor.path.localeCompare(left.anchor.path, "en"))
    for (const { anchor, target, field } of targets) wrapTarget(document, target, anchor, field)
    changes.set(partName, serializeWordXml(document))
  }
  const untouchedPartSha256: Record<string, string> = {}
  for (const [name, entry] of pkg.entries) if (!changes.has(name)) untouchedPartSha256[name] = sha256(entry.data)
  return {
    bytes: pkg.replaceEntries(changes),
    changedParts: [...changes.keys()].sort((left, right) => left.localeCompare(right, "en")),
    untouchedPartSha256,
  }
}

export function listCompiledFieldTags(xml: string) {
  const document = parseWordXml(xml)
  return descendantElements(document, "tag")
    .map((element) => {
      for (let index = 0; index < element.attributes.length; index += 1) {
        const attribute = element.attributes.item(index)
        if (attribute && (attribute.localName || attribute.nodeName.split(":").at(-1)) === "val") return attribute.value
      }
      return null
    })
    .filter((value): value is string => !!value && /^(?:oa-field|oa-repeat):/.test(value))
}
