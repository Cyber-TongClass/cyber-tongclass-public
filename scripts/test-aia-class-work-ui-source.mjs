import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => {
  const path = resolve(root, file)
  assert.ok(existsSync(path), `Expected ${file} to exist`)
  return readFileSync(path, "utf8")
}

const editor = read("src/components/class-work/content-submission-editor.tsx")
assert.match(editor, /MarkdownSplitEditor/)
assert.match(editor, /OaScopePicker/)
assert.match(editor, /useSubmitContentForReview/)
assert.match(editor, /idempotencyKey:\s*crypto\.randomUUID\(\)/)
assert.match(editor, /router\.push\(`\/class-work\/\$\{category\}\/submissions\/\$\{submissionId\}`\)/)
for (const field of ["新闻正文", "活动日期", "活动地点", "可见范围"]) assert.match(editor, new RegExp(field))
assert.match(editor, /正在提交/)
assert.match(editor, /role=["']alert["']/)

const desk = read("src/components/class-work/content-review-desk.tsx")
assert.match(desk, /useContentReviewQueue/)
assert.match(desk, /useReviewContentSubmission/)
assert.match(desk, /submission\.myTaskId/)
assert.match(desk, /taskId:/)
assert.match(desk, /const canReview = isPending\s*&&/)
assert.match(desk, /该审核已由其他有权限人员处理，无需重复操作/)
assert.match(desk, /你当前没有处理这份提交的审核资格/)
assert.match(desk, /审核意见/)
assert.match(desk, /未通过时必须填写审核意见/)
assert.match(desk, /当前没有/)
assert.match(desk, /正在加载/)
assert.match(desk, /divide-y/)
assert.match(desk, /sm:/)

const detail = read("src/components/class-work/content-submission-detail.tsx")
assert.match(detail, /useMyContentPermissions/)
assert.match(detail, /useContentSubmissionDetail/)
assert.doesNotMatch(detail, /useMyContentSubmissions/)
assert.doesNotMatch(detail, /useContentReviewQueue/)
assert.match(detail, /MarkdownRenderer/)
assert.match(detail, /没有找到这份提交/)

const status = read("src/components/class-work/content-review-status.tsx")
assert.match(status, /任一审核人处理即可/)
assert.match(status, /submission\.tasks/)
assert.match(status, /reviewTasks/)
assert.match(status, /reviewComment/)
assert.match(status, /aia-mono/)
assert.match(status, /aia-serif/)
assert.doesNotMatch(`${editor}\n${desk}\n${detail}\n${status}`, /font-family|@font-face|font-\[['"]/)

for (const file of [
  "src/components/class-work/content-submission-editor.tsx",
  "src/components/class-work/content-review-desk.tsx",
  "src/components/class-work/content-submission-detail.tsx",
  "src/components/class-work/content-review-status.tsx",
]) {
  assert.doesNotMatch(read(file), /from\s+["'](?:convex|@\/lib\/convex)/)
}

console.log("AIA class-work UI source checks passed.")
