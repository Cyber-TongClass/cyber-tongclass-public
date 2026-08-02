import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(path, "utf8")

const simulation = read("src/components/oa/oa-workflow-simulation.tsx")
const desk = read("src/components/class-work/content-review-desk.tsx")
const editor = read("src/components/class-work/content-submission-editor.tsx")
const status = read("src/components/class-work/content-review-status.tsx")
const sources = `${simulation}\n${desk}\n${editor}\n${status}`

// A normal preview is a point-in-time workflow: exactly one node is current,
// nodes before it are complete, and nodes after it have not started.
assert.match(simulation, /const currentIndex = reviewIndex >= 0 \? reviewIndex : Math\.min\(1, nodeCount - 1\)/)
assert.match(simulation, /if \(index < currentIndex\) return "complete"/)
assert.match(simulation, /if \(index > currentIndex\) return "future"/)
assert.match(simulation, /return "active"/)

// Deferred/rejected previews stop at the review node and leave later nodes in
// the future rather than rendering every later node as active.
assert.match(simulation, /if \(index < reviewIndex\) return "complete"/)
assert.match(simulation, /if \(index > reviewIndex\) return "future"/)
assert.match(simulation, /scenario === "deferred".*"deferred"/s)
assert.match(simulation, /scenario === "rejected".*"rejected"/s)

// Interactive status filters expose their pressed state to assistive tech.
assert.match(simulation, /aria-pressed=\{scenario === option\.value\}/)
assert.match(desk, /aria-pressed=\{filter === value\}/)

// AIA pages use the existing editorial semantic palette and hairline rules;
// they do not introduce Tailwind traffic-light swatches or side stripes.
assert.doesNotMatch(sources, /(?:bg|text|border)-(?:amber|emerald|red)-\d+/)
assert.doesNotMatch(sources, /border-l-2/)
assert.match(simulation, /--aia-tag/)
assert.match(simulation, /--aia-red/)
assert.match(status, /--aia-tag/)
assert.match(status, /--aia-ink/)
assert.match(status, /--aia-red/)
assert.match(`${desk}\n${editor}\n${status}`, /border-y aia-border-rule/)

// Keep the approved typography contract intact.
assert.doesNotMatch(sources, /font-family|@font-face|font-\[['"]/)

console.log("AIA semantic status source checks passed.")
