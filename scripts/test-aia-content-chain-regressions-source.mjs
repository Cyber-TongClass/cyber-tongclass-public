import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const news = await readFile("convex/news.ts", "utf8")
const events = await readFile("convex/events.ts", "utf8")
const reviews = await readFile("convex/contentReview.ts", "utf8")
const institute = await readFile("convex/instituteContent.ts", "utf8")
const api = await readFile("src/lib/api.ts", "utf8")
const desk = await readFile("src/components/class-work/content-review-desk.tsx", "utf8")
const statusUi = await readFile("src/components/class-work/content-review-status.tsx", "utf8")

test("manager read endpoints require category canManage and return projected DTOs", () => {
  const newsList = news.slice(news.indexOf("export const listAll"), news.indexOf("export const getById"))
  assert.match(newsList, /requireContentManager\(ctx, actor, "news"\)/)
  assert.match(newsList, /map\(managerNewsDto\)/)
  assert.doesNotMatch(newsList, /requireContentAdmin/)

  const eventAdmin = events.slice(events.indexOf("export const adminList"), events.indexOf("\/\/ Create a new event"))
  assert.match(eventAdmin, /requireContentManager\(ctx, actor, "events"\)/)
  assert.match(eventAdmin, /map\(managerEventDto\)/)
  assert.match(eventAdmin, /managerEventDto\(event\)/)
  assert.doesNotMatch(eventAdmin, /requireContentAdmin/)
})

test("canonical news list and count include the current session", () => {
  const hooks = api.slice(api.indexOf("export function useNews("), api.indexOf("\/\/ ==================== 内网相关"))
  assert.match(hooks, /useNews[\s\S]*?useTongClassSessionToken\(\)[\s\S]*?api\.news\.list[\s\S]*?sessionToken/)
  assert.match(hooks, /useNewsCount[\s\S]*?useTongClassSessionToken\(\)[\s\S]*?api\.news\.count[\s\S]*?sessionToken/)
})

test("permission revocation retires pending tasks and preserves an audit marker", () => {
  assert.match(reviews, /async function retirePendingReviewTasks/)
  assert.match(reviews, /status:\s*"skipped"/)
  assert.match(reviews, /comment:\s*REVOKED_REVIEWER_AUDIT_COMMENT/)
  for (const endpoint of ["setPermission", "setPermissionsForScope", "removePermission"]) {
    const start = reviews.indexOf(`export const ${endpoint}`)
    const next = reviews.indexOf("export const ", start + 20)
    const source = reviews.slice(start, next === -1 ? undefined : next)
    assert.match(source, /retirePendingReviewTasks/)
  }
  assert.match(statusUi, /decision === "skipped" \? "流程已结束，无需处理"/)
})

test("institute update visibility is applied before the requested limit", () => {
  const bucket = institute.slice(institute.indexOf("async function readNewsBucket"), institute.indexOf("function isNonEmptyString"))
  assert.doesNotMatch(bucket, /\.take\(limit\)/)
  assert.match(bucket, /\.collect\(\)/)
})

test("class-work management desk exposes published edit and delete controls", () => {
  assert.match(desk, /PublishedContentManager/)
})
