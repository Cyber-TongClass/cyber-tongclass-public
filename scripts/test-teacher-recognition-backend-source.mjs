import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const backendPath = "convex/teacherRecognitions.ts"

async function backendSource() {
  return await readFile(backendPath, "utf8")
}

test("teacher recognition backend exposes the complete settings and teacher workflow contract", async () => {
  const source = await backendSource()
  for (const endpoint of [
    "getConfiguration",
    "setReviewerGroups",
    "upsertCategory",
    "reorderCategories",
    "setCategoryStatus",
    "listCategories",
    "getAccess",
    "listMine",
    "getMine",
    "saveDraft",
    "removeDraft",
    "generateProofUploadUrl",
    "submitDraft",
    "updateNeedsChanges",
    "listReviewQueue",
    "getReviewDetail",
    "actOnReviewTask",
    "listForManagement",
    "getProofUrl",
    "listPublicForPerson",
  ]) {
    assert.match(source, new RegExp(`export const ${endpoint}\\s*=`), endpoint)
  }
})

test("every teacher write authenticates and applies the teacher identity gate", async () => {
  const source = await backendSource()
  for (const endpoint of [
    "saveDraft",
    "removeDraft",
    "generateProofUploadUrl",
    "submitDraft",
    "updateNeedsChanges",
  ]) {
    const start = source.indexOf(`export const ${endpoint}`)
    assert.notEqual(start, -1, endpoint)
    const next = source.indexOf("\nexport const ", start + 1)
    const body = source.slice(start, next === -1 ? source.length : next)
    assert.match(body, /requireTeacher\(ctx, args\.sessionToken\)/, endpoint)
  }
})

test("proof upload and download are purpose-bound and ACL protected", async () => {
  const source = await backendSource()
  assert.match(source, /purpose:\s*"teacher-recognition-proof"/)
  assert.match(source, /r2StorageIdMatches\([\s\S]*purpose:\s*"teacher-recognition-proof"/)
  assert.match(source, /canReadTeacherRecognitionProof/)
  assert.match(source, /证明材料不属于该申报/)
  assert.match(source, /getR2DownloadUrl/)
})

test("submission and review reuse OA workflow snapshots with idempotency", async () => {
  const source = await backendSource()
  assert.match(source, /withIndex\("by_submitter_idempotency"/)
  assert.match(source, /submissionRequestFingerprint/)
  assert.match(source, /startOAWorkflow/)
  assert.match(source, /resumeOAWorkflow/)
  assert.match(source, /advanceOAWorkflow/)
  assert.match(source, /actionIdempotencyKey/)
})

test("public profile projection is account-bound and approved-only", async () => {
  const source = await backendSource()
  const start = source.indexOf("export const listPublicForPerson")
  assert.notEqual(start, -1)
  const body = source.slice(start)
  assert.match(body, /withIndex\("by_slug"/)
  assert.match(body, /person\.accountUserId/)
  assert.match(body, /row\.reviewStatus === "approved"/)
  assert.match(body, /toPublicTeacherRecognition/)
  assert.doesNotMatch(body, /getProofUrl|adminNote|explanation/)
})
