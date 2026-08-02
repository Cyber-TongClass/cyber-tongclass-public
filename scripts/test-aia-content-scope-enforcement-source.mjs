import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const [newsSource, eventsSource, instituteContentSource] = await Promise.all([
  readFile("convex/news.ts", "utf8"),
  readFile("convex/events.ts", "utf8"),
  readFile("convex/instituteContent.ts", "utf8"),
])

function exportedBlock(source, exportName, nextExportName) {
  const start = source.indexOf(`export const ${exportName}`)
  assert.notEqual(start, -1, `missing export ${exportName}`)
  const end = nextExportName
    ? source.indexOf(`export const ${nextExportName}`, start)
    : source.length
  return source.slice(start, end === -1 ? source.length : end)
}

test("news list, detail, and count resolve the viewer's server-side scope context", () => {
  assert.match(newsSource, /loadOAUserScopeContext/)
  assert.match(newsSource, /userMatchesOAUserScope/)

  const list = exportedBlock(newsSource, "list", "listAll")
  const detail = exportedBlock(newsSource, "getById", "create")
  const count = exportedBlock(newsSource, "count")

  for (const endpoint of [list, detail, count]) {
    assert.match(endpoint, /sessionToken:\s*v\.optional\(v\.string\(\)\)/)
    assert.match(endpoint, /loadNewsViewer\(ctx,\s*args\.sessionToken\)/)
  }
  assert.match(list, /filter\(\(news\)\s*=>\s*canViewNews\(news,\s*actor,\s*scopeContext\)\)/)
  assert.match(detail, /canViewNews\(news,\s*actor,\s*scopeContext\)/)
  assert.match(count, /filter\(\(news\)\s*=>\s*canViewNews\(news,\s*actor,\s*scopeContext\)\)\.length/)
})

test("anonymous news access is fail-closed for targeted records", () => {
  assert.match(
    newsSource,
    /if\s*\(news\.targetScope\)\s*\{[\s\S]*?if\s*\(!actor\s*\|\|\s*!scopeContext\)\s*return false[\s\S]*?userMatchesOAUserScope/,
  )
  assert.match(newsSource, /if\s*\(!sessionToken\)\s*return\s*\{\s*actor:\s*null,\s*scopeContext:\s*undefined\s*\}/)
})

test("events count uses the same scoped-view predicate and context as list and detail", () => {
  const count = exportedBlock(eventsSource, "count")
  assert.match(count, /sessionToken:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(count, /loadActorWithScopeContext\(ctx,\s*args\.sessionToken\)/)
  assert.match(count, /canViewEvent\(event,\s*actor,\s*scopeContext\)/)
  assert.doesNotMatch(count, /canViewEvent\(event,\s*actor\)\)/)
})

test("institute update list and detail enforce the same server-side target scope", () => {
  const list = exportedBlock(
    instituteContentSource,
    "listPublicInstituteUpdates",
    "getPublicInstituteResearchById",
  )
  const detail = exportedBlock(instituteContentSource, "getPublicInstituteUpdateById")

  for (const endpoint of [list, detail]) {
    assert.match(endpoint, /sessionToken:\s*v\.optional\(v\.string\(\)\)/)
    assert.match(endpoint, /loadUpdateViewer\(ctx,\s*args\.sessionToken\)/)
    assert.match(endpoint, /canViewScopedNews\(record,\s*actor,\s*scopeContext\)/)
  }
  assert.match(
    instituteContentSource,
    /if\s*\(!record\.targetScope\)\s*return true[\s\S]*?if\s*\(!actor\s*\|\|\s*!scopeContext\)\s*return false[\s\S]*?userMatchesOAUserScope/,
  )
})
