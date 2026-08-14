import { createHash } from "node:crypto"
import type { OADocumentBindingCandidate, OADocumentTemplateWarning, OADocumentVisualAnchor } from "@/lib/oa-document-templates"
import type { OAPdfLayout, OAPdfPageInfo, OAPdfTextBox } from "@/lib/server/oa-pdf-layout"
import type { OAWordWritableNode } from "@/lib/server/oa-word-layout-index"
import { visibleWordChoiceOption } from "@/lib/server/oa-word-choice"

const MIN_SCORE = 0.72
const MIN_LEAD = 0.12

export interface OAMarkerPlanEntry {
  nodeId: string
  partName: string
  path: string
  marker: string
}

export interface OAMarkerResolution {
  nodeId: string
  marker: string
  visual: OADocumentVisualAnchor
}

function normalized(value: string) {
  return value.normalize("NFKC").replace(/[\u00a0\u3000]/g, " ").replace(/[：:（）()_＿.·…\s]+/g, "").toLocaleLowerCase("en-US")
}

function choiceNormalized(value: string) {
  return normalized(value).replace(/[□☐○◯☒☑●■]/g, "")
}

function unionVisual(boxes: OAPdfTextBox[]): OADocumentVisualAnchor {
  const first = boxes[0]
  const x = Math.min(...boxes.map((box) => box.x))
  const y = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  return { page: first.page, x, y, width: right - x, height: bottom - y, pageWidth: first.pageWidth, pageHeight: first.pageHeight, rotation: first.rotation, coordinateSpace: "normalized-pdf" }
}

function answerVisual(boxes: OAPdfTextBox[], node: OAWordWritableNode) {
  const label = unionVisual(boxes)
  const remainingWidth = Math.max(0.005, 1 - label.x - label.width)
  const width = Math.min(Math.max(0.05, label.width * (node.writeTarget === "paragraph-after" ? 2 : 1)), remainingWidth)
  const below = node.writeTarget === "paragraph-after"
  const proposed = {
    ...label,
    x: below ? label.x : label.x + label.width,
    y: below ? Math.min(1 - label.height, label.y + label.height) : label.y,
    width: below ? Math.min(Math.max(0.2, label.width * 2), 1 - label.x) : width,
  }
  const clampedWidth = Math.min(1, Math.max(0.005, proposed.width))
  const clampedHeight = Math.min(1, Math.max(0.005, proposed.height))
  return {
    ...proposed,
    x: Math.min(Math.max(0, proposed.x), 1 - clampedWidth),
    y: Math.min(Math.max(0, proposed.y), 1 - clampedHeight),
    width: clampedWidth,
    height: clampedHeight,
  }
}

interface ScoredMatch { boxes: OAPdfTextBox[]; score: number; startOrder: number }

function choiceOptions(node: OAWordWritableNode) {
  if (node.options?.length) return node.options.map((option) => choiceNormalized(visibleWordChoiceOption(option))).filter(Boolean)
  return [...node.normalizedText.matchAll(/[□☐○◯☒☑●■]([^□☐○◯☒☑●■]+)/g)]
    .map((match) => choiceNormalized(match[1]))
    .filter(Boolean)
}

function containsOptionsInOrder(value: string, options: string[]) {
  let offset = 0
  for (const option of options) {
    const index = value.indexOf(option, offset)
    if (index < 0) return false
    offset = index + option.length
  }
  return true
}

function expandChoiceMatch(node: OAWordWritableNode, match: ScoredMatch, allBoxes: OAPdfTextBox[]): ScoredMatch | null {
  if (node.writeTarget !== "choice") return match
  const options = choiceOptions(node)
  if (!options.length) return null
  const label = unionVisual(match.boxes)
  const nearby = allBoxes
    .filter((box) => box.page === label.page && box.y + box.height >= label.y - 0.45 && box.y <= label.y + label.height + 0.45)
    .sort((left, right) => Math.round(left.y * 100) - Math.round(right.y * 100) || left.line - right.line || left.x - right.x || left.order - right.order)
  let best: OAPdfTextBox[] | null = null
  for (let start = 0; start < nearby.length; start += 1) {
    let text = ""
    for (let end = start; end < nearby.length && end - start < Math.min(512, options.length * 8 + 32); end += 1) {
      text += choiceNormalized(nearby[end].normalizedText)
      if (!containsOptionsInOrder(text, options)) continue
      const group = nearby.slice(start, end + 1)
      if (!best || group.length < best.length) best = group
      break
    }
  }
  return best ? { ...match, boxes: [...new Map([...match.boxes, ...best].map((item) => [item.order, item])).values()] } : null
}

function geometryOrder(left: ScoredMatch, right: ScoredMatch) {
  const leftVisual = unionVisual(left.boxes)
  const rightVisual = unionVisual(right.boxes)
  return leftVisual.page - rightVisual.page || leftVisual.y - rightVisual.y || leftVisual.x - rightVisual.x || left.startOrder - right.startOrder
}

function nearbyWritableScore(node: OAWordWritableNode, match: ScoredMatch) {
  const visual = unionVisual(match.boxes)
  const available = node.writeTarget === "paragraph-after"
    ? 1 - visual.y - visual.height
    : 1 - visual.x - visual.width
  return Math.min(0.16, Math.max(0, available) * 0.32)
}

