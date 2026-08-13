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
  cloneElementDeep,
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

function createPlaceholderContent(document: WordXmlDocument, block: boolean, runProperties?: WordXmlElement) {
  const run = createWordElement(document, "r")
  if (runProperties) run.appendChild(cloneElementDeep(runProperties))
  const text = createWordElement(document, "t")
  text.setAttribute("xml:space", "preserve")
  text.appendChild(document.createTextNode(" "))
  run.appendChild(text)
  if (!block) return run
  const paragraph = createWordElement(document, "p")
  paragraph.appendChild(run)
  return paragraph
}

function createSdt(
  document: WordXmlDocument,
  field: OADocumentManifestField,
  anchor: OADocumentAnchor,
  block: boolean,
  repeat = false,
  tagValue = `${repeat ? "oa-repeat" : "oa-field"}:${field.fieldId}`,
  runProperties?: WordXmlElement,
  idDiscriminator = "",
) {
  const sdt = createWordElement(document, "sdt")
  const properties = createWordElement(document, "sdtPr")
  const alias = createWordElement(document, "alias")
  setWordAttribute(alias, "val", field.label)
  const tag = createWordElement(document, "tag")
  setWordAttribute(tag, "val", tagValue)
  const id = createWordElement(document, "id")
  setWordAttribute(id, "val", stableNumericId(field.fieldId, anchor.partName, `${anchor.path}${idDiscriminator}`))
  properties.appendChild(alias)
  properties.appendChild(tag)
  properties.appendChild(id)
  const content = createWordElement(document, "sdtContent")
  content.appendChild(createPlaceholderContent(document, block, runProperties))
  sdt.appendChild(properties)
  sdt.appendChild(content)
  return { sdt, content }
}

function explicitWriteTarget(anchor: OADocumentAnchor) {
  if (anchor.structural?.writeTarget) return anchor.structural.writeTarget
  if (anchor.output.mode === "mark_choice") return "choice"
  if (anchor.output.mode === "repeat_row") return "repeat-row"
  if (anchor.output.mode === "append") return "inline-run"
  if (anchor.output.mode === "replace" && anchor.kind === "table_cell") return "table-cell"
  return undefined
}

function firstRunProperties(element: WordXmlElement) {
  const localName = element.localName || element.nodeName.split(":").at(-1)
  const firstRun = localName === "r" ? element : descendantElements(element, "r")[0]
  return firstRun ? childElements(firstRun, "rPr")[0] : undefined
}

function insertParagraphAfter(document: WordXmlDocument, target: WordXmlElement, anchor: OADocumentAnchor, field: OADocumentManifestField) {
  const parent = target.parentNode
  if (!parent) throw new Error(`段落锚点定位已失效：${anchor.path}`)
  const styleSourcePath = anchor.structural?.styleSourcePath
  const styleSource = styleSourcePath ? findElementByStructuralPath(document, styleSourcePath) : target
  if (!styleSource || (styleSource.localName || styleSource.nodeName.split(":").at(-1)) !== "p") {
    throw new Error(`段落样式来源已失效：${styleSourcePath || anchor.path}`)
  }
  const paragraph = createWordElement(document, "p")
  const paragraphProperties = childElements(styleSource, "pPr")[0]
  if (paragraphProperties) paragraph.appendChild(cloneElementDeep(paragraphProperties))
  const { sdt } = createSdt(document, field, anchor, false, false, `oa-field:${field.fieldId}`, firstRunProperties(styleSource))
  paragraph.appendChild(sdt)
  parent.insertBefore(paragraph, target.nextSibling)
}

function runText(run: WordXmlElement) {
  return descendantElements(run, "t").map((item) => item.textContent || "").join("")
}

function choiceMarkerMatches(value: string) {
  return [...value.matchAll(/[□☐○◯☒☑●■]/g)]
}

