import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const out = path.join(mkdtempSync(path.join(tmpdir(), "oa-document-geometry-")), "geometry.cjs")
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/oa-document-geometry.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outfile=${out}`,
])
const geometry = createRequire(import.meta.url)(out)

const page = { page: 2, pageWidth: 600, pageHeight: 800, rotation: 0 }

function assertCoordinates(actual, expected) {
  for (const coordinate of ["x", "y", "width", "height"]) {
    assert.ok(Math.abs(actual[coordinate] - expected[coordinate]) < Number.EPSILON * 2, `${coordinate}: expected ${expected[coordinate]}, received ${actual[coordinate]}`)
  }
}

test("converts client rectangles into zoom-independent normalized coordinates", () => {
  const rectangle = { left: 160, top: 260, width: 300, height: 200 }
  const renderedPage = { left: 100, top: 200, width: 600, height: 800 }
  const atOneX = geometry.clientRectToVisualAnchor(page, rectangle, renderedPage)
  const atTwoX = geometry.clientRectToVisualAnchor(
    page,
    { left: 320, top: 520, width: 600, height: 400 },
    { left: 200, top: 400, width: 1200, height: 1600 },
  )
  assert.deepEqual(atOneX, atTwoX)
  assert.deepEqual(atOneX, {
    ...page,
    x: 0.1,
    y: 0.075,
    width: 0.5,
    height: 0.25,
    coordinateSpace: "normalized-pdf",
  })
})

test("maps every rendered page rotation back to top-left unrotated coordinates", () => {
  const rectangle = { left: 20, top: 40, width: 30, height: 20 }
  const renderedPage = { left: 0, top: 0, width: 100, height: 100 }
  const expected = new Map([
    [0, { x: 0.2, y: 0.4, width: 0.3, height: 0.2 }],
    [90, { x: 0.4, y: 0.5, width: 0.2, height: 0.3 }],
    [180, { x: 0.5, y: 0.4, width: 0.3, height: 0.2 }],
    [270, { x: 0.4, y: 0.2, width: 0.2, height: 0.3 }],
  ])
  for (const [rotation, coordinates] of expected) {
    const result = geometry.clientRectToVisualAnchor({ ...page, rotation }, rectangle, renderedPage)
    for (const coordinate of ["x", "y", "width", "height"]) {
      assert.ok(Math.abs(result[coordinate] - coordinates[coordinate]) < Number.EPSILON * 2)
    }
  }
})

test("clamps rectangles to the page with a minimum normalized size", () => {
  assert.deepEqual(
    geometry.clampVisualAnchor({
      ...page,
      x: -0.2,
      y: 0.999,
      width: 1.4,
      height: 0,
      coordinateSpace: "normalized-pdf",
    }),
    {
      ...page,
      x: 0,
      y: 0.995,
      width: 1,
      height: 0.005,
      coordinateSpace: "normalized-pdf",
    },
  )
})

test("resizes each edge while keeping the opposite edge fixed", () => {
  const anchor = { ...page, x: 0.2, y: 0.3, width: 0.4, height: 0.3, coordinateSpace: "normalized-pdf" }
  const expected = new Map([
    ["left", { x: 0.3, y: 0.3, width: 0.3, height: 0.3 }],
    ["right", { x: 0.2, y: 0.3, width: 0.5, height: 0.3 }],
    ["top", { x: 0.2, y: 0.5, width: 0.4, height: 0.1 }],
    ["bottom", { x: 0.2, y: 0.3, width: 0.4, height: 0.5 }],
  ])
  for (const [handle, coordinates] of expected) {
    const result = geometry.resizeVisualAnchor(anchor, handle, 0.1, 0.2)
    assertCoordinates(result, coordinates)
  }
})

test("resizes all four corners on both axes", () => {
  const anchor = { ...page, x: 0.2, y: 0.3, width: 0.4, height: 0.3, coordinateSpace: "normalized-pdf" }
  const expected = new Map([
    ["top-left", { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }],
    ["top-right", { x: 0.2, y: 0.1, width: 0.5, height: 0.5 }],
    ["bottom-left", { x: 0.1, y: 0.3, width: 0.5, height: 0.5 }],
    ["bottom-right", { x: 0.2, y: 0.3, width: 0.5, height: 0.5 }],
  ])
  for (const [handle, coordinates] of expected) {
    const result = geometry.resizeVisualAnchor(anchor, handle, handle.includes("left") ? -0.1 : 0.1, handle.includes("top") ? -0.2 : 0.2)
    assertCoordinates(result, coordinates)
  }
})

test("clips resize handles at page and minimum-size boundaries without moving the opposite edge", () => {
  const anchor = { ...page, x: 0.2, y: 0.3, width: 0.4, height: 0.3, coordinateSpace: "normalized-pdf" }
  const expected = new Map([
    ["left", { x: 0.595, y: 0.3, width: 0.005, height: 0.3 }],
    ["right", { x: 0.2, y: 0.3, width: 0.005, height: 0.3 }],
    ["top", { x: 0.2, y: 0.595, width: 0.4, height: 0.005 }],
    ["bottom", { x: 0.2, y: 0.3, width: 0.4, height: 0.005 }],
  ])
  for (const [handle, coordinates] of expected) {
    const result = geometry.resizeVisualAnchor(anchor, handle, handle === "left" ? 1 : -1, handle === "top" ? 1 : -1)
    assertCoordinates(result, coordinates)
  }

  const pageClipped = geometry.resizeVisualAnchor(anchor, "bottom-right", 2, 2)
  assertCoordinates(pageClipped, { x: 0.2, y: 0.3, width: 0.8, height: 0.7 })
})

test("rejects non-finite client geometry and non-positive rendered page dimensions", () => {
  const rectangle = { left: 10, top: 20, width: 30, height: 40 }
  const renderedPage = { left: 0, top: 0, width: 100, height: 100 }
  for (const property of ["page", "pageWidth", "pageHeight", "rotation"]) {
    assert.throws(
      () => geometry.clientRectToVisualAnchor({ ...page, [property]: Number.NaN }, rectangle, renderedPage),
      /有限数值/,
    )
  }
  for (const property of ["left", "top", "width", "height"]) {
    assert.throws(
      () => geometry.clientRectToVisualAnchor(page, { ...rectangle, [property]: Number.POSITIVE_INFINITY }, renderedPage),
      /有限数值/,
    )
    assert.throws(
      () => geometry.clientRectToVisualAnchor(page, rectangle, { ...renderedPage, [property]: Number.NEGATIVE_INFINITY }),
      /有限数值/,
    )
  }
  for (const property of ["width", "height"]) {
    assert.throws(
      () => geometry.clientRectToVisualAnchor(page, rectangle, { ...renderedPage, [property]: 0 }),
      /渲染页面尺寸/,
    )
    assert.throws(
      () => geometry.clientRectToVisualAnchor(page, rectangle, { ...renderedPage, [property]: -1 }),
      /渲染页面尺寸/,
    )
  }
})

test("computes same-page intersection and ranks deterministic candidate ties", () => {
  const region = { ...page, x: 0.1, y: 0.1, width: 0.4, height: 0.4, coordinateSpace: "normalized-pdf" }
  const half = { ...region, x: 0.3 }
  const otherPage = { ...region, page: 3 }
  assert.equal(geometry.visualIntersectionRatio(region, region), 1)
  assert.equal(geometry.visualIntersectionRatio(region, half), 1 / 3)
  assert.equal(geometry.visualIntersectionRatio(region, otherPage), 0)

  const candidate = (id, visual) => ({
    id,
    label: id,
    description: id,
    partName: "word/document.xml",
    path: `/document/body[1]/p[${id}]`,
    contextHash: `sha256:${id}`,
    writeTarget: "inline-run",
    visual,
  })
  const candidates = [candidate("z", half), candidate("b", region), candidate("a", region), candidate("other", otherPage)]
  assert.deepEqual(geometry.rankBindingCandidates(region, candidates).map(({ id }) => id), ["a", "b", "z"])
  assert.deepEqual(candidates.map(({ id }) => id), ["z", "b", "a", "other"])
})
