import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "aia-content-audience-"))

function loadBundledModule(relativePath, outputName) {
  const sourcePath = path.join(projectRoot, relativePath)
  assert.ok(fs.existsSync(sourcePath), `Expected ${relativePath} to exist`)

  const bundlePath = path.join(temporaryDirectory, outputName)
  execFileSync(path.join(projectRoot, "node_modules", ".bin", "esbuild"), [
    sourcePath,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--target=node24",
    `--outfile=${bundlePath}`,
  ], {
    cwd: projectRoot,
    stdio: "pipe",
  })

  return require(bundlePath)
}

let audienceModule
function getAudienceModule() {
  audienceModule ??= loadBundledModule("src/lib/content-audience.ts", "content-audience.cjs")
  return audienceModule
}

let tabsModule
function getTabsModule() {
  tabsModule ??= loadBundledModule("src/components/content/audience-tabs.tsx", "audience-tabs.cjs")
  return tabsModule
}

test.after(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true })
})

test("audience collections deduplicate content IDs before deriving tabs and counts", () => {
  const { buildAudienceCollections } = getAudienceModule()
  const undergraduate = { id: "undergrad", audiences: ["undergrad"], title: "Undergrad" }
  const graduate = { id: "graduate", audiences: ["graduate"], title: "Graduate" }
  const mixed = { id: "mixed", audiences: ["undergrad", "graduate"], title: "Mixed" }
  const teacherOnly = { id: "teacher", audiences: [], title: "Teacher" }

  const result = buildAudienceCollections([
    undergraduate,
    graduate,
    mixed,
    teacherOnly,
    { ...mixed, title: "Duplicate mixed row" },
    { ...undergraduate, title: "Duplicate undergraduate row" },
  ])

  assert.deepEqual(result.all.map(({ id }) => id), ["undergrad", "graduate", "mixed", "teacher"])
  assert.deepEqual(result.undergrad.map(({ id }) => id), ["undergrad", "mixed"])
  assert.deepEqual(result.graduate.map(({ id }) => id), ["graduate", "mixed"])
  assert.deepEqual(result.counts, { all: 4, undergrad: 2, graduate: 2 })
  assert.equal(result.all[2], mixed, "deduplication should preserve the first row for an ID")
})

test("unclassified content remains in All without entering a student audience", () => {
  const { buildAudienceCollections } = getAudienceModule()
  const unclassified = { id: "unclassified", audiences: [], title: "Unclassified" }

  const result = buildAudienceCollections([unclassified])

  assert.deepEqual(result.all, [unclassified])
  assert.deepEqual(result.undergrad, [])
  assert.deepEqual(result.graduate, [])
  assert.deepEqual(result.counts, { all: 1, undergrad: 0, graduate: 0 })
})

test("audience tabs render exact accessible labels, unique counts, and pressed state", () => {
  const React = require("react")
  const { AudienceTabs } = getTabsModule()
  const markup = renderToStaticMarkup(React.createElement(AudienceTabs, {
    value: "graduate",
    onChange() {},
    counts: { all: 4, undergrad: 2, graduate: 2 },
  }))

  assert.equal((markup.match(/<button/g) ?? []).length, 3)
  assert.match(markup, /aria-label="全部"[^>]*aria-pressed="false"/)
  assert.match(markup, /aria-label="本科生"[^>]*aria-pressed="false"/)
  assert.match(markup, /aria-label="研究生"[^>]*aria-pressed="true"/)
  assert.match(markup, />全部<\/span><span[^>]*>4<\/span>/)
  assert.match(markup, />本科生<\/span><span[^>]*>2<\/span>/)
  assert.match(markup, />研究生<\/span><span[^>]*>2<\/span>/)
})

test("audience tabs are controlled buttons that report the selected filter", () => {
  const { AudienceTabs } = getTabsModule()
  const changes = []
  const rendered = AudienceTabs({
    value: "all",
    onChange(value) {
      changes.push(value)
    },
    counts: { all: 3, undergrad: 1, graduate: 2 },
  })
  const buttons = rendered.props.children

  assert.deepEqual(buttons.map((button) => button.props["aria-pressed"]), [true, false, false])
  assert.ok(buttons.every((button) => button.props.type === "button"), "native buttons must stay keyboard-focusable")
  buttons[1].props.onClick()
  buttons[2].props.onClick()
  assert.deepEqual(changes, ["undergrad", "graduate"])
})

test("audience tabs remain presentation-only and perform no data fetching", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "src/components/content/audience-tabs.tsx"),
    "utf8"
  )

  assert.doesNotMatch(source, /useQuery|useMutation|fetch\s*\(/)
})
