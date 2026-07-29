import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  return readFileSync(path, "utf8")
}

test("AIA research page consumes only the safe public research projection", () => {
  const research = source("src/app/research/page.tsx")

  assert.match(research, /^"use client"/)
  assert.match(research, /usePublicInstituteResearch\(\{\s*limit\s*\}\)/)
  assert.match(research, /加载更多研究成果/)
  assert.match(research, /<PublicationArchive/)
  assert.match(research, /<AudienceTabs/)
  assert.match(research, /buildAudienceCollections/)
  assert.match(research, /research\s*===\s*undefined\s*\?\s*undefined/)
  assert.doesNotMatch(research, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.doesNotMatch(research, /demoResearch|demoPeople|accountUserId|studentId|email/i)
})

test("AIA updates page consumes only the safe public update projection", () => {
  const updates = source("src/app/updates/page.tsx")

  assert.match(updates, /^"use client"/)
  assert.match(updates, /usePublicInstituteUpdates\(\{\s*limit\s*\}\)/)
  assert.match(updates, /加载更多动态/)
  assert.match(updates, /<NewsTimeline/)
  assert.match(updates, /<AudienceTabs/)
  assert.match(updates, /buildAudienceCollections/)
  assert.match(updates, /updates\s*===\s*undefined\s*\?\s*undefined/)
  assert.doesNotMatch(updates, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.doesNotMatch(updates, /demoResearch|demoPeople|accountUserId|studentId|email/i)
})

test("the shared publication archive owns research loading and empty states", () => {
  const archive = source("src/components/content/publication-archive.tsx")

  assert.match(archive, /items\s*===\s*undefined/)
  assert.match(archive, /filteredPublications\.length\s*===\s*0/)
  assert.match(archive, /正在加载学术成果/)
  assert.match(archive, /未找到相关成果/)
})

test("the shared news timeline owns update loading and empty states", () => {
  const timeline = source("src/components/content/news-timeline.tsx")

  assert.match(timeline, /items\s*===\s*undefined/)
  assert.match(timeline, /filteredNews\.length\s*===\s*0/)
  assert.match(timeline, /加载中/)
  assert.match(timeline, /未找到匹配新闻/)
})
