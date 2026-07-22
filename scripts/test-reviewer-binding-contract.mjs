import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

const moduleUrl = pathToFileURL(path.resolve("convex/lib/reviewer-binding.ts")).href
const binding = await import(moduleUrl)

const validRequest = {
  mainUserId: "users:teacher-1",
  mainIdentityType: "teacher",
  mainAccountActive: true,
  reviewerAccountId: "reviewerAccounts:reviewer-1",
  reviewerAccountEnabled: true,
  explicitBinding: {
    mainUserId: "users:teacher-1",
    reviewerAccountId: "reviewerAccounts:reviewer-1",
    teacherDerivedEnabled: true,
    linkMethod: "super_admin",
  },
}

test("only approved explicit binding methods can establish a teacher reviewer capability", () => {
  assert.equal(binding.bindingMethodAllowed("super_admin"), true)
  assert.equal(binding.bindingMethodAllowed("dual_session"), true)
  assert.equal(binding.bindingMethodAllowed("email"), false)
  assert.equal(binding.bindingMethodAllowed("name"), false)
})

test("an active teacher with exact linked IDs receives only teacher-derived reviewer capability", () => {
  assert.deepEqual(binding.resolveTeacherReviewerCapability(validRequest), {
    allowed: true,
    reviewerAccountId: "reviewerAccounts:reviewer-1",
    source: "teacher_derived",
  })
})

test("absence, disablement, or an ID mismatch rejects teacher-derived reviewer access", () => {
  assert.deepEqual(binding.resolveTeacherReviewerCapability({
    ...validRequest,
    explicitBinding: null,
  }), {
    allowed: false,
    reason: "NO_EXPLICIT_BINDING",
  })

  assert.deepEqual(binding.resolveTeacherReviewerCapability({
    ...validRequest,
    explicitBinding: {
      ...validRequest.explicitBinding,
      teacherDerivedEnabled: false,
    },
  }), {
    allowed: false,
    reason: "BINDING_DISABLED",
  })

  assert.deepEqual(binding.resolveTeacherReviewerCapability({
    ...validRequest,
    explicitBinding: {
      ...validRequest.explicitBinding,
      linkMethod: "email",
    },
  }), {
    allowed: false,
    reason: "BINDING_METHOD_INVALID",
  })

  assert.deepEqual(binding.resolveTeacherReviewerCapability({
    ...validRequest,
    explicitBinding: {
      ...validRequest.explicitBinding,
      mainUserId: "users:teacher-2",
    },
  }), {
    allowed: false,
    reason: "MAIN_USER_MISMATCH",
  })

  assert.deepEqual(binding.resolveTeacherReviewerCapability({
    ...validRequest,
    explicitBinding: {
      ...validRequest.explicitBinding,
      reviewerAccountId: "reviewerAccounts:reviewer-2",
    },
  }), {
    allowed: false,
    reason: "REVIEWER_ACCOUNT_MISMATCH",
  })
})

test("matching display names or email addresses never substitute for an explicit ID binding", () => {
  const result = binding.resolveTeacherReviewerCapability({
    ...validRequest,
    explicitBinding: {
      ...validRequest.explicitBinding,
      mainUserId: "users:unrelated-user",
      mainEmail: "teacher@pku.edu.cn",
      reviewerEmail: "teacher@pku.edu.cn",
      mainDisplayName: "Same Person",
      reviewerDisplayName: "Same Person",
    },
  })

  assert.deepEqual(result, {
    allowed: false,
    reason: "MAIN_USER_MISMATCH",
  })
})
