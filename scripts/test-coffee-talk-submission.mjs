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
    purpose: "  讨论研究计划 ",
    researchBackground: "  已完成相关课程 ",
    expectedOutcome: "  获得方向建议 ",
    preferredFormat: "online",
    availability: "  周二下午或周四上午 ",
    consentToShareProfile: true,
    idempotencyKey: "request-123",
    notes: "   ",
  })

  assert.deepEqual(result, {
    teacherSlug: "demo-teacher-li",
    topic: "多智能体协作",
    purpose: "讨论研究计划",
    researchBackground: "已完成相关课程",
    expectedOutcome: "获得方向建议",
    preferredFormat: "online",
    availability: "周二下午或周四上午",
    consentToShareProfile: true,
    idempotencyKey: "request-123",
  })
})

test("Coffee Talk rejects invalid editable application content before persistence", () => {
  const valid = {
    teacherSlug: "teacher-a",
    topic: "研究交流",
    purpose: "讨论研究计划",
    researchBackground: "相关背景",
    expectedOutcome: "获得建议",
    preferredFormat: "either",
    availability: "下周",
    consentToShareProfile: true,
    idempotencyKey: "request-456",
  }

  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, teacherSlug: "not a slug" }),
    /COFFEE_TALK_TEACHER_INVALID/,
  )
  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, topic: "" }),
    /COFFEE_TALK_REQUIRED_FIELD/,
  )
  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, consentToShareProfile: false }),
    /COFFEE_TALK_CONSENT_REQUIRED/,
  )
})