function normalizeChoiceOptionText(value: string) {
  return value.normalize("NFKC").replace(/[（(].*$/, "").replace(/[\u00a0\u3000]/g, " ").replace(/\s+/g, " ").trim()
}

function visibleChoiceOptions(runs: WordXmlElement[]) {
  const value = runs.map(runText).join("")
  const markers = choiceMarkerMatches(value)
  return markers.map((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length
    const end = markers[index + 1]?.index ?? value.length
    return normalizeChoiceOptionText(value.slice(start, end))
  })
}

function createStyledTextRun(document: WordXmlDocument, prototype: WordXmlElement, value: string) {
  const run = createWordElement(document, "r")
  const runProperties = childElements(prototype, "rPr")[0]
  if (runProperties) run.appendChild(cloneElementDeep(runProperties))
  const text = createWordElement(document, "t")
  if (/^\s|\s$|\s{2}/.test(value)) text.setAttribute("xml:space", "preserve")
  text.appendChild(document.createTextNode(value))
  run.appendChild(text)
  return run
}

function compileChoice(document: WordXmlDocument, target: WordXmlElement, anchor: OADocumentAnchor, field: OADocumentManifestField) {
  const options = (field.options || []).map(normalizeChoiceOptionText)
  const runs = descendantElements(target, "r")
  const visibleOptions = visibleChoiceOptions(runs)
  if (!options.length || visibleOptions.length !== options.length) {
    throw new Error(`选项字段“${field.label}”无法安全匹配选项标记`)
  }
  if (new Set(options).size !== options.length || new Set(visibleOptions).size !== visibleOptions.length) {
    throw new Error(`选项字段“${field.label}”的选项文本必须唯一`)
  }
  if (options.some((option) => !option) || visibleOptions.some((option, index) => !option || option !== options[index])) {
    throw new Error(`选项字段“${field.label}”无法安全匹配选项文本`)
  }
  let optionIndex = 0
  for (const run of runs) {
    const value = runText(run)
    const markerMatches = choiceMarkerMatches(value)
    if (!markerMatches.length) continue
    const supportedChildren = childElements(run).every((child) => {
      const localName = child.localName || child.nodeName.split(":").at(-1)
      return localName === "rPr" || localName === "t"
    })
    if (!supportedChildren) throw new Error(`选项字段“${field.label}”包含无法安全拆分的复杂标记`)
    const parent = run.parentNode
    if (!parent) throw new Error(`选项锚点定位已失效：${anchor.path}`)
    let offset = 0
    for (const match of markerMatches) {
      const markerOffset = match.index
      if (markerOffset > offset) parent.insertBefore(createStyledTextRun(document, run, value.slice(offset, markerOffset)), run)
      const markerRun = createStyledTextRun(document, run, match[0])
      const { sdt, content } = createSdt(
        document,
        field,
        anchor,
        false,
        false,
        `oa-choice:${field.fieldId}:${optionIndex}`,
        undefined,
        `|choice:${optionIndex}`,
      )
      content.removeChild(content.firstChild!)
      content.appendChild(markerRun)
      parent.insertBefore(sdt, run)
      optionIndex += 1
      offset = markerOffset + match[0].length
    }
    if (offset < value.length) parent.insertBefore(createStyledTextRun(document, run, value.slice(offset)), run)
    parent.removeChild(run)
  }
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
  if (anchor.kind === "bookmark") {
    const parent = target.parentNode
    if (!parent) throw new Error(`书签定位已失效：${anchor.path}`)
    const { sdt } = createSdt(document, field, anchor, false)
    parent.insertBefore(sdt, target.nextSibling)
    return
  }
  const writeTarget = explicitWriteTarget(anchor)
  if (writeTarget === "paragraph-after") {
    insertParagraphAfter(document, target, anchor, field)
    return
  }
  if (writeTarget === "choice") {
    compileChoice(document, target, anchor, field)
    return
  }
  if (writeTarget === "repeat-row") {
    const parent = target.parentNode
    if (!parent) throw new Error(`重复行定位已失效：${anchor.path}`)
    const { sdt, content } = createSdt(document, field, anchor, true, true)
    content.removeChild(content.firstChild!)
    parent.replaceChild(sdt, target)
    content.appendChild(target)
    return
  }
  if (writeTarget === "table-cell") {
    const localName = target.localName || target.nodeName.split(":").at(-1)
    if (localName !== "tc") throw new Error(`表格单元格锚点类型无效：${anchor.path}`)
    const { sdt } = createSdt(document, field, anchor, true)
    const properties = childElements(target, "tcPr")[0]
    for (const child of [...childElements(target)]) if (child !== properties) target.removeChild(child)
    target.appendChild(sdt)
    return
  }
  if (writeTarget === "inline-run") {
    const localName = target.localName || target.nodeName.split(":").at(-1)
    if (localName === "p") {
      const { sdt } = createSdt(document, field, anchor, false, false, `oa-field:${field.fieldId}`, firstRunProperties(target))
      target.appendChild(sdt)
      return
    }
    const parent = target.parentNode
    if (!parent) throw new Error(`行内锚点定位已失效：${anchor.path}`)
    const { sdt } = createSdt(document, field, anchor, false, false, `oa-field:${field.fieldId}`, firstRunProperties(target))
    parent.replaceChild(sdt, target)
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
