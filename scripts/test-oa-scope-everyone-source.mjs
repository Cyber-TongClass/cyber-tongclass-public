import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("visibility pickers expose an explicit everyone shortcut", () => {
  const picker = read("src/components/oa/oa-scope-picker.tsx")

  assert.match(picker, /includeEveryoneOption\?: boolean/)
  assert.match(picker, /label: "所有人"/)
  assert.match(picker, /kind: "all"/)
  assert.match(picker, /identityTypes: \[\.\.\.allIdentityTypes\]/)
  assert.match(picker, /apply\(\{\}\)/)

  for (const path of [
    "src/app/forms/manage/form-editor.tsx",
    "src/app/forms/manage/reimbursements/new/page.tsx",
    "src/components/class-work/content-submission-editor.tsx",
  ]) {
    assert.match(read(path), /<OaScopePicker[\s\S]*includeEveryoneOption/)
  }
})

test("permission and approval selectors do not implicitly offer everyone", () => {
  assert.doesNotMatch(
    read("src/components/permissions/permission-subject-picker.tsx"),
    /includeEveryoneOption/,
  )
  assert.doesNotMatch(
    read("src/components/oa/oa-workflow-editor.tsx"),
    /includeEveryoneOption/,
  )
})
