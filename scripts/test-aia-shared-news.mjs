import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function source(path) {
  return readFileSync(path, "utf8")
}

test("the shared news timeline owns the complete archive interaction", () => {
  const path = "src/components/content/news-timeline.tsx"
  assert.equal(existsSync(path), true, "the shared NewsTimeline component must exist")

  const timeline = source(path)
  assert.match(timeline, /export\s+type\s+NewsTimelineItem/)
  assert.match(timeline, /items:\s*NewsTimelineItem\[\]\s*\|\s*undefined/)
  assert.match(timeline, /detailHref:\s*\(item:\s*NewsTimelineItem\)\s*=>\s*string/)
  assert.match(timeline, /audienceControl\?:\s*React\.ReactNode/)
  assert.match(timeline, /searchQuery/)
  assert.match(timeline, /selectedCategory/)
  assert.match(timeline, /清除筛选/)
  assert.match(timeline, /显示\s*\{filteredNews\.length\}\s*条新闻/)
  assert.match(timeline, /加载中/)
  assert.match(timeline, /未找到匹配新闻/)
  assert.match(timeline, /publishedAt/)
  assert.match(timeline, /groupedNews/)
  assert.match(timeline, /coverImageUrl/)
  assert.match(timeline, /getFullYear\(\)/)
  assert.match(timeline, /getMonth\(\)/)
  assert.doesNotMatch(timeline, /toISOString\(\)\.slice\(0,\s*7\)/)
  assert.match(timeline, /items\s*===\s*undefined\s*\?\s*["']正在加载新闻/)
  assert.match(timeline, /<Search[^>]*aria-hidden="true"/s)
  assert.match(timeline, /<Input[^>]*aria-label="搜索新闻标题"/s)
})

test("the shared timeline permits only HTTP sources as external links", () => {
  const timeline = source("src/components/content/news-timeline.tsx")

  assert.match(timeline, /from\s+["']@\/lib\/safe-external-url["']/)
  assert.match(timeline, /getSafeExternalUrl\(item\.sourceUrl\)/)
  assert.match(timeline, /detailHref\(item\)/)
  assert.match(timeline, /noopener noreferrer/)
})

test("Tong Class delegates its real 100-item news archive to NewsTimeline", () => {
  const page = source("src/app/tong-class/news/page.tsx")

  assert.match(page, /NewsTimeline/)
  assert.match(page, /useNews\(\{\s*limit:\s*100\s*\}\)/)
  assert.match(page, /id:\s*String\(item\._id\)/)
  assert.match(page, /新闻动态/)
  assert.match(page, /了解通班的最新动态、回顾通班精彩纷呈的活动。/)
  assert.match(page, /\/tong-class\/news\/\$\{item\.id\}/)
  assert.doesNotMatch(page, /AudienceTabs/)
  assert.doesNotMatch(page, /from\s+["'][^"']*convex[^"']*["']/i)
})

test("AIA updates composes deduplicated audience collections with NewsTimeline", () => {
  const page = source("src/app/updates/page.tsx")

  assert.match(page, /usePublicInstituteUpdates\(\{\s*limit:\s*100\s*\}\)/)
  assert.match(page, /buildAudienceCollections/)
  assert.match(page, /AudienceTabs/)
  assert.match(page, /selectedAudience/)
  assert.match(page, /collections\.counts/)
  assert.match(page, /NewsTimeline/)
  assert.match(page, /\/tong-class\/news\/\$\{item\.id\}/)
  assert.match(page, /更新与公告/)
  assert.match(page, /研究院的动态、公告和后续服务更新将在此集中呈现。/)
  assert.doesNotMatch(page, /from\s+["'][^"']*convex[^"']*["']/i)
})
