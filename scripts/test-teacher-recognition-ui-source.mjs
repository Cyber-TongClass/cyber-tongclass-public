import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const root = new URL("../", import.meta.url)
const read = (path) => readFile(new URL(path, root), "utf8")

test("teacher recognition API hooks always attach the signed-in session", async () => {
  const source = await read("src/lib/api.ts")
  assert.match(source, /teacherRecognitions:getAccess/)
  assert.match(source, /teacherRecognitions:listMine/)
  assert.match(source, /teacherRecognitions:listReviewQueue/)
  assert.match(source, /teacherRecognitions:listForManagement/)
  assert.match(source, /teacherRecognitions:updateNeedsChanges/)
  assert.match(source, /function useTeacherRecognitionMutation[\s\S]*getTongClassStoredSessionToken/)
})

test("permission management only configures reviewer groups", async () => {
  const source = await read("src/components/teacher-recognition/teacher-recognition-permission-panel.tsx")
  assert.match(source, /这里只配置审核用户组/)
  assert.match(source, /reviewerUserGroupIds/)
  assert.doesNotMatch(source, /canApply|申请权限|applicantUserGroupIds/)
})

test("teacher workspace requires proof and links to dedicated review surfaces", async () => {
  const source = await read("src/components/teacher-recognition/teacher-recognition-workspace.tsx")
  assert.match(source, /请至少上传一份证明材料/)
  assert.match(source, /重新提交审核/)
  assert.match(source, /teacher-recognitions\/review/)
  assert.match(source, /teacher-recognitions\/manage/)
  assert.match(source, /仅对教师账户开放/)
})

test("review desk exposes any-one decisions and management filters", async () => {
  const review = await read("src/components/teacher-recognition/teacher-recognition-review.tsx")
  const manage = await read("src/components/teacher-recognition/teacher-recognition-management.tsx")
  assert.match(review, /action\("approve"\)/)
  assert.match(review, /action\("request_changes"\)/)
  assert.match(review, /任一审核人完成处理后/)
  for (const field of ["year", "teacherQuery", "categoryId", "status"]) assert.match(manage, new RegExp(field))
})
