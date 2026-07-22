import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("simpleLogin accepts a generic account identifier while retaining legacy studentId callers", () => {
  const source = readFileSync("convex/users.ts", "utf8")

  assert.match(source, /identifier:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(source, /studentId:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(source, /const\s+identifier\s*=\s*normalizeStudentId\(args\.identifier\s*\?\?\s*args\.studentId\s*\?\?\s*["']{2}\)/)
  assert.match(source, /withIndex\(["']by_studentId["'],\s*\(q\)\s*=>\s*q\.eq\(["']studentId["'],\s*identifier\)\)/)
  assert.match(source, /const\s+username\s*=\s*normalizeUsername\(identifier\)/)
  assert.match(source, /q\.eq\(q\.field\(["']username["']\),\s*username\)/)
  assert.match(source, /throw new Error\(["']账号或密码错误["']\)/)
  assert.doesNotMatch(source, /throw new Error\(["'](?:学号|密码)或密码错误["']\)/)
})

test("AIA login submits the generic identifier and presents institute-wide account guidance", () => {
  const hookSource = readFileSync("src/lib/hooks/use-auth.ts", "utf8")
  const pageSource = readFileSync("src/app/login/page.tsx", "utf8")

  assert.match(hookSource, /loginMutation\(\{\s*identifier:\s*identifier\.trim\(\),\s*password:\s*password\s*\}\)/)
  assert.doesNotMatch(hookSource, /loginMutation\(\{\s*studentId:/)
  assert.match(pageSource, /账号（学号\s*\/\s*用户名\s*\/\s*工号）/)
  assert.match(pageSource, /请输入学号、用户名或工号/)
  assert.match(pageSource, /账号或密码错误，请重试/)
})
