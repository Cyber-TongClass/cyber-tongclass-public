import assert from "node:assert/strict"
import fs from "node:fs"

const entryList = fs.readFileSync(
  "src/components/coffee-talk/coffee-talk-entry-list.tsx",
  "utf8"
)

assert.match(entryList, /const\s+\{\s*currentUser,\s*isLoading\s*\}\s*=\s*useAuth\(\)/)
assert.match(entryList, /if\s*\(isLoading\)/)
assert.match(entryList, /正在确认可用入口/)
assert.match(entryList, /href="\/services\/coffee-talk\/apply"/)
assert.match(entryList, /href="\/services\/coffee-talk\/my"/)
assert.match(entryList, /isTeacher\s*\?\s*\(/)
assert.doesNotMatch(entryList, /showApplicantEntries/)
assert.doesNotMatch(entryList, /当前账户暂无可办理的 Coffee Talk 事项/)

console.log("Coffee Talk public entry visibility contract passed")
