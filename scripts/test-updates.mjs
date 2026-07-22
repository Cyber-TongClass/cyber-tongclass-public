import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")

function loadTypeScriptModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  const source = fs.readFileSync(absolutePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  }).outputText

  const loadedModule = { exports: {} }
  vm.runInNewContext(compiled, {
    exports: loadedModule.exports,
    module: loadedModule,
    require,
  }, { filename: absolutePath })
  return loadedModule.exports
}

const { DEFAULT_AUDIENCES, filterUpdates, getAvailableTags, mergeUpdates, normalizeTags } = loadTypeScriptModule("src/lib/updates.ts")
const plain = (value) => JSON.parse(JSON.stringify(value))

test("normalizes custom tags by trimming blanks and duplicate values", () => {
  assert.deepEqual(plain(normalizeTags(["  讲座 ", "", "会议", "讲座", "  "])), ["讲座", "会议"])
})

test("merges news and events in reverse chronological order", () => {
  const items = mergeUpdates(
    [{ _id: "news-1", title: "新闻", content: "摘要", category: "通知", publishedAt: 1_000, isPublished: true }],
    [{ _id: "event-1", title: "活动", date: "2026-07-23", description: "活动简介", color: "#0F4C81" }],
  )

  assert.deepEqual(plain(items.map((item) => ({ id: item.id, type: item.type }))), [
    { id: "event-1", type: "event" },
    { id: "news-1", type: "news" },
  ])
})

test("filters by any selected audience and any selected category while combining groups", () => {
  const items = [
    { id: "news-1", audiences: ["undergraduate"], tags: ["讲座"] },
    { id: "event-1", audiences: ["graduate", "teacher"], tags: ["会议"] },
  ]

  assert.deepEqual(
    plain(filterUpdates(items, { audiences: ["undergraduate", "teacher"], tags: ["会议"] }).map((item) => item.id)),
    ["event-1"],
  )
})

test("keeps legacy records visible in all filters without fabricating tags", () => {
  const [item] = mergeUpdates(
    [{ _id: "legacy-news", title: "旧新闻", content: "", category: "通知", publishedAt: 1, isPublished: true }],
    [],
  )

  assert.deepEqual(plain({ id: item.id, audiences: item.audiences, tags: item.tags }), {
    id: "legacy-news",
    audiences: [],
    tags: [],
  })
  assert.deepEqual(plain(filterUpdates([item], { audiences: [], tags: [] }).map((entry) => entry.id)), ["legacy-news"])
  assert.deepEqual(plain(filterUpdates([item], { audiences: ["undergraduate"], tags: [] })), [])
})

test("lists every available custom tag once in display order", () => {
  assert.deepEqual(
    plain(getAvailableTags([
      { id: "one", tags: ["讲座", "会议"] },
      { id: "two", tags: ["会议", "招募"] },
    ])),
    ["会议", "讲座", "招募"],
  )
})

test("defines the all-visible audience default", () => {
  assert.deepEqual(plain(DEFAULT_AUDIENCES), ["undergraduate", "graduate", "teacher"])
})

test("persists optional audiences and tags for both shared content collections", () => {
  const schema = fs.readFileSync(path.join(projectRoot, "convex/schema.ts"), "utf8")
  const newsSource = fs.readFileSync(path.join(projectRoot, "convex/news.ts"), "utf8")
  const eventsSource = fs.readFileSync(path.join(projectRoot, "convex/events.ts"), "utf8")

  assert.match(schema, /news: defineTable\([\s\S]*?audiences: v\.optional\(v\.array\(audienceValidator\)\)[\s\S]*?tags: v\.optional\(v\.array\(v\.string\(\)\)\)/)
  assert.match(schema, /events: defineTable\([\s\S]*?audiences: v\.optional\(v\.array\(audienceValidator\)\)[\s\S]*?tags: v\.optional\(v\.array\(v\.string\(\)\)\)/)

  for (const source of [newsSource, eventsSource]) {
    assert.match(source, /audiences: v\.optional\(v\.array\(audienceValidator\)\)/)
    assert.match(source, /tags: v\.optional\(v\.array\(v\.string\(\)\)\)/)
    assert.match(source, /normalizeTags\(args\.tags\)/)
  }
})

test("provides an idempotent manual audience migration without changing tags", () => {
  const migrationSource = fs.readFileSync(path.join(projectRoot, "convex/updateMigrations.ts"), "utf8")
  const scriptSource = fs.readFileSync(path.join(projectRoot, "scripts/migrate-default-update-audiences.mjs"), "utf8")

  assert.match(migrationSource, /filter\(\(document\) => !document\.audiences\?\.length\)/)
  assert.match(migrationSource, /const DEFAULT_AUDIENCES = \["undergraduate", "graduate", "teacher"\]/)
  assert.doesNotMatch(migrationSource, /patch\([^\n]+\{[^}]*tags:/)
  assert.match(scriptSource, /CONFIRM_UPDATE_AUDIENCE_MIGRATION/)
  assert.match(scriptSource, /updateMigrations:backfillDefaultAudiences/)
})

test("accepts the existing academic exchange updatedAt field during schema deployment", () => {
  const schema = fs.readFileSync(path.join(projectRoot, "convex/schema.ts"), "utf8")
  assert.match(
    schema,
    /academicExchangeSupportApplications: defineTable\([\s\S]*?createdAt: v\.number\(\),\s*updatedAt: v\.optional\(v\.number\(\)\)/,
  )
})

test("uses one controlled editor for content audiences and custom tags", () => {
  const editor = fs.readFileSync(path.join(projectRoot, "src/components/content-tags-editor.tsx"), "utf8")
  const newsForm = fs.readFileSync(path.join(projectRoot, "src/app/admin/news/[id]/page.tsx"), "utf8")
  const eventForm = fs.readFileSync(path.join(projectRoot, "src/app/admin/events/[id]/page.tsx"), "utf8")

  for (const marker of ["audiences", "tags", "AUDIENCE_OPTIONS", "添加分类"]) {
    assert.ok(editor.includes(marker), `Missing editor marker: ${marker}`)
  }

  for (const source of [newsForm, eventForm]) {
    assert.ok(source.includes("ContentTagsEditor"), "Admin form must render the shared tag editor")
    assert.match(source, /audiences: formData\.audiences/)
    assert.match(source, /tags: formData\.tags/)
  }
})
