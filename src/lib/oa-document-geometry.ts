import type { OADocumentBindingCandidate, OADocumentVisualAnchor } from "./oa-document-templates"

const MIN_NORMALIZED_SIZE = 0.005

export type OADocumentResizeHandle =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-right"
  | "bottom-left"

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function clampVisualAnchor(anchor: OADocumentVisualAnchor): OADocumentVisualAnchor {
  const width = clamp(anchor.width, MIN_NORMALIZED_SIZE, 1)
  const height = clamp(anchor.height, MIN_NORMALIZED_SIZE, 1)
  return {
    ...anchor,
    x: clamp(anchor.x, 0, 1 - width),
    y: clamp(anchor.y, 0, 1 - height),
    width,
    height,
  }
}

export function resizeVisualAnchor(
  anchor: OADocumentVisualAnchor,
  handle: OADocumentResizeHandle,
  dx: number,
  dy: number,
): OADocumentVisualAnchor {
  const originalRight = anchor.x + anchor.width
  const originalBottom = anchor.y + anchor.height
  let left = anchor.x
  let right = originalRight
  let top = anchor.y
  let bottom = originalBottom

  if (handle.includes("left")) left = clamp(anchor.x + dx, 0, originalRight - MIN_NORMALIZED_SIZE)
  else if (handle.includes("right")) right = clamp(originalRight + dx, anchor.x + MIN_NORMALIZED_SIZE, 1)
  if (handle.includes("top")) top = clamp(anchor.y + dy, 0, originalBottom - MIN_NORMALIZED_SIZE)
  else if (handle.includes("bottom")) bottom = clamp(originalBottom + dy, anchor.y + MIN_NORMALIZED_SIZE, 1)

  return {
    ...anchor,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function clientRectToVisualAnchor(
  page: Pick<OADocumentVisualAnchor, "page" | "pageWidth" | "pageHeight" | "rotation">,
  rectangle: { left: number; top: number; width: number; height: number },
  renderedPage: { left: number; top: number; width: number; height: number },
): OADocumentVisualAnchor {
  const values = [
    page.page,
    page.pageWidth,
    page.pageHeight,
    page.rotation,
    rectangle.left,
    rectangle.top,
    rectangle.width,
    rectangle.height,
    renderedPage.left,
    renderedPage.top,
    renderedPage.width,
    renderedPage.height,
  ]
  if (!values.every(Number.isFinite)) throw new Error("客户端矩形与页面几何必须使用有限数值")
  if (renderedPage.width <= 0 || renderedPage.height <= 0) throw new Error("渲染页面尺寸必须大于零")

  const x = (rectangle.left - renderedPage.left) / renderedPage.width
  const y = (rectangle.top - renderedPage.top) / renderedPage.height
  const width = rectangle.width / renderedPage.width
  const height = rectangle.height / renderedPage.height

  const unrotated = page.rotation === 90
    ? { x: y, y: 1 - x - width, width: height, height: width }
    : page.rotation === 180
      ? { x: 1 - x - width, y: 1 - y - height, width, height }
      : page.rotation === 270
        ? { x: 1 - y - height, y: x, width: height, height: width }
        : { x, y, width, height }

  return clampVisualAnchor({
    ...page,
    ...unrotated,
    coordinateSpace: "normalized-pdf",
  })
}

export function visualIntersectionRatio(left: OADocumentVisualAnchor, right: OADocumentVisualAnchor) {
  if (left.page !== right.page) return 0
  const intersectionWidth = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x))
  const intersectionHeight = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y))
  const intersectionArea = intersectionWidth * intersectionHeight
  const unionArea = left.width * left.height + right.width * right.height - intersectionArea
  return unionArea > 0 ? intersectionArea / unionArea : 0
}

export function rankBindingCandidates(region: OADocumentVisualAnchor, candidates: OADocumentBindingCandidate[]) {
  return candidates
    .filter((candidate) => candidate.visual.page === region.page)
    .map((candidate) => ({ candidate, overlap: visualIntersectionRatio(region, candidate.visual) }))
    .sort((left, right) => right.overlap - left.overlap || left.candidate.id.localeCompare(right.candidate.id, "en-US"))
    .map(({ candidate }) => candidate)
}
