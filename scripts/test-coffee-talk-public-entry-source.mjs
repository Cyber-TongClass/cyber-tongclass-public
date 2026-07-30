import assert from "node:assert/strict"
import fs from "node:fs"

const entryList = fs.readFileSync(
  "src/components/coffee-talk/coffee-talk-entry-list.tsx",
  "utf8"
)

assert.match(entryList, /const\s+\{\s*currentUser,\s*isLoading\s*\}\s*=\s*useAuth\(\)/)
assert.match(
  entryList,
  /const\s+showApplicantEntries\s*=\s*!currentUser\s*\|\|\s*isEligibleApplicant/
)
assert.match(entryList, /if\s*\(isLoading\)/)
assert.match(entryList, /正在确认可用入口/)
assert.match(entryList, /showApplicantEntries\s*\?\s*<AiaIndexRow/)
assert.match(entryList, /href="\/services\/coffee-talk\/apply"/)
assert.match(entryList, /href="\/services\/coffee-talk\/my"/)
assert.match(entryList, /当前账户暂无可办理的 Coffee Talk 事项/)
assert.match(entryList, /isTeacher\s*\?\s*\(/)

console.log("Coffee Talk public entry visibility contract passed")
