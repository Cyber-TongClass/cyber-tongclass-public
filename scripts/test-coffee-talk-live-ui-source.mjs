import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const source = (path) => {
  assert.ok(existsSync(path), `Expected ${path} to exist`)
  return readFileSync(path, "utf8")
}

test("Coffee Talk live UI uses canonical API hooks rather than preview-only form state", () => {
  const api = source("src/lib/api.ts")
  const applyClient = source("src/components/coffee-talk/coffee-talk-apply-client.tsx")
  const myClient = source("src/components/coffee-talk/coffee-talk-my-client.tsx")
  const applicationList = source("src/components/coffee-talk/coffee-talk-application-list.tsx")
  const entryList = source("src/components/coffee-talk/coffee-talk-entry-list.tsx")
  const applyPage = source("src/app/services/coffee-talk/apply/page.tsx")
  const myPage = source("src/app/services/coffee-talk/my/page.tsx")

  for (const hook of [
    "usePublicInstitutePeople",
    "useSubmitCoffeeTalkApplication",
    "useMyCoffeeTalkApplications",
    "useTeacherCoffeeTalkApplications",
    "useActOnCoffeeTalkApplication",
    "useCoffeeTalkNotifications",
  ]) {
    assert.match(api, new RegExp(`export function ${hook}\\s*\\(`))
  }

  assert.match(api, /coffeeTalk:submitApplication/)
  assert.match(api, /coffeeTalk:listMine/)
  assert.match(api, /coffeeTalk:listForTeacher/)
  assert.match(api, /coffeeTalk:actOnApplication/)
  assert.match(api, /coffeeTalk:listNotifications/)

  assert.match(applyClient, /usePublicInstitutePeople/)
  assert.match(applyClient, /useSubmitCoffeeTalkApplication/)
  assert.match(applyClient, /teacherSlug/)
  assert.doesNotMatch(applyClient, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.doesNotMatch(applyClient, /backendAvailable=\{false\}/)

  assert.match(myClient, /useMyCoffeeTalkApplications/)
  assert.match(myClient, /useActOnCoffeeTalkApplication/)
  assert.match(myClient, /CoffeeTalkApplicationList/)
  assert.doesNotMatch(myClient, /from\s+["'][^"']*convex[^"']*["']/i)
  assert.match(applicationList, /expectedVersion\??:\s*number/)

  assert.match(applyPage, /CoffeeTalkApplyClient/)
  assert.doesNotMatch(applyPage, /demoTeachers/)
  assert.match(myPage, /CoffeeTalkMyClient/)
  assert.doesNotMatch(myPage, /CoffeeTalkBackendUnavailableState/)
  // 教师处理台入口由 CoffeeTalkEntryList 按教师身份渲染。
  assert.match(entryList, /href="\/services\/coffee-talk\/manage"/)
})
