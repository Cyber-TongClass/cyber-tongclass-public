import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const submissionUrl = pathToFileURL(
  path.resolve("convex/lib/coffeeTalkSubmission.ts"),
).href
const submission = await import(submissionUrl)

test("Coffee Talk normalizes editable application content without optional notes", () => {
  const result = submission.normalizeCoffeeTalkSubmission({
    teacherSlug: "  demo-teacher-li ",
    topic: "  多智能体协作  ",
    availability: "  周二下午或周四上午 ",
    notes: "   ",
  })

  assert.deepEqual(result, {
    teacherSlug: "demo-teacher-li",
    topic: "多智能体协作",
    availability: "周二下午或周四上午",
  })
})

test("Coffee Talk rejects invalid editable application content before persistence", () => {
  const valid = {
    teacherSlug: "teacher-a",
    topic: "研究交流",
    availability: "下周",
  }

  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, teacherSlug: "not a slug" }),
    /COFFEE_TALK_TEACHER_INVALID/,
  )
  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, topic: "" }),
    /COFFEE_TALK_REQUIRED_FIELD/,
  )
})