function scoredMatches(node: OAWordWritableNode, boxes: OAPdfTextBox[]): ScoredMatch[] {
  const target = normalized(node.normalizedText || node.label)
  if (!target) return []
  const matches: ScoredMatch[] = []
  for (let start = 0; start < boxes.length; start += 1) {
    const first = boxes[start]
    let joined = ""
    for (let end = start; end < Math.min(boxes.length, start + 12); end += 1) {
      const current = boxes[end]
      if (current.page !== first.page) break
      joined += normalized(current.normalizedText)
      if (!joined) continue
      let score = 0
      if (joined === target) score = 1
      else if (joined.startsWith(target)) score = 0.88
      else if (target.startsWith(joined) && joined.length / target.length >= 0.7) score = 0.76
      else if (current.line === first.line && joined.includes(target)) score = 0.82
      if (score) matches.push({ boxes: boxes.slice(start, end + 1), score, startOrder: first.order })
      if (joined.length > target.length * 2 + 12) break
    }
  }
  return matches.sort((left, right) => right.score - left.score || left.startOrder - right.startOrder)
}

export function matchWordNodesToPdf(nodes: OAWordWritableNode[], pdf: OAPdfLayout): { candidates: OADocumentBindingCandidate[]; warnings: OADocumentTemplateWarning[] } {
  const candidates: OADocumentBindingCandidate[] = []
  const warnings: OADocumentTemplateWarning[] = []
  const usedStarts = new Set<number>()
  const orderedNodes = [...nodes].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id, "en-US"))
  for (const node of orderedNodes) {
    const peers = orderedNodes.filter((candidate) => normalized(candidate.normalizedText || candidate.label) === normalized(node.normalizedText || node.label))
    const peerIndex = peers.findIndex((candidate) => candidate.id === node.id)
    const bestByStart = new Map<number, ScoredMatch>()
    for (const rawMatch of scoredMatches(node, pdf.textBoxes)) {
      const match = expandChoiceMatch(node, rawMatch, pdf.textBoxes)
      if (!match) continue
      const existing = bestByStart.get(match.startOrder)
      if (!existing || match.score > existing.score) bestByStart.set(match.startOrder, match)
    }
    const distinctMatches = [...bestByStart.values()]
    const orderedMatches = distinctMatches.some((match) => match.score >= 0.88)
      ? distinctMatches.filter((match) => match.score >= 0.88)
      : distinctMatches
    const geometryMatches = orderedMatches.sort(geometryOrder)
    const tablePeers = node.table
      ? peers.filter((candidate) => candidate.table?.table === node.table?.table).sort((left, right) => (left.table!.row - right.table!.row) || (left.table!.cell - right.table!.cell) || left.order - right.order)
      : []
    const expectedIndex = tablePeers.length > 1 ? tablePeers.findIndex((candidate) => candidate.id === node.id) : peerIndex
    const possible = geometryMatches
      .map((match, matchIndex) => {
        const tableOrderScore = tablePeers.length > 1 && matchIndex === expectedIndex ? 0.24 : 0
        const documentOrderScore = !node.table && peers.length > 1 && matchIndex === expectedIndex ? 0.18 : 0
        return { ...match, score: match.score + tableOrderScore + documentOrderScore + nearbyWritableScore(node, match) }
      })
      .filter((match) => !usedStarts.has(match.startOrder))
      .sort((left, right) => right.score - left.score || left.startOrder - right.startOrder)
    const best = possible[0]
    const second = possible[1]
    if (!best || best.score < MIN_SCORE || (second && best.score - second.score < MIN_LEAD)) {
      warnings.push({ code: best ? "pdf_mapping_ambiguous" : "pdf_mapping_unresolved", message: `${node.label} 未找到唯一可靠的 PDF 写入位置`, severity: "warning", partName: node.partName, regionId: node.id })
      continue
    }
    usedStarts.add(best.startOrder)
    candidates.push({
      id: node.id, label: node.label, description: `${node.kind} · ${node.writeTarget}`,
      partName: node.partName, path: node.path, contextHash: node.contextHash,
      writeTarget: node.writeTarget, ...(node.styleSourcePath ? { styleSourcePath: node.styleSourcePath } : {}),
      visual: node.writeTarget === "choice" ? unionVisual(best.boxes) : answerVisual(best.boxes, node),
    })
  }
  return { candidates, warnings }
}

export function createMarkerPlan(nodes: OAWordWritableNode[]): OAMarkerPlanEntry[] {
  return [...nodes].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id, "en-US")).map((node) => ({
    nodeId: node.id, partName: node.partName, path: node.path,
    marker: `OA_${createHash("sha256").update(`oa-layout-marker-v1|${node.id}`).digest("hex").slice(0, 12).toUpperCase()}`,
  }))
}

function samePageGeometry(expected: OAPdfPageInfo[], actual: OAPdfPageInfo[]) {
  return expected.length === actual.length && expected.every((page, index) => {
    const candidate = actual[index]
    return page.page === candidate.page && Math.abs(page.width - candidate.width) <= 0.01 && Math.abs(page.height - candidate.height) <= 0.01 && page.rotation === candidate.rotation
  })
}

export function validateMarkerLayout(plan: OAMarkerPlanEntry[], cleanPages: OAPdfPageInfo[], marked: OAPdfLayout): { resolved: OAMarkerResolution[]; unresolved: Array<OAMarkerPlanEntry & { reason: "marker_not_unique" }> } {
  if (!samePageGeometry(cleanPages, marked.pages)) throw new Error("标记副本与干净 PDF 的页面几何不一致")
  const resolved: OAMarkerResolution[] = []
  const unresolved: Array<OAMarkerPlanEntry & { reason: "marker_not_unique" }> = []
  for (const item of plan) {
    const marker = normalized(item.marker)
    const hits = marked.textBoxes.filter((box) => normalized(box.normalizedText) === marker)
    if (hits.length !== 1) unresolved.push({ ...item, reason: "marker_not_unique" })
    else resolved.push({ nodeId: item.nodeId, marker: item.marker, visual: unionVisual(hits) })
  }
  return { resolved, unresolved }
}
