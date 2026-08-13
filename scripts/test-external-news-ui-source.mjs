import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")
const [api, permissions, guard, reviewer, operations, portal, cron] = await Promise.all([
  read("src/lib/api.ts"),
  read("src/components/permissions/platform-permissions-client.tsx"),
  read("src/components/class-work/class-work-access-guard.tsx"),
  read("src/components/class-work/external-news-draft-editor.tsx"),
  read("src/components/platform/external-news-sync-client.tsx"),
  read("src/components/portal/portal-client.tsx"),
  read("convex/crons.ts"),
])

assert.match(api, /externalNewsSync:listMyReviewQueue/)
assert.match(api, /externalNewsSync:getOperations/)
assert.match(permissions, /来源审阅权/)
assert.match(guard, /capability === "review"/)
assert.match(reviewer, /接受并进入发布审批/)
assert.match(reviewer, /useAdoptExternalNewsSnapshot/)
assert.match(operations, /观察模式/)
assert.match(operations, /所有具有新闻来源审阅权的账号/)
assert.doesNotMatch(operations, /type="(?:url|text)"[^>]*(?:source|selector)/i)
assert.match(portal, /\/class-work\/news\/review/)
assert.match(portal, /\/platform\/news-sync/)
assert.match(cron, /hours:\s*1/)
assert.doesNotMatch(cron, /deploy|--prod|silverfish/i)

console.log("external news UI source contracts: ok")
