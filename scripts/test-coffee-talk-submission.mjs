import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const submissionUrl = pathToFileURL(
  path.resolve("convex/lib/coffeeTalkSubmission.ts"),
).href
const submission = await import(submissionUrl)

test("Coffee Talk normalizes a first-release application without optional notes", () => {
  const result = submission.normalizeCoffeeTalkSubmission({
    applicantName: "  王同学  ",
    affiliation: "  北京大学计算机学院 ",
    identity: "graduate",
    email: " WANG@PKU.EDU.CN ",
    teacherSlug: "  demo-teacher-li ",
    topic: "  多智能体协作  ",
    availability: "  周二下午或周四上午 ",
    notes: "   ",
  })

  assert.deepEqual(result, {
    applicantName: "王同学",
    affiliation: "北京大学计算机学院",
    identity: "graduate",
    email: "wang@pku.edu.cn",
    teacherSlug: "demo-teacher-li",
    topic: "多智能体协作",
    availability: "周二下午或周四上午",
  })
})

test("Coffee Talk rejects invalid applicant content before persistence", () => {
  const valid = {
    applicantName: "王同学",
    affiliation: "北京大学",
    identity: "undergraduate",
    email: "student@example.edu",
    teacherSlug: "teacher-a",
    topic: "研究交流",
    availability: "下周",
  }

  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, email: "not-an-email" }),
    /COFFEE_TALK_EMAIL_INVALID/,
  )
  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, identity: "teacher" }),
    /COFFEE_TALK_IDENTITY_INVALID/,
  )
  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, teacherSlug: "not a slug" }),
    /COFFEE_TALK_TEACHER_INVALID/,
  )
  assert.throws(
    () => submission.normalizeCoffeeTalkSubmission({ ...valid, topic: "" }),
    /COFFEE_TALK_REQUIRED_FIELD/,
  )
})
