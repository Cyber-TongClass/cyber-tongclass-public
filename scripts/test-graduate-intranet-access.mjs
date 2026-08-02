import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("the graduate intranet admits graduate accounts without Tong Class membership", async () => {
  assert.equal(existsSync("src/lib/member-area-access.ts"), true)
  const { canAccessMemberArea } = await import("../src/lib/member-area-access.ts")

  assert.equal(canAccessMemberArea(
    { role: "member", identityType: "graduate", isClassMember: false },
    ["graduate"],
  ), true)
  assert.equal(canAccessMemberArea(
    { role: "member", identityType: "teacher", isClassMember: false },
    ["graduate"],
  ), false)
})

test("only the intranet layout opts graduates into the shared member guard", () => {
  const intranetLayout = readFileSync("src/app/tong-class/intranet/layout.tsx", "utf8")
  const coursesLayout = readFileSync("src/app/tong-class/courses/layout.tsx", "utf8")

  assert.match(intranetLayout, /allowedIdentityTypes=\{\["graduate"\]\}/)
  assert.doesNotMatch(coursesLayout, /allowedIdentityTypes/)
})
